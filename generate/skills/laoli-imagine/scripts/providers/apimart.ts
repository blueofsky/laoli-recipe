import type { CliArgs } from "../types";

// Models that DO NOT support reference images (dash-normalized)
const REF_UNSUPPORTED_MODELS = new Set([
  "grok-imagine-1.0",
  "wan2.7-image",
]);

const DEFAULT_MODEL = "gpt-image-2";
const BASE_URL = process.env.APIMART_BASE_URL || "https://api.apimart.ai/v1";
const POLL_INTERVAL_MS = 5000;
const MAX_POLL_ATTEMPTS = 360; // 30分钟 max

export function getDefaultModel(): string {
  return process.env.APIMART_IMAGE_MODEL || DEFAULT_MODEL;
}

export function validateArgs(model: string, args: CliArgs): void {
  if (args.referenceImages.length > 0) {
    // Normalize: remove hyphens for matching (wan2.7-image / wan-2.7-image are the same model)
    const normalized = model.toLowerCase().replace(/-/g, "");
    const isUnsupported = [...REF_UNSUPPORTED_MODELS].some((m) => normalized === m.replace(/-/g, ""));
    if (isUnsupported) {
      throw new Error(
        `Model ${model} 不支持参考图片 (--ref)。` +
          `请使用 gpt-image-2、gemini 系列或 seedream 系列。`
      );
    }
  }
}

function getApiKey(): string | null {
  return process.env.APIMART_API_KEY || null;
}

// GPT-Image-2: 4K only supports these aspect ratios
const GPT_IMAGE_2_4K_SUPPORTED_AR = new Set([
  "16:9", "9:16", "2:1", "1:2", "21:9", "9:21",
]);

// APIMart resolution → API uses lowercase 'k' (e.g. "2k", not "2K")
// Seedream special: does not support 1K/4K
function mapResolution(model: string, resolution: string): string {
  const m = model.toLowerCase();
  if (m.includes("seedream")) {
    if (resolution === "1K") return "2k";
    if (resolution === "4K") return "3k";
  }
  // Always use lowercase 'k' for the API
  return resolution.toLowerCase();
}

function arToSize(ar: string | null): string | null {
  if (!ar) return null;
  const match = ar.match(/^(\d+(?:\.\d+)?):(\d+(?:\.\d+)?)$/);
  if (!match) return null;
  const w = Math.round(parseFloat(match[1]!));
  const h = Math.round(parseFloat(match[2]!));
  return `${w}:${h}`;
}

type SubmitResponse = { code: number; data: Array<{ status: string; task_id: string }> };
type PollResponse = {
  code: number;
  data: {
    id: string;
    status: string;
    progress?: number;
    error?: unknown;
    result?: {
      images: Array<{ url: string[]; expires_at: number }>;
    };
  };
};

async function downloadImage(url: string): Promise<Uint8Array> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`图片下载失败: ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
}

function parseError(error: unknown): string {
  if (!error) return "未知错误";
  if (typeof error === "string") return error;
  if (typeof error === "object" && error !== null) {
    const e = error as Record<string, unknown>;
    const code = e.code;
    const msg = e.message;
    if (typeof msg === "string") {
      if (typeof code === "string") return `${code}: ${msg}`;
      return msg;
    }
  }
  return String(error);
}

async function buildGenerationBody(
  model: string,
  prompt: string,
  args: CliArgs
): Promise<Record<string, unknown>> {
  const body: Record<string, unknown> = { model, prompt };

  const size = args.size || arToSize(args.aspectRatio);
  if (size) body.size = size;

  const resolution = (() => {
    if (args.imageSize) return mapResolution(model, args.imageSize.toUpperCase());
    if (args.quality === "2k") return "2k";
    return "1k";
  })();

  // 4K 仅支持 16:9/9:16/2:1/1:2/21:9/9:21
  if (resolution === "4k" && size && !GPT_IMAGE_2_4K_SUPPORTED_AR.has(size)) {
    console.error(`[APIMart] 4K 仅支持 16:9/9:16/2:1/1:2/21:9/9:21，当前比例 ${size} 不支持，已降级为 2k`);
    body.resolution = "2k";
  } else {
    body.resolution = resolution;
  }

  if (args.referenceImages.length > 0) {
    body.image_urls = args.referenceImages;
  }

  return body;
}

export async function generateImage(
  prompt: string,
  model: string,
  args: CliArgs
): Promise<Uint8Array> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("APIMART_API_KEY 未配置。请前往 https://apimart.ai/keys 获取 API Key");

  // Prompt 长度警告
  if (prompt.length > 4000) {
    console.error(`[APIMart] 警告: prompt 长度 ${prompt.length} 字符，超过建议的 4000 字符限制`);
  }

  const body = await buildGenerationBody(model, prompt, args);

  console.log(`正在通过 APIMart 生成图片 (${model})...`);

  // Step 1: Submit task
  const submitRes = await fetch(`${BASE_URL}/images/generations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!submitRes.ok) {
    const err = await submitRes.text();
    throw new Error(`APIMart API 提交错误 (${submitRes.status}): ${err}`);
  }

  const submitData = (await submitRes.json()) as SubmitResponse;

  if (submitData.code !== 200) {
    throw new Error(`APIMart 返回错误码: ${submitData.code}`);
  }

  const task = submitData.data[0];
  if (!task || !task.task_id) throw new Error("APIMart 未返回任务 ID");

  const taskId = task.task_id;
  console.log(`任务已提交 (id: ${taskId})，正在轮询结果...`);

  // Step 2: Poll until completed
  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

    const pollRes = await fetch(`${BASE_URL}/tasks/${taskId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!pollRes.ok) {
      const err = await pollRes.text();
      throw new Error(`APIMart 轮询错误 (${pollRes.status}): ${err}`);
    }

    const status = (await pollRes.json()) as PollResponse;

    if (attempt % 12 === 0) {
      console.log(`轮询中... 状态=${status.data.status}, 进度=${status.data.progress ?? 0}%`);
    }

    if (status.data.status === "completed") {
      const images = status.data.result?.images;
      if (!images || images.length === 0) throw new Error("APIMart 未返回图片");
      const url = images[0]!.url[0];
      if (!url) throw new Error("APIMart 图片 URL 为空");
      console.log("生成完成。");
      return downloadImage(url);
    }

    if (status.data.status === "failed") {
      throw new Error(parseError(status.data.error));
    }
  }

  throw new Error(`APIMart 异步生成超时，已等待 ${(MAX_POLL_ATTEMPTS * POLL_INTERVAL_MS) / 1000} 秒`);
}
