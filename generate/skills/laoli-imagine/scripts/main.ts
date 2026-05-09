import path from "node:path";
import process from "node:process";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import type {
  BatchFile,
  BatchTaskInput,
  CliArgs,
  ExtendConfig,
  Provider,
} from "./types";

type ProviderModule = {
  getDefaultModel: () => string;
  generateImage: (prompt: string, model: string, args: CliArgs) => Promise<Uint8Array>;
  validateArgs?: (model: string, args: CliArgs) => void;
  getDefaultOutputExtension?: (model: string, args: CliArgs) => string;
};

type PreparedTask = {
  id: string;
  prompt: string;
  args: CliArgs;
  provider: Provider;
  model: string;
  outputPath: string;
  providerModule: ProviderModule;
};

type TaskResult = {
  id: string;
  provider: Provider;
  model: string;
  outputPath: string;
  success: boolean;
  attempts: number;
  error: string | null;
};

type ProviderRateLimit = {
  concurrency: number;
  startIntervalMs: number;
};

type LoadedBatchTasks = {
  tasks: BatchTaskInput[];
  jobs: number | null;
  batchDir: string;
};

const MAX_ATTEMPTS = 3;
const DEFAULT_MAX_WORKERS = 10;
const POLL_WAIT_MS = 250;
const DEFAULT_PROVIDER_RATE_LIMITS: Record<Provider, ProviderRateLimit> = {
  tuzi: { concurrency: 3, startIntervalMs: 1100 },
  apimart: { concurrency: 3, startIntervalMs: 1100 },
};

function printUsage(): void {
  console.log(`Usage:
  npx -y bun scripts/main.ts --prompt "A cat" --image cat.png
  npx -y bun scripts/main.ts --promptfiles system.md content.md --image out.png
  npx -y bun scripts/main.ts --batchfile batch.json

Options:
  -p, --prompt <text>       Prompt text
  --promptfiles <files...>  Read prompt from files (concatenated)
  --image <path>            Output image path (required in single-image mode)
  --batchfile <path>        JSON batch file for multi-image generation
  --jobs <count>            Worker count for batch mode (default: auto, max from config, built-in default 10)
  --provider <tuzi|apimart>   Force provider (auto-detect by default)
  -m, --model <id>          Model ID
  --ar <ratio>              Aspect ratio (e.g., 16:9, 1:1, 4:3)
  --size <WxH>              Size (e.g., 1024x1024)
  --quality normal|2k        Quality preset (default: 2k)
  --imageSize 1K|2K|4K      Image size (default: from quality)
  --ref <files...>          Reference images (Tuzi multimodal, APIMart GPT-Image-2/Gemini/Seedream)
  --n <count>               Number of images (APIMart GPT-Image-2 only; default: 1)
  --json                    JSON output
  -h, --help                Show help

Batch file format:
  {
    "jobs": 4,
    "tasks": [
      {
        "id": "hero",
        "promptFiles": ["prompts/hero.md"],
        "image": "out/hero.png",
        "provider": "apimart",
        "model": "gpt-image-2",
        "ar": "16:9"
      }
    ]
  }

Behavior:
  - Batch mode automatically runs in parallel when pending tasks >= 2
  - Each image retries automatically up to 3 attempts
  - Batch summary reports success count, failure count, and per-image errors

Environment variables:
  TUZI_API_KEY             Tuzi API key
  APIMART_API_KEY          APIMart API key
  TUZI_IMAGE_MODEL         Default Tuzi model (default: gpt-image-2, 异步模型不受此变量控制)
  APIMART_IMAGE_MODEL      Default APIMart model (gpt-image-2)
  APIMART_BASE_URL         Custom APIMart endpoint (default: https://api.apimart.ai/v1)
  TUZI_BASE_URL            Custom Tuzi endpoint
  LAOLI_IMAGE_GEN_MAX_WORKERS  Override batch worker cap
  LAOLI_IMAGE_GEN_<PROVIDER>_CONCURRENCY  Override provider concurrency
  LAOLI_IMAGE_GEN_<PROVIDER>_START_INTERVAL_MS  Override provider start gap in ms

Env file load order: CLI args > process.env > ~/.laoli-recipe/.env > <cwd>/.laoli-recipe/.env (EXTEND.md is loaded separately)`);
}

