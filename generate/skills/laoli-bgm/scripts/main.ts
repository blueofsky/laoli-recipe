import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";
import type { MusicCliArgs, Provider, MusicExtendConfig, MusicProvider } from "./types";

// ── Provider registry ──────────────────────────────────────────────
const PROVIDER_REGISTRY: Record<Provider, () => Promise<MusicProvider>> = {
  minimax: () => import("./providers/minimax").then((m) => m.minimaxMusicProvider),
};

const ALL_PROVIDERS = Object.keys(PROVIDER_REGISTRY) as Provider[];

// ── Usage ───────────────────────────────────────────────────────────
function printUsage(): void {
  console.log(`Usage:
  npx -y bun scripts/main.ts --prompt "轻快的电子音乐" --output /path/to/output

Options:
  -p, --prompt <text>         音乐风格描述（必填）
  -s, --style <style>         风格前缀（可选，来自 EXTEND.md 默认偏好）
  -o, --output <directory>    输出目录（必填）
  --provider <name>           提供商（默认: 从 EXTEND.md 读取，或 minimax）
  --model <id>                模型 ID（默认: music-2.6）
  --format <fmt>              音频格式 mp3|wav|pcm（默认: mp3）
  --sample-rate <hz>          采样率: 16000|24000|32000|44100（默认: 44100）
  --bitrate <bps>             比特率: 32000|64000|128000|256000（默认: 256000）
  --aigc-watermark            添加 AIGC 水印
  --json                      JSON 输出
  -h, --help                  显示帮助

Supported providers: ${ALL_PROVIDERS.join(", ")}

Environment variables:
  MINIMAX_API_KEY             MiniMax API Key（必填）
  MINIMAX_BASE_URL            MiniMax API 域名（可选，默认 https://api.minimaxi.com）

输出: 生成的 BGM 音频文件路径`);
}

// ── Args parsing ────────────────────────────────────────────────────
export function parseArgs(argv: string[]): MusicCliArgs {
  const out: MusicCliArgs = {
    prompt: null,
    outputDirectory: null,
    provider: null,
    model: null,
    style: null,
    format: null,
    sampleRate: null,
    bitrate: null,
    aigcWatermark: null,
    json: false,
    help: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;

    if (a === "-h" || a === "--help") {
      out.help = true;
      continue;
    }
    if (a === "--json") {
      out.json = true;
      continue;
    }
    if (a === "--aigc-watermark") {
      out.aigcWatermark = true;
      continue;
    }

    const named: Record<string, (v: string) => void> = {
      "--prompt": (v) => {
        out.prompt = v;
      },
      "-p": (v) => {
        out.prompt = v;
      },
      "--style": (v) => {
        out.style = v;
      },
      "-s": (v) => {
        out.style = v;
      },
      "--output": (v) => {
        out.outputDirectory = v;
      },
      "-o": (v) => {
        out.outputDirectory = v;
      },
      "--provider": (v) => {
        if (!ALL_PROVIDERS.includes(v as Provider)) {
          throw new Error(
            `不支持的 provider: ${v}，可选: ${ALL_PROVIDERS.join(", ")}`,
          );
        }
        out.provider = v as Provider;
      },
      "--model": (v) => {
        out.model = v;
      },
      "--format": (v) => {
        if (!["mp3", "wav", "pcm"].includes(v))
          throw new Error("format: mp3|wav|pcm");
        out.format = v;
      },
      "--sample-rate": (v) => {
        const n = parseInt(v, 10);
        if (isNaN(n)) throw new Error("sample-rate 需为数字");
        out.sampleRate = n;
      },
      "--bitrate": (v) => {
        const n = parseInt(v, 10);
        if (isNaN(n)) throw new Error("bitrate 需为数字");
        out.bitrate = n;
      },
    };

    const parser = named[a];
    if (parser) {
      const v = argv[++i];
      if (v === undefined) throw new Error(`缺少 ${a} 的值`);
      parser(v);
      continue;
    }

    if (a.startsWith("-")) throw new Error(`未知选项: ${a}`);

    // Positional: first = prompt, second = outputDir
    if (!out.prompt) {
      out.prompt = a;
    } else if (!out.outputDirectory) {
      out.outputDirectory = a;
    }
  }

  return out;
}

