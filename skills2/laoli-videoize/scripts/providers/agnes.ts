import { readFile } from "node:fs/promises"
import path from "node:path"
import { spawn } from "node:child_process"
import { download } from "../shared"
import type { CliArgs } from "../types"

const SUPPORTED_SECONDS = [3, 4, 5, 8, 10, 15]
const DEFAULT_MODEL = "agnes-video-v2.0"
const MAX_POLL_MS = 90 * 60 * 1000 // 90 minutes
const POLL_INTERVAL_MS = 5000
const FRAME_RATE = 24

// Strip trailing /v1 or /
const BASE_URL = (process.env.AGNES_BASE_URL || "https://apihub.agnes-ai.com")
  .replace(/\/v1\/?$|\/+$/, "")

// Aspect ratio → video dimensions (longer side = 1152px)
const ASPECT_TO_VIDEO: Record<string, [number, number]> = {
  "16:9": [1152, 648],
  "9:16": [648, 1152],
  "1:1": [768, 768],
  "4:3": [1152, 864],
  "3:2": [1152, 768],
  "2:3": [768, 1152],
  "21:9": [1152, 494],
  "9:21": [494, 1152],
}

const ASPECT_RE = /^(\d+):(\d+)$/
const SIZE_RE = /^\d+x\d+$/

export function getDefaultModel(): string {
  return process.env.AGNES_VIDEO_MODEL || DEFAULT_MODEL
}

function getApiKey(): string | null {
  return process.env.AGNES_API_KEY || process.env.AGNES_API_TOKEN || process.env.APIHUB_AGNES_API_KEY || null
}

/**
 * Resolve aspect ratio string to (width, height).
 * Supports "16:9" format and "WxH" format.
 */
function resolveSize(size: string | null): [number, number] | null {
  if (!size) return null

  const arMatch = ASPECT_RE.exec(size)
  if (arMatch) {
    const resolved = ASPECT_TO_VIDEO[size]
    if (resolved) return resolved
    // For arbitrary ratios, calculate proportional dimensions
    const w = Math.round(parseFloat(arMatch[1]!))
    const h = Math.round(parseFloat(arMatch[2]!))
    const scale = 1152 / Math.max(w, h)
    return [Math.round(w * scale), Math.round(h * scale)]
  }

  if (SIZE_RE.test(size)) {
    const [w, h] = size.split("x").map(Number)
    return [w!, h!]
  }

  return null
}

/**
 * Calculate num_frames from target seconds.
 * Must satisfy 8n+1 and ≤ 441.
 */
function secondsToFrames(seconds: number): number {
  const target = seconds * FRAME_RATE
  const n = Math.max(10, Math.min(55, Math.round((target - 1) / 8)))
  return 8 * n + 1
}

/**
 * Upload a local image to CDN via picgo and return the public URL.
 */
function picgoUpload(filepath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn("picgo", ["upload", path.resolve(filepath)], { stdio: ["ignore", "pipe", "pipe"] })
    let stdout = ""
    let stderr = ""
    proc.stdout.on("data", (chunk) => { stdout += chunk.toString() })
    proc.stderr.on("data", (chunk) => { stderr += chunk.toString() })
    proc.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(
          `picgo 上传失败。请确认已全局安装: npm install -g picgo\n错误: ${stderr.slice(0, 200)}`
        ))
      } else {
        const url = stdout.trim()
        if (url && (url.startsWith("http://") || url.startsWith("https://"))) {
          resolve(url)
        } else {
          reject(new Error(`picgo 返回了无效的 URL: ${url}`))
        }
      }
    })
    proc.on("error", (err) => {
      reject(new Error(`picgo 未安装。请执行: npm install -g picgo\n错误: ${err.message}`))
    })
  })
}

/**
 * Resolve image sources: URLs pass through, local files are uploaded via picgo.
 */
async function resolveImageSources(sources: string[]): Promise<string[]> {
  const resolved: string[] = []
  for (const src of sources) {
    if (src.startsWith("http://") || src.startsWith("https://") || src.startsWith("data:")) {
      resolved.push(src)
    } else {
      console.error(`[Agnes] 正在上传参考图片: ${path.basename(src)}`)
      const url = await picgoUpload(src)
      console.error(`[Agnes] 图片已上传: ${url}`)
      resolved.push(url)
    }
  }
  return resolved
}