export function parseArgs(argv: string[]): CliArgs {
  const out: CliArgs = {
    prompt: null,
    promptFiles: [],
    imagePath: null,
    provider: null,
    providerSource: null,
    model: null,
    aspectRatio: null,
    aspectRatioSource: null,
    size: null,
    quality: null,
    imageSize: null,
    imageSizeSource: null,
    referenceImages: [],
    n: 1,
    batchFile: null,
    jobs: null,
    json: false,
    help: false,
  };

  const positional: string[] = [];

  const takeMany = (i: number): { items: string[]; next: number } => {
    const items: string[] = [];
    let j = i + 1;
    while (j < argv.length) {
      const v = argv[j]!;
      if (v.startsWith("-")) break;
      items.push(v);
      j++;
    }
    return { items, next: j - 1 };
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;

    if (a === "--help" || a === "-h") {
      out.help = true;
      continue;
    }

    if (a === "--json") {
      out.json = true;
      continue;
    }

    if (a === "--prompt" || a === "-p") {
      const v = argv[++i];
      if (!v) throw new Error(`Missing value for ${a}`);
      out.prompt = v;
      continue;
    }

    if (a === "--promptfiles") {
      const { items, next } = takeMany(i);
      if (items.length === 0) throw new Error("Missing files for --promptfiles");
      out.promptFiles.push(...items);
      i = next;
      continue;
    }

    if (a === "--image") {
      const v = argv[++i];
      if (!v) throw new Error("Missing value for --image");
      out.imagePath = v;
      continue;
    }

    if (a === "--batchfile") {
      const v = argv[++i];
      if (!v) throw new Error("Missing value for --batchfile");
      out.batchFile = v;
      continue;
    }

    if (a === "--jobs") {
      const v = argv[++i];
      if (!v) throw new Error("Missing value for --jobs");
      out.jobs = parseInt(v, 10);
      if (isNaN(out.jobs) || out.jobs < 1) throw new Error(`Invalid worker count: ${v}`);
      continue;
    }

    if (a === "--provider") {
      const v = argv[++i];
      if (v !== "tuzi" && v !== "apimart") {
        throw new Error(`Invalid provider: ${v} (valid: tuzi, apimart)`);
      }
      out.provider = v;
      continue;
    }

    if (a === "--model" || a === "-m") {
      const v = argv[++i];
      if (!v) throw new Error(`Missing value for ${a}`);
      out.model = v;
      continue;
    }

    if (a === "--ar") {
      const v = argv[++i];
      if (!v) throw new Error("Missing value for --ar");
      out.aspectRatio = v;
      out.aspectRatioSource = "cli";
      continue;
    }

    if (a === "--size") {
      const v = argv[++i];
      if (!v) throw new Error("Missing value for --size");
      out.size = v;
      continue;
    }

    if (a === "--quality") {
      const v = argv[++i];
      if (v !== "normal" && v !== "2k") throw new Error(`Invalid quality: ${v}`);
      out.quality = v;
      continue;
    }

    if (a === "--imageSize") {
      const v = argv[++i]?.toUpperCase();
      if (v !== "1K" && v !== "2K" && v !== "4K") throw new Error(`Invalid imageSize: ${v}`);
      out.imageSize = v;
      out.imageSizeSource = "cli";
      continue;
    }

    if (a === "--ref" || a === "--reference") {
      const { items, next } = takeMany(i);
      if (items.length === 0) throw new Error(`Missing files for ${a}`);
      out.referenceImages.push(...items);
      i = next;
      continue;
    }

    if (a === "--n") {
      const v = argv[++i];
      if (!v) throw new Error("Missing value for --n");
      out.n = parseInt(v, 10);
      if (isNaN(out.n) || out.n < 1) throw new Error(`Invalid count: ${v}`);
      continue;
    }

    if (a.startsWith("-")) {
      throw new Error(`Unknown option: ${a}`);
    }

    positional.push(a);
  }

  if (!out.prompt && out.promptFiles.length === 0 && positional.length > 0) {
    out.prompt = positional.join(" ");
  }

  return out;
}

