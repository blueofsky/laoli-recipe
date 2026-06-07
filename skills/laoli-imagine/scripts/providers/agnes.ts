import { readFile } from "node:fs/promises";
import path from "node:path";
import type { CliArgs } from "../types";

const DEFAULT_MODEL = "agnes-image-2.1-flash";
// Strip trailing /v1 or / so users can set AGNES_BASE_URL with or without /v1 suffix
const BASE_URL = (process.env.AGNES_BASE_URL || "https://apihub.agnes-ai.com").replace(/\/v1\/?$|\/+$/, "");
// → API paths are appended as /v1/images/generations, so base should not end with /v1

// Safe pixel dimensions for Agnes Image API (~1.3MP max).
// Larger sizes (e.g. 1080x1920 = 2MP) cause HTTP 500 from the API.
const ASPECT_TO_SIZE: Record<string, string> = {
  "16:9": "1536x864",
  "9:16": "864x1536",
  "1:1": "1024x1024",
  "4:3": "1280x960",
  "3:2": "1440x960",
  "2:3": "960x1440",
  "21:9": "1536x658",
  "9:21": "658x1536",
};

const ASPECT_RE = /^(\d+):(\d+)$/;
const SIZE_RE = /^\d+x\d+$/;

// Supported local image formats and their MIME types
const IMAGE_MIME_MAP: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".bmp": "image/bmp",
};

export function getDefaultModel(): string {
  return process.env.AGNES_IMAGE_MODEL || DEFAULT_MODEL;
}

export function getDefaultOutputExtension(_model: string, _args: CliArgs): string {
  return ".png";
}

function getApiKey(): string | null {
  return process.env.AGNES_API_KEY || process.env.AGNES_API_TOKEN || process.env.APIHUB_AGNES_API_KEY || null;
}

function resolveSize(aspectRatio: string | null, explicitSize: string | null): string | null {
  if (explicitSize) {
    if (!SIZE_RE.test(explicitSize)) {
      throw new Error(`Invalid --size: "${explicitSize}". Expected WxH (e.g. 1024x1024).`);
    }
    return explicitSize;
  }
  if (aspectRatio) {
    if (ASPECT_RE.test(aspectRatio)) {
      const resolved = ASPECT_TO_SIZE[aspectRatio];
      if (resolved) return resolved;
    }
  }
  return null;
}

async function fileToDataUrl(filePath: string): Promise<string> {
  const ext = path.extname(filePath).toLowerCase();
  const mime = IMAGE_MIME_MAP[ext];
  if (!mime) throw new Error(`Agnes 不支持的图片格式: ${ext} (支持: ${Object.keys(IMAGE_MIME_MAP).join(", ")})`);
  const buffer = await readFile(filePath);
  return `data:${mime};base64,${buffer.toString("base64")}`;
}

export function validateArgs(_model: string, _args: CliArgs): void {
  // Agnes image-to-image is supported via extra_body.image — no args-level validation needed.
}

export async function generateImage(prompt: string, model: string, args: CliArgs): Promise<Uint8Array> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error(
      "AGNES_API_KEY 未配置。请在 .env 中设置 AGNES_API_KEY。" +
        "\n参考: https://platform.agnes-ai.com"
    );
  }

  const size = resolveSize(args.aspectRatio, args.size) || "1024x1024";

  const body: Record<string, unknown> = { model, prompt, size };

  // Handle reference images → image-to-image via extra_body.image
  if (args.referenceImages.length > 0) {
    const imageSources: string[] = [];
    for (const ref of args.referenceImages) {
      if (ref.startsWith("http://") || ref.startsWith("https://") || ref.startsWith("data:")) {
        imageSources.push(ref);
      } else {
        console.error(`[Agnes] 读取参考图片: ${path.basename(ref)}`);
        imageSources.push(await fileToDataUrl(ref));
      }
    }
    body["extra_body"] = { image: imageSources, response_format: "url" };
  }

  console.error(`[Agnes] 生成图片 (${model}, ${size})...`);

  const res = await fetch(`${BASE_URL}/v1/images/generations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Agnes API 错误 (${res.status}): ${err}`);
  }

  const data = (await res.json()) as {
    data?: Array<{ url?: string; b64_json?: string }>;
    url?: string;
  };

  // Try to extract the image URL
  const url = data.data?.[0]?.url ?? data.url;
  if (url) {
    console.error("[Agnes] 下载图片...");
    const imgRes = await fetch(url);
    if (!imgRes.ok) throw new Error(`Agnes 图片下载失败 (${imgRes.status})`);
    return new Uint8Array(await imgRes.arrayBuffer());
  }

  // Fallback: check for base64 response
  const b64 = data.data?.[0]?.b64_json;
  if (b64) {
    return new Uint8Array(Buffer.from(b64, "base64"));
  }

  throw new Error(`Agnes 未返回图片数据: ${JSON.stringify(data).slice(0, 200)}`);
}