export async function generateVideo(
  prompt: string,
  model: string,
  args: CliArgs,
  opts?: { taskId?: string }
): Promise<{ data: Uint8Array; taskId: string }> {
  const apiKey = getApiKey()
  if (!apiKey) {
    throw new Error(
      "AGNES_API_KEY 未配置。请在 ~/.laoli-recipe/.env 或 .env 中设置 AGNES_API_KEY。\n" +
      "获取密钥: https://platform.agnes-ai.com"
    )
  }

  // Resolve dimensions
  const dims = resolveSize(args.size) || [648, 1152] // default 9:16
  const [width, height] = dims

  // Resolve frames
  const numFrames = args.seconds
    ? (() => {
        if (!SUPPORTED_SECONDS.includes(args.seconds!)) {
          console.error(`[Agnes] 警告: 不支持 ${args.seconds}s，支持的时长: ${SUPPORTED_SECONDS.join("/")}s，使用 5s`)
          return 121
        }
        return secondsToFrames(args.seconds)
      })()
    : 121 // ~5s default
  const actualSeconds = (numFrames / FRAME_RATE).toFixed(1)
  const frameRate = FRAME_RATE

  // If taskId is provided, skip submission and poll directly (for retry recovery)
  if (opts?.taskId) {
    console.error(`[Agnes] 恢复已有任务: ${opts.taskId}`)
    return pollVideoTask(opts.taskId, apiKey)
  }

  // Build request body
  const body: Record<string, unknown> = {
    model,
    prompt,
    width,
    height,
    num_frames: numFrames,
    frame_rate: frameRate,
  }

  // Handle reference images (image-to-video)
  if (args.referenceImages.length > 0) {
    const resolvedImages = await resolveImageSources(args.referenceImages)
    body.image = resolvedImages[0] // video API supports single image
  }

  console.error(`[Agnes] 提交视频任务 (${model}, ${width}x${height}, ${numFrames}frames @ ${frameRate}fps ≈ ${actualSeconds}s)...`)

  // Step 1: Submit task
  const submitRes = await fetch(`${BASE_URL}/v1/videos`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  })

  if (!submitRes.ok) {
    const err = await submitRes.text()
    throw new Error(`Agnes 视频提交错误 (${submitRes.status}): ${err}`)
  }

  const submitData = (await submitRes.json()) as {
    id?: string
    video_id?: string
    status?: string
  }

  const videoId = submitData.video_id || submitData.id
  if (!videoId) {
    throw new Error(`Agnes 未返回 video_id: ${JSON.stringify(submitData).slice(0, 200)}`)
  }

  console.error(`[Agnes] 任务已提交 (video_id: ${videoId})，正在轮询...`)

  // Step 2: Poll using video_id
  return pollVideoTask(videoId, apiKey)
}

async function pollVideoTask(videoId: string, apiKey: string): Promise<{ data: Uint8Array; taskId: string }> {
  const startTime = Date.now()
  let lastLogTime = 0

  while (Date.now() - startTime < MAX_POLL_MS) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS))

    const pollRes = await fetch(`${BASE_URL}/agnesapi?video_id=${videoId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })

    if (!pollRes.ok) {
      const err = await pollRes.text()
      throw new Error(`Agnes 轮询错误 (${pollRes.status}): ${err}`)
    }

    const status = (await pollRes.json()) as {
      status?: string
      progress?: number
      remixed_from_video_id?: string
      video_url?: string
      url?: string
      error?: unknown
    }

    const now = Date.now()
    if (now - lastLogTime >= 15000) {
      console.error(`[Agnes] 轮询中... 状态=${status.status}, 进度=${status.progress ?? 0}%`)
      lastLogTime = now
    }

    if (status.status === "completed") {
      // Extract video URL
      const videoUrl = status.remixed_from_video_id || status.video_url || status.url
      if (!videoUrl) {
        throw new Error(`Agnes 视频完成但未返回 URL: ${JSON.stringify(status).slice(0, 200)}`)
      }
      console.error("[Agnes] 视频生成完成，正在下载...")
      const data = await download(videoUrl)
      return { data, taskId: videoId }
    }

    if (status.status === "failed") {
      const errMsg = status.error ? JSON.stringify(status.error) : "未知错误"
      throw new Error(`Agnes 视频生成失败: ${errMsg}`)
    }

    // status can be "queued", "in_progress", etc.
  }

  throw new Error(`Agnes 视频生成超时（已等待 ${MAX_POLL_MS / 1000 / 60} 分钟）`)
}
