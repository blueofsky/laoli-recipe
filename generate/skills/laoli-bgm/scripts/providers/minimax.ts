import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import type { MusicCliArgs, MusicProvider, MusicResult } from "../types";

function getApiUrl(): string {
  const base = (process.env.MINIMAX_BASE_URL || "https://api.minimaxi.com")
    .replace(/\/+$/, "")
    .replace(/\/v1$/, "");
  return `${base}/v1/music_generation`;
}

const DEFAULTS = {
  model: "music-2.6",
  format: "mp3",
  sampleRate: 44100,
  bitrate: 256000,
} as const;

function getApiKey(): string {
  const key = process.env.MINIMAX_API_KEY;
  if (!key)
    throw new Error(
      "MINIMAX_API_KEY 未配置。请前往 https://platform.minimaxi.com 获取 API Key",
    );
  return key;
}

function generateFileName(prompt: string, ext: string): string {
  const hash = createHash("md5").update(prompt).digest("hex").slice(0, 8);
  const timestamp = Date.now();
  return `bgm_${timestamp}_${hash}.${ext}`;
}

async function callApi(
  url: string,
  body: Record<string, unknown>,
  apiKey: string,
): Promise<Response> {
  return fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });
}

function fill<T>(val: T | null | undefined, fallback: T): T {
  return val ?? fallback;
}

export const minimaxMusicProvider: MusicProvider = {
  name: "minimax",

  async generate(prompt: string, args: MusicCliArgs): Promise<MusicResult> {
    const apiKey = getApiKey();

    const model = fill(args.model, DEFAULTS.model);
    const format = fill(args.format, DEFAULTS.format);
    const sampleRate = fill(args.sampleRate, DEFAULTS.sampleRate);
    const bitrate = fill(args.bitrate, DEFAULTS.bitrate);

    const body: Record<string, unknown> = {
      model,
      prompt,
      is_instrumental: true,
      lyrics_optimizer: false,
      stream: false,
      output_format: "hex",
      audio_setting: {
        sample_rate: sampleRate,
        bitrate,
        format,
      },
    };

    if (args.aigcWatermark === true) {
      body.aigc_watermark = true;
    }

    const response = await callApi(getApiUrl(), body, apiKey);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`MiniMax API 错误 (${response.status}): ${errorText}`);
    }

    const result = (await response.json()) as {
      data: { audio?: string; status: number };
      extra_info?: {
        music_duration?: number;
        music_sample_rate?: number;
        music_channel?: number;
        bitrate?: number;
        music_size?: number;
      };
      analysis_info?: unknown;
      base_resp: { status_code: number; status_msg: string };
    };

    if (result.base_resp.status_code !== 0) {
      throw new Error(
        `MiniMax API 错误: ${result.base_resp.status_msg} (code: ${result.base_resp.status_code})`,
      );
    }

    if (result.data.status !== 2 || !result.data.audio) {
      throw new Error(
        `音乐生成未完成 (status: ${result.data.status})，请稍后重试`,
      );
    }

    const audioHex = result.data.audio;
    const audioBuffer = Buffer.from(audioHex, "hex");
    const fileName = generateFileName(prompt, format);
    const outputDir = args.outputDirectory!;
    const filePath = path.resolve(outputDir, fileName);

    await mkdir(outputDir, { recursive: true });
    await writeFile(filePath, audioBuffer);

    return {
      filePath,
      durationS: result.extra_info?.music_duration ?? 0,
      sizeBytes: result.extra_info?.music_size ?? audioBuffer.length,
      format,
      sampleRate: result.extra_info?.music_sample_rate ?? sampleRate,
      channels: result.extra_info?.music_channel ?? 2,
    };
  },
};
