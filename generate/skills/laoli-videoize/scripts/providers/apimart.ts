/**
 * APIMart Video Generation Provider
 * 支持模型: https://docs.apimart.ai/cn/api-reference/videos
 *
 * 重要: APIMart 支持多种后端模型（Doubao Seedance, VEO3, Sora 等）
 * 模型 ID 必须与 APIMart 文档一致，不在列表中的模型可能不被支持
 */

import { readFile, stat } from "node:fs/promises"
import path from "node:path"
import type { CliArgs } from "../types"
import { isNetworkError, download } from "../shared"

function getBaseUrl(): string {
  const base = process.env.APIMART_BASE_URL || "https://api.apimart.ai"
  return base.replace(/\/+$/g, "").replace(/\/v1\/?$/, "")
}

const POLL_INTERVAL_MS = 5000
const MAX_POLL_MS = 90 * 60 * 1000
const BACKOFF_MULTIPLIER = 1.5
const MAX_BACKOFF_MS = 60000

/**
 * APIMart 确认支持的模型列表（来源: APIMart 官方文档）
 * ⚠️ 不在此列表的模型可能不被 APIMart 支持，请先确认文档
 */
export const APIMART_MODELS = [
  // Doubao Seedance 1.0 Pro (https://docs.apimart.ai/cn/api-reference/videos/doubao/generation)
  {
    id: "doubao-seedance-1-0-pro-fast",
    name: "Doubao Seedance 1.0 Pro Fast",
    sizeField: "aspect_ratio",
    duration: { min: 2, max: 12, default: 5 },
    size: ["16:9", "9:16", "1:1", "4:3", "3:4", "21:9"],
    resolution: ["480p", "720p", "1080p"],
    refMode: "image_with_roles",
  },
  // Doubao Seedance 1.5 Pro (https://docs.apimart.ai/cn/api-reference/videos/doubao-seedance-1-5-pro/generation)
  {
    id: "doubao-seedance-1-5-pro",
    name: "Doubao Seedance 1.5 Pro",
    sizeField: "aspect_ratio",
    duration: { min: 4, max: 12, default: 5 },
    size: ["16:9", "9:16", "1:1", "4:3", "3:4", "21:9"],
    resolution: ["480p", "720p", "1080p"],
    refMode: "image_with_roles",
  },
  // Doubao Seedance 2.0 (https://docs.apimart.ai/cn/api-reference/videos/doubao-seedance-2-0/generation)
  {
    id: "doubao-seedance-2.0-fast",
    name: "Doubao Seedance 2.0 Fast",
    sizeField: "size",
    duration: { min: 4, max: 15, default: 5 },
    size: ["16:9", "9:16", "1:1", "4:3", "3:4", "21:9"],
    resolution: ["480p", "720p", "1080p"],
    refMode: "image_with_roles",
    extra: ["generate_audio", "return_last_frame"],
  },
  // VEO3 (https://docs.apimart.ai/cn/api-reference/videos/veo3/generation)
  {
    id: "veo3.1-fast",
    name: "VEO3.1 Fast",
    sizeField: "aspect_ratio",
    duration: { min: 8, max: 8, default: 8 }, // 固定8秒
    size: ["16:9", "9:16"],
    resolution: ["720p", "1080p", "4k"],
    refMode: "image_urls",
  },
  // Sora 2 (https://docs.apimart.ai/cn/api-reference/videos/sora-2)
  {
    id: "sora-2-preview",
    name: "Sora 2 Preview",
    sizeField: "aspect_ratio",
    duration: { min: 4, max: 12, default: 4 }, // 只支持 4/8/12 秒三个固定值
    size: ["16:9", "9:16"],
    resolution: ["480p", "720p", "1080p"],
    refMode: "image_urls",
  },
  // Wan2.6 I2V Flash (https://docs.apimart.ai/cn/api-reference/videos/wan2.6/i2v-flash-generation)
  // 注意: Wan2.6 图生视频不支持 aspect_ratio，宽高比由输入图片决定
  {
    id: "wan2.6-i2v-flash",
    name: "Wan2.6 I2V Flash",
    sizeField: "",
    duration: { min: 2, max: 15, default: 5 },
    size: [],
    resolution: ["720p", "1080p"],
    refMode: "image_urls",
  },
  // Wan2.6 I2V (https://docs.apimart.ai/cn/api-reference/videos/wan2.6/i2v-generation)
  {
    id: "wan2.6-i2v",
    name: "Wan2.6 I2V",
    sizeField: "",
    duration: { min: 2, max: 15, default: 5 },
    size: [],
    resolution: ["720p", "1080p"],
    refMode: "image_urls",
  },
] as const

