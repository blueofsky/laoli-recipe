import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import type { CliArgs, TTSProvider, TTSResult } from "../types";

function getApiUrl(): string {
  const base = (process.env.MINIMAX_BASE_URL || "https://api.minimaxi.com")
    .replace(/\/+$/, "") // 去掉末尾斜杠
    .replace(/\/v1$/, ""); // 去掉末尾的 /v1（如果有的话）
  return `${base}/v1/t2a_v2`;
}

const DEFAULTS = {
  model: "speech-2.8-hd",
  voiceId: "ttv-voice-2026051917163326-rttkUOFO",
  speed: 1.0,
  vol: 3,
  pitch: 0,
  format: "mp3",
  sampleRate: 32000,
  bitrate: 128000,
  channel: 1,
  languageBoost: "Chinese",
} as const;

function getApiKey(): string {
  const key = process.env.MINIMAX_API_KEY;
  if (!key) throw new Error("MINIMAX_API_KEY 未配置。请前往 https://platform.minimaxi.com 获取 API Key");
  return key;
}

function generateFileName(text: string, ext: string): string {
  const hash = createHash("md5").update(text).digest("hex").slice(0, 8);
  const timestamp = Date.now();
  return `tts_${timestamp}_${hash}.${ext}`;
}

async function callApi(url: string, body: Record<string, unknown>, apiKey: string): Promise<Response> {
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

export const minimaxProvider: TTSProvider = {
  name: "minimax",

  async generate(text: string, args: CliArgs): Promise<TTSResult> {
    const apiKey = getApiKey();

    const model = fill(args.model, DEFAULTS.model);
    const voiceId = fill(args.voiceId, DEFAULTS.voiceId);
    const speed = fill(args.speed, DEFAULTS.speed);
    const vol = fill(args.vol, DEFAULTS.vol);
    const pitch = fill(args.pitch, DEFAULTS.pitch);
    const format = fill(args.format, DEFAULTS.format);
    const sampleRate = fill(args.sampleRate, DEFAULTS.sampleRate);
    const bitrate = fill(args.bitrate, DEFAULTS.bitrate);
    const channel = fill(args.channel, DEFAULTS.channel);
    const languageBoost = fill(args.languageBoost, DEFAULTS.languageBoost);

    const body: Record<string, unknown> = {
      model,
      text,
      stream: false,
      voice_setting: { voice_id: voiceId, speed, vol, pitch },
      audio_setting: { sample_rate: sampleRate, bitrate, format, channel },
      subtitle_enable: false,
      language_boost: languageBoost,
    };

    if (args.emotion) {
      (body.voice_setting as Record<string, unknown>).emotion = args.emotion;
    }

    // voice_modify: 同音色质感微调（intensity 控制力量感/轻柔度）
    if (args.intensity != null) {
      body.voice_modify = { intensity: args.intensity };
    }

    const response = await callApi(getApiUrl(), body, apiKey);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`MiniMax API 错误 (${response.status}): ${errorText}`);
    }

    const result = (await response.json()) as {
      data: { audio: string; status: number };
      extra_info?: { audio_length: number; audio_size: number; audio_format: string };
      base_resp: { status_code: number; status_msg: string };
    };

    if (result.base_resp.status_code !== 0) {
      throw new Error(
        `MiniMax API 错误: ${result.base_resp.status_msg} (code: ${result.base_resp.status_code})`,
      );
    }

    const audioHex = result.data.audio;
    const audioBuffer = Buffer.from(audioHex, "hex");
    const ext = result.extra_info?.audio_format || format;
    const fileName = generateFileName(text, ext);
    const outputDir = args.outputDirectory!;
    const filePath = path.resolve(outputDir, fileName);

    await mkdir(outputDir, { recursive: true });
    await writeFile(filePath, audioBuffer);

    return {
      filePath,
      durationMs: result.extra_info?.audio_length ?? 0,
      sizeBytes: result.extra_info?.audio_size ?? audioBuffer.length,
      format: ext,
    };
  },
};
