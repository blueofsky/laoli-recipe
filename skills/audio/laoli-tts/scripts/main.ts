import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";
import type { CliArgs, Provider, ExtendConfig, TTSProvider } from "./types";

// ── Provider registry ──────────────────────────────────────────────
const PROVIDER_REGISTRY: Record<Provider, () => Promise<TTSProvider>> = {
  minimax: () => import("./providers/minimax").then((m) => m.minimaxProvider),
};

const ALL_PROVIDERS = Object.keys(PROVIDER_REGISTRY) as Provider[];

// ── Usage ───────────────────────────────────────────────────────────
function printUsage(): void {
  console.log(`Usage:
  npx -y bun scripts/main.ts --text "说话文本" --output /path/to/output

Options:
  -t, --text <text>          台词文本（必填）
  -o, --output <directory>   输出目录（必填）
  --provider <name>          提供商（默认: 从 EXTEND.md 读取，或 minimax）
  --model <id>               模型 ID
  --voice <id>               音色 ID
  --speed <0.5-2>            语速（由 provider 决定默认值）
  --vol <0-10>               音量（由 provider 决定默认值）
  --pitch <-12-12>           语调（由 provider 决定默认值）
  --emotion <emotion>        情绪
  --intensity <value>        强度(-100~100)：正数有力，负数轻柔（由 provider 决定默认值）
  --format <fmt>             音频格式 mp3|pcm|flac|wav（由 provider 决定默认值）
  --sample-rate <hz>         采样率（由 provider 决定默认值）
  --bitrate <bps>            比特率（由 provider 决定默认值）
  --channel <1|2>            声道数（由 provider 决定默认值）
  --language-boost <lang>    语言增强（由 provider 决定默认值）
  --json                     JSON 输出
  -h, --help                 显示帮助

Supported providers: ${ALL_PROVIDERS.join(", ")}

Environment variables:
  MINIMAX_API_KEY            MiniMax API Key（必填）
  MINIMAX_BASE_URL           MiniMax API 域名（可选，默认 https://api.minimaxi.com，支持带 /v1 后缀）

输出: 生成的音频文件路径`);
}

// ── Args parsing ────────────────────────────────────────────────────
export function parseArgs(argv: string[]): CliArgs {
  const out: CliArgs = {
    text: null,
    outputDirectory: null,
    provider: null,
    model: null,
    voiceId: null,
    speed: null,
    vol: null,
    pitch: null,
    emotion: null,
    intensity: null,
    format: null,
    sampleRate: null,
    bitrate: null,
    channel: null,
    languageBoost: null,
    json: false,
    help: false,
  };

  // Named args
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;

    if (a === "-h" || a === "--help") { out.help = true; continue; }
    if (a === "--json") { out.json = true; continue; }

    const named: Record<string, (v: string) => void> = {
      "--text":         (v) => { out.text = v; },
      "-t":             (v) => { out.text = v; },
      "--output":       (v) => { out.outputDirectory = v; },
      "-o":             (v) => { out.outputDirectory = v; },
      "--provider":     (v) => {
        if (!ALL_PROVIDERS.includes(v as Provider)) {
          throw new Error(`不支持的 provider: ${v}，可选: ${ALL_PROVIDERS.join(", ")}`);
        }
        out.provider = v as Provider;
      },
      "--model":        (v) => { out.model = v; },
      "--voice":        (v) => { out.voiceId = v; },
      "--speed":        (v) => { const n = parseFloat(v); if (isNaN(n) || n < 0.5 || n > 2) throw new Error("speed 0.5-2"); out.speed = n; },
      "--vol":          (v) => { const n = parseFloat(v); if (isNaN(n) || n < 0 || n > 10) throw new Error("vol 0-10"); out.vol = n; },
      "--pitch":        (v) => { const n = parseInt(v, 10); if (isNaN(n) || n < -12 || n > 12) throw new Error("pitch -12~12"); out.pitch = n; },
      "--emotion":      (v) => { out.emotion = v; },
      "--intensity":    (v) => { const n = parseInt(v, 10); if (isNaN(n) || n < -100 || n > 100) throw new Error("intensity -100~100"); out.intensity = n; },
      "--format":       (v) => { if (!["mp3","pcm","flac","wav"].includes(v)) throw new Error("format: mp3|pcm|flac|wav"); out.format = v; },
      "--sample-rate":  (v) => { const n = parseInt(v, 10); if (isNaN(n)) throw new Error("sample-rate 需为数字"); out.sampleRate = n; },
      "--bitrate":      (v) => { const n = parseInt(v, 10); if (isNaN(n)) throw new Error("bitrate 需为数字"); out.bitrate = n; },
      "--channel":      (v) => { const n = parseInt(v, 10); if (n !== 1 && n !== 2) throw new Error("channel: 1 或 2"); out.channel = n; },
      "--language-boost": (v) => { out.languageBoost = v; },
    };

    const parser = named[a];
    if (parser) {
      const v = argv[++i];
      if (v === undefined) throw new Error(`缺少 ${a} 的值`);
      parser(v);
      continue;
    }

    if (a.startsWith("-")) throw new Error(`未知选项: ${a}`);

    // Positional: first = text, second = outputDir
    if (!out.text) { out.text = a; }
    else if (!out.outputDirectory) { out.outputDirectory = a; }
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
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      env[key] = val;
    }
    return env;
  } catch { return {}; }
}