// ── Env loading ─────────────────────────────────────────────────────
async function loadEnvFile(p: string): Promise<Record<string, string>> {
  try {
    const content = await readFile(p, "utf8");
    const env: Record<string, string> = {};
    for (const line of content.split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const idx = t.indexOf("=");
      if (idx === -1) continue;
      const key = t.slice(0, idx).trim();
      let val = t.slice(idx + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      env[key] = val;
    }
    return env;
  } catch {
    return {};
  }
}

async function loadEnv(): Promise<void> {
  const home = homedir();
  const cwd = process.cwd();
  const homeEnv = await loadEnvFile(
    path.join(home, ".laoli-recipe", ".env"),
  );
  const cwdEnv = await loadEnvFile(
    path.join(cwd, ".laoli-recipe", ".env"),
  );
  for (const [k, v] of Object.entries(homeEnv)) {
    if (!process.env[k]) process.env[k] = v;
  }
  for (const [k, v] of Object.entries(cwdEnv)) {
    if (!process.env[k]) process.env[k] = v;
  }
}

// ── EXTEND.md loading ───────────────────────────────────────────────
function extractYamlFrontMatter(content: string): string | null {
  const match = content.match(/^---\s*\n([\s\S]*?)\n---\s*$/m);
  return match ? match[1] : null;
}

function parseSimpleYaml(yaml: string): Partial<MusicExtendConfig> {
  const config: Partial<MusicExtendConfig> = {};
  config.version = 1;

  for (const line of yaml.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    if (!trimmed.includes(":")) continue;
    const colonIdx = trimmed.indexOf(":");
    const key = trimmed.slice(0, colonIdx).trim();
    let value = trimmed.slice(colonIdx + 1).trim();
    if (value === "null" || value === "") continue;

    switch (key) {
      case "version":
        config.version = parseInt(value, 10) || 1;
        break;
      case "default_provider":
        config.default_provider = value as Provider;
        break;
      case "default_model":
        config.default_model = value.replace(/['"]/g, "");
        break;
      case "default_style":
        config.default_style = value.replace(/['"]/g, "");
        break;
      case "default_format":
        config.default_format = value.replace(/['"]/g, "");
        break;
      case "default_sample_rate":
        config.default_sample_rate = parseInt(value, 10);
        break;
      case "default_bitrate":
        config.default_bitrate = parseInt(value, 10);
        break;
    }
  }

  return config;
}

async function loadExtendConfig(): Promise<Partial<MusicExtendConfig>> {
  const home = homedir();
  const cwd = process.cwd();
  const paths = [
    path.join(cwd, ".laoli-recipe", "laoli-bgm", "EXTEND.md"),
    path.join(home, ".laoli-recipe", "laoli-bgm", "EXTEND.md"),
  ];

  for (const p of paths) {
    try {
      const content = await readFile(p, "utf8");
      const yaml = extractYamlFrontMatter(content);
      if (!yaml) continue;
      return parseSimpleYaml(yaml);
    } catch {
      continue;
    }
  }

  return {};
}

// ── Config merge ────────────────────────────────────────────────────
export function mergeConfig(
  args: MusicCliArgs,
  config: Partial<MusicExtendConfig>,
): MusicCliArgs {
  return {
    ...args,
    provider: args.provider ?? config.default_provider ?? null,
    model: args.model ?? config.default_model ?? null,
    style: args.style ?? config.default_style ?? null,
    format: args.format ?? config.default_format ?? null,
    sampleRate: args.sampleRate ?? config.default_sample_rate ?? null,
    bitrate: args.bitrate ?? config.default_bitrate ?? null,
  };
}

// ── Provider detection ──────────────────────────────────────────────
function detectProvider(args: MusicCliArgs): Provider {
  return args.provider ?? "minimax";
}

// ── Main ────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printUsage();
    return;
  }

  await loadEnv();
  const extendConfig = await loadExtendConfig();
  const mergedArgs = mergeConfig(args, extendConfig);

  if (!mergedArgs.prompt && !mergedArgs.style) throw new Error("缺少 --prompt 参数");
  if (!mergedArgs.outputDirectory) throw new Error("缺少 --output 参数");

  // 组合最终 prompt：风格前缀 + 用户描述
  const effectivePrompt = mergedArgs.style
    ? mergedArgs.prompt
      ? `${mergedArgs.style}, ${mergedArgs.prompt}`
      : mergedArgs.style
    : mergedArgs.prompt!;

  const provider = detectProvider(mergedArgs);
  const loadProvider = PROVIDER_REGISTRY[provider];
  if (!loadProvider) throw new Error(`不支持的 provider: ${provider}`);

  const musicProvider = await loadProvider();

  console.error(`BGM: 使用 ${provider} 生成背景音乐...`);
  if (mergedArgs.model) console.error(`  模型: ${mergedArgs.model}`);
  if (mergedArgs.style) console.error(`  风格基调: ${mergedArgs.style}`);
  console.error(`  提示: ${effectivePrompt}`);
  console.error(`  生成中（约 10-30 秒）...`);

  const startTime = Date.now();
  const result = await musicProvider.generate(effectivePrompt, mergedArgs);
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.error(`  完成 (${elapsed}s): ${result.filePath}`);
  console.error(`  时长: ${result.durationS}s | 格式: ${result.format} | 大小: ${(result.sizeBytes / 1024 / 1024).toFixed(1)}MB`);

  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  console.log(result.filePath);
}

function isDirectExecution(metaUrl: string): boolean {
  const entryPath = process.argv[1];
  if (!entryPath) return false;
  try {
    return path.resolve(entryPath) === fileURLToPath(metaUrl);
  } catch {
    return false;
  }
}

if (isDirectExecution(import.meta.url)) {
  main().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exit(1);
  });
}