export type ApimartModel = (typeof APIMART_MODELS)[number]["id"]

export function getModelInfo(model: string) {
  return APIMART_MODELS.find((m) => m.id === model)
}

export function getDefaultModel(): string {
  return process.env.APIMART_VIDEO_MODEL || "doubao-seedance-1-0-pro-fast"
}

function getApiKey(): string {
  const key = process.env.APIMART_API_KEY
  if (!key) {
    throw new Error(
      "APIMART_API_KEY 未配置。请前往 https://apimart.ai/keys 获取 API Key\n" +
        "设置方式: export APIMART_API_KEY=your_api_key"
    )
  }
  return key
}

// 上传图片响应类型
type UploadResponse = {
  url: string
  filename: string
  content_type: string
  bytes: number
  created_at: number
}

/**
 * 上传本地图片到 APIMart，获取公开访问 URL
 * @param filePath 本地文件路径
 * @param apiKey API Key
 * @returns 上传后的公开 URL
 */
async function uploadImage(filePath: string, apiKey: string): Promise<string> {
  const baseUrl = getBaseUrl()
  const fileStats = await stat(filePath)
  const maxSize = 20 * 1024 * 1024 // 20MB

  if (fileStats.size > maxSize) {
    throw new Error(`图片 ${path.basename(filePath)} 超过 20MB 限制 (${fileStats.size} bytes)`)
  }

  const bytes = await readFile(filePath)
  const ext = path.extname(filePath).toLowerCase()
  const mimeMap: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif",
  }
  const mime = mimeMap[ext] || "application/octet-stream"

  console.log(`正在上传图片 ${path.basename(filePath)} (${fileStats.size} bytes)...`)

  const formData = new FormData()
  formData.append("file", new Blob([bytes], { type: mime }), path.basename(filePath))

  const res = await fetch(`${baseUrl}/v1/uploads/images`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData,
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`图片上传失败 (${res.status}): ${err}`)
  }

  const data = (await res.json()) as UploadResponse
  console.log(`图片上传成功: ${data.url}`)
  return data.url
}

/**
 * 处理参考图片：本地文件自动上传，URL 直接使用
 * @param images 图片路径或 URL 数组
 * @param apiKey API Key
 * @returns 处理后的 URL 数组
 */
async function processReferenceImages(images: string[], apiKey: string): Promise<string[]> {
  const urls: string[] = []

  for (const img of images) {
    if (img.startsWith("http://") || img.startsWith("https://")) {
      urls.push(img)
    } else {
      const uploadedUrl = await uploadImage(img, apiKey)
      urls.push(uploadedUrl)
    }
  }

  return urls
}

// APIMart API Response types
type SubmitResponse = {
  code: number
  data: Array<{ status: string; task_id: string }>
  message?: string
}

type StatusResponse = {
  code: number
  data: {
    id: string
    status: string
    progress?: number
    error?: unknown
    result?: {
      videos?: Array<{ url: string[]; expires_at: number }>
      thumbnail_url?: string
    }
    created?: number
    completed?: number
    estimated_time?: number
    actual_time?: number
  }
  message?: string
}

/** 判断错误是否可重试（仅网络错误可重试，参数错误/模型不存在等直接失败） */
function isRetryableError(e: unknown): boolean {
  return isNetworkError(e)
}

/**
 * 解析 CLI 参数为 APIMart API 参数
 * 根据不同模型使用正确的参数字段名
 */
