import { readFile, unlink } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import type { CliArgs } from "../types"
import { isNetworkError, download } from "../shared"

const DEFAULT_MODEL = "veo3.1"
const POLL_INTERVAL_MS = 5000
const MAX_POLL_MS = 90 * 60 * 1000
const BACKOFF_MULTIPLIER = 1.5
const MAX_BACKOFF_MS = 60000

export function getDefaultModel(): string {
  return process.env.TUZI_VIDEO_MODEL || DEFAULT_MODEL
}

function getApiKey(): string | null {
  return process.env.TUZI_API_KEY || null
}

function getBaseUrl(): string {
  const base = process.env.TUZI_BASE_URL || "https://api.tu-zi.com"
  return base.replace(/\/+$/g, "").replace(/\/v1\/?$/, "")
}

type SubmitResponse = { id: string; status: string; error?: unknown }
type PollResponse = { id: string; status: string; progress?: number; video_url?: string; url?: string; error?: unknown }

function parseError(error: unknown): string {
  if (!error) return "未知错误"
  if (typeof error === "string") return error
  if (typeof error === "object" && error !== null) {
    const e = error as Record<string, unknown>
    if (typeof e.message === "string") return e.message
  }
  return String(error)
}

const MAX_REF_IMAGE_BYTES = 1024 * 1024 // 1MB

function mimeFromExt(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase()
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg"
  if (ext === ".webp") return "image/webp"
  if (ext === ".gif") return "image/gif"
  if (ext === ".bmp") return "image/bmp"
  return "image/png"
}

function extFromMime(mime: string): string {
  if (mime === "image/jpeg") return ".jpg"
  if (mime === "image/webp") return ".webp"
  if (mime === "image/gif") return ".gif"
  if (mime === "image/bmp") return ".bmp"
  return ".png"
}

/**
 * 使用 Bun.spawn 运行外部命令（统一风格，替代 node:child_process.spawn）
 */
function runCmd(cmd: string, args: string[]): Promise<{ code: number; stderr: string }> {
  try {
    const proc = Bun.spawn([cmd, ...args], { stdout: "pipe", stderr: "pipe" })
    return new Promise(async (res) => {
      const exitCode = await proc.exited
      const stderr = await new Response(proc.stderr).text()
      res({ code: exitCode ?? 1, stderr })
    })
  } catch (e) {
    return Promise.resolve({ code: 1, stderr: e instanceof Error ? e.message : String(e) })
  }
}

async function compressImage(filePath: string): Promise<{ bytes: Uint8Array; mime: string }> {
  const tmp = path.join(tmpdir(), `tuzi-ref-${Date.now()}.jpg`)
  try {
    if (process.platform === "darwin") {
      const { code } = await runCmd("sips", ["-s", "format", "jpeg", "-s", "formatOptions", "70", filePath, "--out", tmp])
      if (code === 0) {
        const compressed = await readFile(tmp)
        return { bytes: new Uint8Array(compressed), mime: "image/jpeg" }
      }
    }
    // Linux: ImageMagick convert
    const { code: imgCode } = await runCmd("convert", [filePath, "-quality", "70", tmp])
    if (imgCode === 0) {
      const compressed = await readFile(tmp)
      return { bytes: new Uint8Array(compressed), mime: "image/jpeg" }
    }
    // Windows: ffmpeg 作为图片转码备选
    if (process.platform === "win32") {
      const { code: ffCode } = await runCmd("ffmpeg", ["-y", "-i", filePath, "-q:v", "5", tmp])
      if (ffCode === 0) {
        const compressed = await readFile(tmp)
        return { bytes: new Uint8Array(compressed), mime: "image/jpeg" }
      }
    }
    const original = await readFile(filePath)
    return { bytes: new Uint8Array(original), mime: mimeFromExt(filePath) }
  } finally {
    await unlink(tmp).catch(() => {})
  }
}