async function loadEnvFile(p: string): Promise<Record<string, string>> {
  try {
    const content = await readFile(p, "utf8");
    const env: Record<string, string> = {};
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx === -1) continue;
      const key = trimmed.slice(0, idx).trim();
      let val = trimmed.slice(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
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

  const homeEnv = await loadEnvFile(path.join(home, ".laoli-recipe", ".env"));
  const cwdEnv = await loadEnvFile(path.join(cwd, ".laoli-recipe", ".env"));

  for (const [k, v] of Object.entries(homeEnv)) {
    if (!process.env[k]) process.env[k] = v;
  }
  for (const [k, v] of Object.entries(cwdEnv)) {
    if (!process.env[k]) process.env[k] = v;
  }
}

export function extractYamlFrontMatter(content: string): string | null {
  const match = content.match(/^---\s*\n([\s\S]*?)\n---\s*$/m);
  return match ? match[1] : null;
}

export function parseSimpleYaml(yaml: string): Partial<ExtendConfig> {
  const config: Partial<ExtendConfig> = {};
  const lines = yaml.split("\n");
  let currentKey: string | null = null;
  let currentProvider: Provider | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    const indent = line.match(/^\s*/)?.[0].length ?? 0;
    if (!trimmed || trimmed.startsWith("#")) continue;

    if (trimmed.includes(":") && !trimmed.startsWith("-")) {
      const colonIdx = trimmed.indexOf(":");
      const key = trimmed.slice(0, colonIdx).trim();
      let value = trimmed.slice(colonIdx + 1).trim();

      if (value === "null" || value === "") {
        value = "null";
      }

      if (key === "version") {
        config.version = value === "null" ? 1 : parseInt(value, 10);
      } else if (key === "default_provider") {
        config.default_provider = value === "null" ? null : (value as Provider);
      } else if (key === "default_quality") {
        config.default_quality = value === "null" ? null : value as "normal" | "2k";
      } else if (key === "default_aspect_ratio") {
        const cleaned = value.replace(/['"]/g, "");
        config.default_aspect_ratio = cleaned === "null" ? null : cleaned;
      } else if (key === "default_image_size") {
        config.default_image_size = value === "null" ? null : value as "1K" | "2K" | "4K";
      } else if (key === "default_model") {
        config.default_model = {
          tuzi: null,
          apimart: null,
        };
        currentKey = "default_model";
        currentProvider = null;
      } else if (key === "batch") {
        config.batch = {};
        currentKey = "batch";
        currentProvider = null;
      } else if (currentKey === "batch" && indent >= 2 && key === "max_workers") {
        config.batch ??= {};
        config.batch.max_workers = value === "null" ? null : parseInt(value, 10);
      } else if (currentKey === "batch" && indent >= 2 && key === "provider_limits") {
        config.batch ??= {};
        config.batch.provider_limits ??= {};
        currentKey = "provider_limits";
        currentProvider = null;
      } else if (
        currentKey === "provider_limits" &&
        indent >= 4 &&
        (key === "tuzi" || key === "apimart")
      ) {
        config.batch ??= {};
        config.batch.provider_limits ??= {};
        config.batch.provider_limits[key] ??= {};
        currentProvider = key;
      } else if (
        currentKey === "default_model" &&
        (key === "tuzi" || key === "apimart")
      ) {
        const cleaned = value.replace(/['"]/g, "");
        config.default_model![key] = cleaned === "null" ? null : cleaned;
      } else if (
        currentKey === "provider_limits" &&
        currentProvider &&
        indent >= 6 &&
        (key === "concurrency" || key === "start_interval_ms")
      ) {
        config.batch ??= {};
        config.batch.provider_limits ??= {};
        const providerLimit = (config.batch.provider_limits[currentProvider] ??= {});
        if (key === "concurrency") {
          providerLimit.concurrency = value === "null" ? null : parseInt(value, 10);
        } else {
          providerLimit.start_interval_ms = value === "null" ? null : parseInt(value, 10);
        }
      }
    }
  }

  return config;
}

type ExtendConfigPathPair = {
  current: string;
};

function getExtendConfigPathPairs(cwd: string, home: string): ExtendConfigPathPair[] {
  return [
    {
      current: path.join(cwd, ".laoli-recipe", "laoli-imagine", "EXTEND.md"),
    },
    {
      current: path.join(home, ".laoli-recipe", "laoli-imagine", "EXTEND.md"),
    },
  ];
}

export async function loadExtendConfig(
  cwd = process.cwd(),
  home = homedir(),
): Promise<Partial<ExtendConfig>> {

  const paths = getExtendConfigPathPairs(cwd, home).map(({ current }) => current);

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

export function mergeConfig(args: CliArgs, extend: Partial<ExtendConfig>): CliArgs {
  const aspectRatio = args.aspectRatio ?? extend.default_aspect_ratio ?? null;
  const imageSize = args.imageSize ?? extend.default_image_size ?? null;
  return {
    ...args,
    provider: args.provider ?? extend.default_provider ?? null,
    providerSource:
      args.providerSource ?? (args.provider !== null ? "cli" : extend.default_provider !== null ? "config" : null),
    quality: args.quality ?? extend.default_quality ?? null,
    aspectRatio,
    aspectRatioSource:
      args.aspectRatioSource ??
      (args.aspectRatio !== null ? "cli" : (aspectRatio !== null ? "config" : null)),
    imageSize,
    imageSizeSource:
      args.imageSizeSource ??
      (args.imageSize !== null ? "cli" : (imageSize !== null ? "config" : null)),
  };
}

export function parsePositiveInt(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function parsePositiveBatchInt(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") {
    return Number.isInteger(value) && value > 0 ? value : null;
  }
  if (typeof value === "string") {
    return parsePositiveInt(value);
  }
  return null;
}

export function getConfiguredMaxWorkers(extendConfig: Partial<ExtendConfig>): number {
  const envValue = parsePositiveInt(process.env.LAOLI_IMAGE_GEN_MAX_WORKERS);
  const configValue = extendConfig.batch?.max_workers ?? null;
  return Math.max(1, envValue ?? configValue ?? DEFAULT_MAX_WORKERS);
}

export function getConfiguredProviderRateLimits(
  extendConfig: Partial<ExtendConfig>
): Record<Provider, ProviderRateLimit> {
  const configured: Record<Provider, ProviderRateLimit> = {
    tuzi: { ...DEFAULT_PROVIDER_RATE_LIMITS.tuzi },
    apimart: { ...DEFAULT_PROVIDER_RATE_LIMITS.apimart },
  };

  for (const provider of (["tuzi", "apimart"] as Provider[])) {
    const envPrefix = `LAOLI_IMAGE_GEN_${provider.toUpperCase()}`;
    const extendLimit = extendConfig.batch?.provider_limits?.[provider];
    configured[provider] = {
      concurrency:
        parsePositiveInt(process.env[`${envPrefix}_CONCURRENCY`]) ??
        extendLimit?.concurrency ??
        configured[provider].concurrency,
      startIntervalMs:
        parsePositiveInt(process.env[`${envPrefix}_START_INTERVAL_MS`]) ??
        extendLimit?.start_interval_ms ??
        configured[provider].startIntervalMs,
    };
  }

  return configured;
}

async function readPromptFromFiles(files: string[]): Promise<string> {
  const parts: string[] = [];
  for (const f of files) {
    parts.push(await readFile(f, "utf8"));
  }
  return parts.join("\n\n");
}

async function readPromptFromStdin(): Promise<string | null> {
  if (process.stdin.isTTY) return null;
  try {
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const value = Buffer.concat(chunks).toString("utf8").trim();
    return value.length > 0 ? value : null;
  } catch {
    return null;
  }
}

export function normalizeOutputImagePath(p: string, defaultExtension = ".png"): string {
  const full = path.resolve(p);
  const ext = path.extname(full);
  if (ext) return full;
  return `${full}${defaultExtension}`;
}

/**
 * 按优先级检测实际使用的 provider：
 * 1. CLI --provider（已在 mergeConfig 中合并入 args.provider）
 * 2. EXTEND.md default_provider（同上）
 * 3. API Key 数量：只有 1 个 → 用那个；2 个都配置 → 默认 tuzi
 * 注意：--model 不参与 provider 选择，避免隐式覆盖用户意图。
 */
export function detectProvider(args: CliArgs): Provider {
  if (args.provider) return args.provider; // CLI --provider 或 EXTEND.md default_provider

  const hasTuzi = !!process.env.TUZI_API_KEY;
  const hasApimart = !!process.env.APIMART_API_KEY;

  // --ref 图生图推断（仅在 provider 未被显式配置时生效）
  if (args.referenceImages.length > 0) {
    if (hasTuzi) return "tuzi";
    if (hasApimart) return "apimart";
    throw new Error(
      "Reference images require Tuzi or APIMart. Set TUZI_API_KEY or APIMART_API_KEY, or remove --ref."
    );
  }

  if (hasTuzi && !hasApimart) return "tuzi";
  if (hasApimart && !hasTuzi) return "apimart";
  if (hasTuzi && hasApimart) return "tuzi";

  throw new Error(
    "No API key found. Set TUZI_API_KEY or APIMART_API_KEY.\n" +
      "Create ~/.laoli-recipe/.env or <cwd>/.laoli-recipe/.env with your keys."
  );
}

export async function validateReferenceImages(referenceImages: string[]): Promise<void> {
  for (const refPath of referenceImages) {
    const fullPath = path.resolve(refPath);
    try {
      await access(fullPath);
    } catch {
      throw new Error(`Reference image not found: ${fullPath}`);
    }
  }
}

export function isRetryableGenerationError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  const nonRetryableMarkers = [
    "Reference image",
    "not supported",
    "only supported",
    "No API key found",
    "is required",
    "Invalid ",
    "Unexpected ",
    "API error (400)",
    "API error (401)",
    "API error (402)",
    "API error (403)",
    "API error (404)",
    "temporarily disabled",
  ];
  return !nonRetryableMarkers.some((marker) => msg.includes(marker));
}

async function loadProviderModule(provider: Provider): Promise<ProviderModule> {
  if (provider === "tuzi") return (await import("./providers/tuzi")) as ProviderModule;
  if (provider === "apimart") return (await import("./providers/apimart")) as ProviderModule;
  throw new Error(`Unknown provider: ${provider}`);
}

async function loadPromptForArgs(args: CliArgs): Promise<string | null> {
  let prompt: string | null = args.prompt;
  if (!prompt && args.promptFiles.length > 0) {
    prompt = await readPromptFromFiles(args.promptFiles);
  }
  return prompt;
}

function getModelForProvider(
  provider: Provider,
  requestedModel: string | null,
  extendConfig: Partial<ExtendConfig>,
  providerModule: ProviderModule
): string {
  if (requestedModel) return requestedModel;
  if (extendConfig.default_model) {
    if (provider === "tuzi" && extendConfig.default_model.tuzi) return extendConfig.default_model.tuzi;
    if (provider === "apimart" && extendConfig.default_model.apimart) return extendConfig.default_model.apimart;
  }
  return providerModule.getDefaultModel();
}

async function prepareSingleTask(args: CliArgs, extendConfig: Partial<ExtendConfig>): Promise<PreparedTask> {
  if (!args.quality) args.quality = "2k";

  const prompt = (await loadPromptForArgs(args)) ?? (await readPromptFromStdin());
  if (!prompt) throw new Error("Prompt is required");
  if (!args.imagePath) throw new Error("--image is required");
  if (args.referenceImages.length > 0) await validateReferenceImages(args.referenceImages);

  const provider = detectProvider(args);
  const providerModule = await loadProviderModule(provider);
  const model = getModelForProvider(provider, args.model, extendConfig, providerModule);
  providerModule.validateArgs?.(model, args);
  const defaultOutputExtension = providerModule.getDefaultOutputExtension?.(model, args) ?? ".png";

  return {
    id: "single",
    prompt,
    args,
    provider,
    model,
    outputPath: normalizeOutputImagePath(args.imagePath, defaultOutputExtension),
    providerModule,
  };
}

export async function loadBatchTasks(batchFilePath: string): Promise<LoadedBatchTasks> {
  const resolvedBatchFilePath = path.resolve(batchFilePath);
  const content = await readFile(resolvedBatchFilePath, "utf8");
  const parsed = JSON.parse(content.replace(/^\uFEFF/, "")) as BatchFile;
  const batchDir = path.dirname(resolvedBatchFilePath);
  if (Array.isArray(parsed)) {
    return {
      tasks: parsed,
      jobs: null,
      batchDir,
    };
  }
  if (parsed && typeof parsed === "object" && Array.isArray(parsed.tasks)) {
    const jobs = parsePositiveBatchInt(parsed.jobs);
    if (parsed.jobs !== undefined && parsed.jobs !== null && jobs === null) {
      throw new Error("Invalid batch file. jobs must be a positive integer when provided.");
    }
    return {
      tasks: parsed.tasks,
      jobs,
      batchDir,
    };
  }
  throw new Error("Invalid batch file. Expected an array of tasks or an object with a tasks array.");
}

export function resolveBatchPath(batchDir: string, filePath: string): string {
  return path.isAbsolute(filePath) ? filePath : path.resolve(batchDir, filePath);
}

export function createTaskArgs(baseArgs: CliArgs, task: BatchTaskInput, batchDir: string): CliArgs {
  return {
    ...baseArgs,
    prompt: task.prompt ?? null,
    promptFiles: task.promptFiles ? task.promptFiles.map((filePath) => resolveBatchPath(batchDir, filePath)) : [],
    imagePath: task.image ? resolveBatchPath(batchDir, task.image) : null,
    provider: task.provider ?? baseArgs.provider ?? null,
    providerSource: task.provider != null ? "task" : baseArgs.providerSource,
    model: task.model ?? baseArgs.model ?? null,
    aspectRatio: task.ar ?? baseArgs.aspectRatio ?? null,
    aspectRatioSource: task.ar != null ? "task" : (baseArgs.aspectRatioSource ?? null),
    size: task.size ?? baseArgs.size ?? null,
    quality: task.quality ?? baseArgs.quality ?? null,
    imageSize: task.imageSize ?? baseArgs.imageSize ?? null,
    imageSizeSource: task.imageSize != null ? "task" : (baseArgs.imageSizeSource ?? null),
    referenceImages: task.ref ? task.ref.map((filePath) => resolveBatchPath(batchDir, filePath)) : [],
    n: task.n ?? baseArgs.n,
    batchFile: null,
    jobs: baseArgs.jobs,
    json: baseArgs.json,
    help: false,
  };
}

async function prepareBatchTasks(
  args: CliArgs,
  extendConfig: Partial<ExtendConfig>
): Promise<{ tasks: PreparedTask[]; jobs: number | null }> {
  if (!args.batchFile) throw new Error("--batchfile is required in batch mode");
  const { tasks: taskInputs, jobs: batchJobs, batchDir } = await loadBatchTasks(args.batchFile);
  if (taskInputs.length === 0) throw new Error("Batch file does not contain any tasks.");

  const prepared: PreparedTask[] = [];
  for (let i = 0; i < taskInputs.length; i++) {
    const task = taskInputs[i]!;
    const taskArgs = createTaskArgs(args, task, batchDir);
    const prompt = await loadPromptForArgs(taskArgs);
    if (!prompt) throw new Error(`Task ${i + 1} is missing prompt or promptFiles.`);
    if (!taskArgs.imagePath) throw new Error(`Task ${i + 1} is missing image output path.`);
    if (taskArgs.referenceImages.length > 0) await validateReferenceImages(taskArgs.referenceImages);

    const provider = detectProvider(taskArgs);
    const providerModule = await loadProviderModule(provider);
    const model = getModelForProvider(provider, taskArgs.model, extendConfig, providerModule);
    providerModule.validateArgs?.(model, taskArgs);
    const defaultOutputExtension = providerModule.getDefaultOutputExtension?.(model, taskArgs) ?? ".png";
    prepared.push({
      id: task.id || `task-${String(i + 1).padStart(2, "0")}`,
      prompt,
      args: taskArgs,
      provider,
      model,
      outputPath: normalizeOutputImagePath(taskArgs.imagePath, defaultOutputExtension),
      providerModule,
    });
  }

  return {
    tasks: prepared,
    jobs: args.jobs ?? batchJobs,
  };
}

async function writeImage(outputPath: string, imageData: Uint8Array): Promise<void> {
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, imageData);
}

async function generatePreparedTask(task: PreparedTask): Promise<TaskResult> {
  console.error(`Using ${task.provider} / ${task.model} for ${task.id}`);
  console.error(
    `Switch model: --model <id> | EXTEND.md default_model.${task.provider} | env ${task.provider.toUpperCase()}_IMAGE_MODEL`
  );

  let attempts = 0;
  while (attempts < MAX_ATTEMPTS) {
    attempts += 1;
    try {
      const imageData = await task.providerModule.generateImage(task.prompt, task.model, task.args);
      await writeImage(task.outputPath, imageData);
      return {
        id: task.id,
        provider: task.provider,
        model: task.model,
        outputPath: task.outputPath,
        success: true,
        attempts,
        error: null,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const canRetry = attempts < MAX_ATTEMPTS && isRetryableGenerationError(error);
      if (canRetry) {
        console.error(`[${task.id}] Attempt ${attempts}/${MAX_ATTEMPTS} failed, retrying...`);
        continue;
      }
      return {
        id: task.id,
        provider: task.provider,
        model: task.model,
        outputPath: task.outputPath,
        success: false,
        attempts,
        error: message,
      };
    }
  }

  return {
    id: task.id,
    provider: task.provider,
    model: task.model,
    outputPath: task.outputPath,
    success: false,
    attempts: MAX_ATTEMPTS,
    error: "Unknown failure",
  };
}

function createProviderGate(providerRateLimits: Record<Provider, ProviderRateLimit>) {
  const state = new Map<Provider, { active: number; lastStartedAt: number }>();

  return async function acquire(provider: Provider): Promise<() => void> {
    const limit = providerRateLimits[provider];
    while (true) {
      const current = state.get(provider) ?? { active: 0, lastStartedAt: 0 };
      const now = Date.now();
      const enoughCapacity = current.active < limit.concurrency;
      const enoughGap = now - current.lastStartedAt >= limit.startIntervalMs;
      if (enoughCapacity && enoughGap) {
        state.set(provider, { active: current.active + 1, lastStartedAt: now });
        return () => {
          const latest = state.get(provider) ?? { active: 1, lastStartedAt: now };
          state.set(provider, {
            active: Math.max(0, latest.active - 1),
            lastStartedAt: latest.lastStartedAt,
          });
        };
      }
      await new Promise((resolve) => setTimeout(resolve, POLL_WAIT_MS));
    }
  };
}

export function getWorkerCount(taskCount: number, jobs: number | null, maxWorkers: number): number {
  const requested = jobs ?? Math.min(taskCount, maxWorkers);
  return Math.max(1, Math.min(requested, taskCount, maxWorkers));
}

async function runBatchTasks(
  tasks: PreparedTask[],
  jobs: number | null,
  extendConfig: Partial<ExtendConfig>
): Promise<TaskResult[]> {
  if (tasks.length === 1) {
    return [await generatePreparedTask(tasks[0]!)];
  }

  const maxWorkers = getConfiguredMaxWorkers(extendConfig);
  const providerRateLimits = getConfiguredProviderRateLimits(extendConfig);
  const acquireProvider = createProviderGate(providerRateLimits);
  const workerCount = getWorkerCount(tasks.length, jobs, maxWorkers);
  console.error(`Batch mode: ${tasks.length} tasks, ${workerCount} workers, parallel mode enabled.`);
  for (const provider of (["tuzi", "apimart"] as Provider[])) {
    const limit = providerRateLimits[provider];
    console.error(`- ${provider}: concurrency=${limit.concurrency}, startIntervalMs=${limit.startIntervalMs}`);
  }

  let nextIndex = 0;
  const results: TaskResult[] = new Array(tasks.length);

  const worker = async (): Promise<void> => {
    while (true) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      if (currentIndex >= tasks.length) return;

      const task = tasks[currentIndex]!;
      const release = await acquireProvider(task.provider);
      try {
        results[currentIndex] = await generatePreparedTask(task);
      } finally {
        release();
      }
    }
  };

  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}

function printBatchSummary(results: TaskResult[]): void {
  const successCount = results.filter((result) => result.success).length;
  const failureCount = results.length - successCount;

  console.error("");
  console.error("Batch generation summary:");
  console.error(`- Total: ${results.length}`);
  console.error(`- Succeeded: ${successCount}`);
  console.error(`- Failed: ${failureCount}`);

  if (failureCount > 0) {
    console.error("Failure reasons:");
    for (const result of results.filter((item) => !item.success)) {
      console.error(`- ${result.id}: ${result.error}`);
    }
  }
}

function emitJson(payload: unknown): void {
  console.log(JSON.stringify(payload, null, 2));
}

async function runSingleMode(args: CliArgs, extendConfig: Partial<ExtendConfig>): Promise<void> {
  const task = await prepareSingleTask(args, extendConfig);
  const result = await generatePreparedTask(task);
  if (!result.success) {
    throw new Error(result.error || "Generation failed");
  }

  if (args.json) {
    emitJson({
      savedImage: result.outputPath,
      provider: result.provider,
      model: result.model,
      attempts: result.attempts,
      prompt: task.prompt.slice(0, 200),
    });
    return;
  }

  console.log(result.outputPath);
}

async function runBatchMode(args: CliArgs, extendConfig: Partial<ExtendConfig>): Promise<void> {
  const { tasks, jobs } = await prepareBatchTasks(args, extendConfig);
  const results = await runBatchTasks(tasks, jobs, extendConfig);
  printBatchSummary(results);

  if (args.json) {
    emitJson({
      mode: "batch",
      total: results.length,
      succeeded: results.filter((item) => item.success).length,
      failed: results.filter((item) => !item.success).length,
      results,
    });
  }

  if (results.some((item) => !item.success)) {
    process.exitCode = 1;
  }
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printUsage();
    return;
  }

  await loadEnv();
  const extendConfig = await loadExtendConfig();
  const mergedArgs = mergeConfig(args, extendConfig);
  if (!mergedArgs.quality) mergedArgs.quality = "2k";

  if (mergedArgs.batchFile) {
    await runBatchMode(mergedArgs, extendConfig);
    return;
  }

  await runSingleMode(mergedArgs, extendConfig);
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