async function buildApiParams(
  model: string,
  prompt: string,
  args: CliArgs,
  apiKey: string
): Promise<Record<string, unknown>> {
  const modelInfo = getModelInfo(model)
  const params: Record<string, unknown> = {
    model,
    prompt,
  }

  // 时长 - 不同模型范围不同
  if (args.seconds != null) {
    const dur = args.seconds
    // VEO3 固定8秒，不传 duration 参数
    if (modelInfo && dur === 8 && modelInfo.duration.max === 8) {
      // VEO3 固定8秒，不设置 duration
    } else if (modelInfo) {
      // 检查是否在模型支持范围内
      if (dur >= modelInfo.duration.min && dur <= modelInfo.duration.max) {
        params.duration = dur
      } else {
        console.warn(`警告: ${model} 支持时长范围 ${modelInfo.duration.min}-${modelInfo.duration.max}秒，已调整为默认值 ${modelInfo.duration.default}`)
        params.duration = modelInfo.duration.default
      }
    } else {
      params.duration = dur
    }
  }

  // 尺寸/宽高比 - 不同模型使用不同字段名
  if (args.size) {
    const sizeStr = args.size.toLowerCase()
    let sizeValue = sizeStr

    // 解析尺寸别名
    if (sizeStr === "16x9" || sizeStr === "landscape") sizeValue = "16:9"
    else if (sizeStr === "9x16" || sizeStr === "portrait") sizeValue = "9:16"
    else if (sizeStr === "1x1") sizeValue = "1:1"
    else if (sizeStr === "4x3") sizeValue = "4:3"
    else if (sizeStr === "3x4") sizeValue = "3:4"
    else if (sizeStr === "21x9") sizeValue = "21:9"
    else if (sizeStr.includes("x")) {
      const [w, h] = sizeStr.split("x").map(Number)
      if (w && h) sizeValue = `${w}:${h}`
    }

    // 根据模型选择正确的参数字段名
    // sizeField 为 "" 表示模型不接收尺寸参数（如 Wan2.6 图生视频）
    const sizeField = modelInfo?.sizeField ?? "aspect_ratio"

    // 如果 sizeField 为空字符串，跳过尺寸参数（宽高比由输入图片决定）
    if (sizeField === "") {
      // 不传尺寸参数
    } else {
      // 检查尺寸是否受支持
      if (modelInfo && !(modelInfo.size as readonly string[]).includes(sizeValue)) {
        console.warn(`警告: ${model} 不支持尺寸 ${sizeValue}，使用默认 16:9`)
        sizeValue = "16:9"
      }

      params[sizeField] = sizeValue
    }
  }

  // 分辨率 - 部分 API 支持 resolution 参数
  if (args.resolution) {
    if (modelInfo && (modelInfo.resolution as readonly string[]).includes(args.resolution)) {
      params.resolution = args.resolution
    } else if (modelInfo) {
      console.warn(`警告: ${model} 不支持分辨率 ${args.resolution}，使用模型默认值`)
    } else {
      params.resolution = args.resolution
    }
  }

  // 参考图片处理：本地文件自动上传到 APIMart，URL 直接使用
  if (args.referenceImages.length > 0) {
    const urls = await processReferenceImages(args.referenceImages, apiKey)

    if (urls.length > 0) {
      // 根据模型支持的 refMode 选择参数格式
      if (modelInfo?.refMode === "image_with_roles") {
        const mode = args.refMode || "reference"

        if (mode === "reference" || mode === "components") {
          params.image_urls = urls
        } else if (mode === "frames") {
          params.image_with_roles = urls.map((url) => ({ url, role: "first_frame" }))
        } else if (mode === "last_frame") {
          params.image_with_roles = urls.map((url) => ({ url, role: "last_frame" }))
        }
      } else {
        // VEO3, Sora, Wan2.6 使用 image_urls 传参考图
        params.image_urls = urls

        // VEO3: 显式指定 generation_type，1张图为 reference 模式
        // 文档: https://docs.apimart.ai/cn/api-reference/videos/veo3/generation
        // 注意: veo3.1-quality 不支持 reference; veo3.1-lite 不支持此参数
        if (modelInfo?.id === "veo3.1-fast") {
          if (urls.length === 1) {
            params.generation_type = "reference"
          } else if (urls.length === 2) {
            params.generation_type = "frame"
          }
        }
      }
    }
  }

  // Seedance 2.0 支持 generate_audio
  if (args.audio && modelInfo && "extra" in modelInfo && (modelInfo.extra as readonly string[]).includes("generate_audio")) {
    params.generate_audio = true
  }

  return params
}

/**
 * 获取任务状态
 */