async function loadEnv(): Promise<void> {
  const home = homedir();
  const cwd = process.cwd();
  const homeEnv = await loadEnvFile(path.join(home, ".laoli-recipe", ".env"));
  const cwdEnv = await loadEnvFile(path.join(cwd, ".laoli-recipe", ".env"));
  for (const [k, v] of Object.entries(homeEnv)) { if (!process.env[k]) process.env[k] = v; }
  for (const [k, v] of Object.entries(cwdEnv)) { if (!process.env[k]) process.env[k] = v; }
}

// ── EXTEND.md loading ───────────────────────────────────────────────
function extractYamlFrontMatter(content: string): string | null {
  const match = content.match(/^---\s*\n([\s\S]*?)\n---\s*$/m);
  return match ? match[1] : null;
}

function parseSimpleYaml(yaml: string): Partial<ExtendConfig> {
  const config: Partial<ExtendConfig> = {};
  // Default version
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
      case "default_voice":
        config.default_voice = value.replace(/['"]/g, "");
        break;
      case "default_speed":
        config.default_speed = parseFloat(value);
        break;
      case "default_vol":
        config.default_vol = parseFloat(value);
        break;
      case "default_pitch":
        config.default_pitch = parseInt(value, 10);
        break;
      case "default_format":
        config.default_format = value.replace(/['"]/g, "");
        break;
      case "default_emotion":
        config.default_emotion = value.replace(/['"]/g, "");
        break;
      case "default_intensity":
        config.default_intensity = parseInt(value, 10);
        break;
      case "default_sample_rate":
        config.default_sample_rate = parseInt(value, 10);
        break;
      case "default_bitrate":
        config.default_bitrate = parseInt(value, 10);
        break;
      case "default_channel":
        config.default_channel = parseInt(value, 10);
        break;
      case "default_language_boost":
        config.default_language_boost = value.replace(/['"]/g, "");
        break;
    }
  }

  return config;
}

async function loadExtendConfig(): Promise<Partial<ExtendConfig>> {
  const home = homedir();
  const cwd = process.cwd();
  const paths = [
    path.join(cwd, ".laoli-recipe", "laoli-tts", "EXTEND.md"),
    path.join(home, ".laoli-recipe", "laoli-tts", "EXTEND.md"),
  ];

  for (const p of paths) {
    try {
      const content = await readFile(p, "utf8");
      const yaml = extractYamlFrontMatter(content);
      if (!yaml) continue;
      return parseSimpleYaml(yaml);
    } catch { continue; }
  }

  return {};
}

// ── Config merge ────────────────────────────────────────────────────
export function mergeConfig(args: CliArgs, config: Partial<ExtendConfig>): CliArgs {
  return {
    ...args,
    provider: args.provider ?? config.default_provider ?? null,
    model: args.model ?? config.default_model ?? null,
    voiceId: args.voiceId ?? config.default_voice ?? null,
    speed: args.speed ?? config.default_speed ?? null,
    vol: args.vol ?? config.default_vol ?? null,
    pitch: args.pitch ?? config.default_pitch ?? null,
    emotion: args.emotion ?? config.default_emotion ?? null,
    intensity: args.intensity ?? config.default_intensity ?? null,
    format: args.format ?? config.default_format ?? null,
    sampleRate: args.sampleRate ?? config.default_sample_rate ?? null,
    bitrate: args.bitrate ?? config.default_bitrate ?? null,
    channel: args.channel ?? config.default_channel ?? null,
    languageBoost: args.languageBoost ?? config.default_language_boost ?? null,
  };
}

// ── Provider detection ──────────────────────────────────────────────
function detectProvider(args: CliArgs): Provider {
  return args.provider ?? "minimax";
}

// ── Main ────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) { printUsage(); return; }

  await loadEnv();
  const extendConfig = await loadExtendConfig();
  const mergedArgs = mergeConfig(args, extendConfig);

  if (!mergedArgs.text) throw new Error("缺少 --text 参数");
  if (!mergedArgs.outputDirectory) throw new Error("缺少 --output 参数");

  const provider = detectProvider(mergedArgs);
  const loadProvider = PROVIDER_REGISTRY[provider];
  if (!loadProvider) throw new Error(`不支持的 provider: ${provider}`);

  const ttsProvider = await loadProvider();

  console.error(`TTS: 使用 ${provider} 生成语音...`);
  if (mergedArgs.model) console.error(`  模型: ${mergedArgs.model}`);
  if (mergedArgs.voiceId) console.error(`  音色: ${mergedArgs.voiceId}`);
  if (mergedArgs.speed != null) console.error(`  语速: ${mergedArgs.speed}`);
  if (mergedArgs.vol != null) console.error(`  音量: ${mergedArgs.vol}`);
  if (mergedArgs.pitch != null) console.error(`  语调: ${mergedArgs.pitch}`);
  if (mergedArgs.emotion) console.error(`  情绪: ${mergedArgs.emotion}`);
  if (mergedArgs.intensity != null) console.error(`  强度: ${mergedArgs.intensity}`);

  const result = await ttsProvider.generate(mergedArgs.text, mergedArgs);

  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  console.log(result.filePath);
}

function isDirectExecution(metaUrl: string): boolean {
  const entryPath = process.argv[1];
  if (!entryPath) return false;
  try { return path.resolve(entryPath) === fileURLToPath(metaUrl); }
  catch { return false; }
}

if (isDirectExecution(import.meta.url)) {
  main().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exit(1);
  });
}