async function readRefImage(filePath: string): Promise<{ blob: Blob; filename: string }> {
  const bytes = await readFile(filePath)
  const mime = mimeFromExt(filePath)

  if (bytes.length > MAX_REF_IMAGE_BYTES && (mime === "image/png" || mime === "image/jpeg" || mime === "image/webp" || mime === "image/bmp")) {
    const { bytes: compressed, mime: cMime } = await compressImage(filePath)
    if (compressed.length < bytes.length) {
      const ext = extFromMime(cMime)
      console.log(`参考图 ${path.basename(filePath)} 已压缩: ${bytes.length} → ${compressed.length} bytes`)
      return { blob: new Blob([compressed], { type: cMime }), filename: `reference${ext}` }
    }
  }

  const ext = extFromMime(mime)
  return { blob: new Blob([bytes], { type: mime }), filename: `reference${ext}` }
}

export async function generateVideo(
  prompt: string,
  model: string,
  args: CliArgs,
  _opts: { taskId?: string } = {}  // Tuzi 不支持 taskId 恢复，参数仅用于兼容
): Promise<Uint8Array> {
  const apiKey = getApiKey()
  if (!apiKey) throw new Error("TUZI_API_KEY 未配置。请前往 https://api.tu-zi.com/token 获取（视频教程：https://www.bilibili.com/video/BV1k4PqzPEKz/）")

  const baseURL = getBaseUrl()

  const form = new FormData()
  form.append("model", model)
  form.append("prompt", prompt)

  if (args.seconds != null) form.append("seconds", String(args.seconds))
  if (args.size) form.append("size", args.size)

  if (args.referenceImages.length > 0) {
    const mode = args.refMode || "reference"
    for (let i = 0; i < args.referenceImages.length; i++) {
      const { blob, filename } = await readRefImage(args.referenceImages[i]!)
      form.append("input_reference", blob, `${i + 1}-${filename}`)
    }
    form.append("ref_mode", mode)
  }

  console.log(`正在提交视频生成任务 (${model})...`)

  const submitRes = await fetch(`${baseURL}/v1/videos`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  })

  if (!submitRes.ok) {
    const err = await submitRes.text()
    throw new Error(`Tuzi API 提交错误 (${submitRes.status}): ${err}`)
  }

  const submitData = (await submitRes.json()) as SubmitResponse

  if (submitData.status === "failed") {
    throw new Error(parseError(submitData.error))
  }

  const taskId = submitData.id
  if (!taskId) throw new Error("Tuzi API 未返回任务 ID")

  console.log(`任务已提交 (id: ${taskId})，正在轮询结果...`)

  const startTime = Date.now()
  let backoff = POLL_INTERVAL_MS
  let lastLogTime = 0

  while (Date.now() - startTime < MAX_POLL_MS) {
    await new Promise((r) => setTimeout(r, backoff))

    let pollRes: Response
    try {
      pollRes = await fetch(`${baseURL}/v1/videos/${taskId}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      })
    } catch (e) {
      if (isNetworkError(e)) {
        backoff = Math.min(backoff * BACKOFF_MULTIPLIER, MAX_BACKOFF_MS)
        console.error(`网络错误，${Math.round(backoff / 1000)}s 后重试...`)
        continue
      }
      throw e
    }

    backoff = POLL_INTERVAL_MS

    if (!pollRes.ok) {
      const err = await pollRes.text()
      throw new Error(`Tuzi 轮询错误 (${pollRes.status}): ${err}`)
    }

    const status = (await pollRes.json()) as PollResponse
    const elapsed = Math.round((Date.now() - startTime) / 1000)

    // 每 15 秒输出一次进度日志
    if (elapsed - lastLogTime >= 15) {
      console.log(`轮询中... 状态=${status.status}, 进度=${status.progress ?? 0}, 已用时=${elapsed}s`)
      lastLogTime = elapsed
    }

    if (status.status === "completed") {
      const url = status.video_url || status.url
      if (!url) throw new Error("Tuzi API 未返回视频 URL")
      console.log("视频生成完成。")
      return download(url)
    }

    if (status.status === "failed") {
      throw new Error(parseError(status.error))
    }
  }

  throw new Error(`视频生成超时，已等待 ${MAX_POLL_MS / 1000 / 60} 分钟`)
}