async function pollTaskStatus(taskId: string, apiKey: string): Promise<StatusResponse["data"] | null> {
  const baseUrl = getBaseUrl()
  const url = `${baseUrl}/v1/tasks/${taskId}`

  const pollRes = await fetch(url, {
    headers: { Authorization: `Bearer ${apiKey}` },
  })

  if (!pollRes.ok) {
    const err = await pollRes.text()
    throw new Error(`APIMart 状态查询错误 (${pollRes.status}): ${err}`)
  }

  const data = (await pollRes.json()) as StatusResponse

  if (data.code !== 200) {
    throw new Error(`APIMart API 错误 (${data.code}): ${data.message || "未知错误"}`)
  }

  return data.data || null
}

/**
 * 提交任务
 * @returns taskId 任务 ID
 */
async function submitTask(params: Record<string, unknown>, apiKey: string): Promise<string> {
  const baseUrl = getBaseUrl()
  const submitRes = await fetch(`${baseUrl}/v1/videos/generations`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  })

  const errText = await submitRes.text()

  if (!submitRes.ok) {
    throw Object.assign(new Error(`APIMart API 提交错误 (${submitRes.status}): ${errText}`), {
      retryable: false,
      httpStatus: submitRes.status,
    })
  }

  const submitData = JSON.parse(errText) as SubmitResponse

  if (submitData.code !== 200) {
    throw Object.assign(new Error(`APIMart API 错误 (${submitData.code}): ${submitData.message || "提交失败"}`), {
      retryable: false,
      apiCode: submitData.code,
    })
  }

  const taskInfo = submitData.data?.[0]
  if (!taskInfo?.task_id) {
    throw Object.assign(new Error("APIMart API 未返回 task_id"), { retryable: false })
  }

  return taskInfo.task_id
}

export async function generateVideo(
  prompt: string,
  model: string,
  args: CliArgs,
  opts: { taskId?: string } = {}
): Promise<{ data: Uint8Array; taskId: string }> {
  const apiKey = getApiKey()
  const params = await buildApiParams(model, prompt, args, apiKey)

  console.log(`正在提交 APIMart 视频生成任务 (${model})...`)
  console.log(`请求参数: ${JSON.stringify(params)}`)

  if (args.referenceImages.length > 0) {
    console.log(`参考图片: ${args.referenceImages.length} 张 (本地文件会自动上传)`)
  }

  // 如果传入了 taskId，说明要恢复已有任务，直接进入轮询
  let taskId = opts.taskId

  if (!taskId) {
    taskId = await submitTask(params, apiKey)
    console.log(`任务已提交 (task_id: ${taskId})，正在轮询结果...`)
  } else {
    console.log(`恢复任务 (task_id: ${taskId})，正在轮询结果...`)
  }

  const startTime = Date.now()
  let backoff = POLL_INTERVAL_MS
  let lastLogTime = 0

  while (Date.now() - startTime < MAX_POLL_MS) {
    await new Promise((r) => setTimeout(r, backoff))

    let statusData: StatusResponse["data"] | null
    try {
      statusData = await pollTaskStatus(taskId!, apiKey)
    } catch (e) {
      if (isRetryableError(e)) {
        backoff = Math.min(backoff * BACKOFF_MULTIPLIER, MAX_BACKOFF_MS)
        console.error(`网络错误，${Math.round(backoff / 1000)}s 后重试...`)
        continue
      }
      throw e
    }

    backoff = POLL_INTERVAL_MS

    if (!statusData) {
      console.log("等待任务状态...")
      continue
    }

    const elapsed = Math.round((Date.now() - startTime) / 1000)

    // 每 15 秒输出一次进度日志
    if (elapsed - lastLogTime >= 15) {
      console.log(`轮询中... 状态=${statusData.status}, 进度=${statusData.progress ?? 0}%, 已用时=${elapsed}s`)
      lastLogTime = elapsed
    }

    if (statusData.status === "completed" || statusData.status === "success") {
      const video = statusData.result?.videos?.[0]
      const url = video?.url?.[0]
      if (!url) throw new Error("APIMart API 未返回视频 URL")
      console.log("视频生成完成。")
      return { data: await download(url), taskId: taskId! }
    }

    if (statusData.status === "failed" || statusData.status === "error") {
      const errMsg = statusData.error ? ` (${typeof statusData.error === "string" ? statusData.error : JSON.stringify(statusData.error)})` : ""
      throw Object.assign(new Error(`视频生成失败: ${statusData.status}${errMsg}`), { retryable: false })
    }
  }

  throw new Error(`视频生成超时，已等待 ${MAX_POLL_MS / 1000 / 60} 分钟`)
}
