import path from "node:path"
import process from "node:process"
import { homedir } from "node:os"
import { access, mkdir, readFile, writeFile, unlink, rm } from "node:fs/promises"
import type { CliArgs, ExtendConfig, Provider } from "./types"
import { isNetworkError } from "./shared"

function printUsage(): void {
  console.log(`用法:
  npx -y bun scripts/main.ts --prompt "一只猫在走路" --video cat.mp4
  npx -y bun scripts/main.ts --promptfiles prompt.md --video out.mp4 --model veo3
  npx -y bun scripts/main.ts --prompt "..." --video long.mp4 --segments 3

选项:
  -p, --prompt <text>              提示词文本
  --promptfiles <files...>         从文件读取提示词（多文件拼接）
  --video <path>                   输出视频路径（必填）
  --provider tuzi|apimart          Provider（默认自动检测）
  -m, --model <id>                 模型 ID
  -s, --seconds <n>                时长（秒）
  --size <WxH>                     尺寸（如 1280x720、16x9）
  --resolution <p>                 分辨率（如 480p、720p、1080p、4k）
  --ref <files...>                 参考图片
  --ref-mode reference|frames|components|last_frame  参考图模式
  --segments <n>                   长视频段数
  --segment-prompts <files...>     每段独立提示词文件
  --audio                          生成音频（仅 Seedance 2.0 支持）
  --cleanup                        合并后清理分段视频
  --reencode                       合并时重新编码（避免衔接黑帧）
  --json                           JSON 输出
  -h, --help                       显示帮助

Provider 与模型:
  apimart: doubao-seedance-1-0-pro-fast, doubao-seedance-2.0-fast, veo3.1-fast, sora-2-preview, ...
  tuzi:    veo3.1, kling-v1-6, ...

环境变量:
  APIMART_API_KEY                  APIMart API 密钥（https://apimart.ai/keys）
  APIMART_VIDEO_MODEL              默认 APIMart 视频模型
  APIMART_BASE_URL                 自定义 APIMart 端点
  TUZI_API_KEY                     Tuzi API 密钥（https://api.tu-zi.com）
  TUZI_VIDEO_MODEL                 默认 Tuzi 视频模型
  TUZI_BASE_URL                    自定义 Tuzi 端点

加载优先级: 命令行参数 > EXTEND.md > 环境变量 > <cwd>/.laoli-recipe/.env > ~/.laoli-recipe/.env`)
}

function parseArgs(argv: string[]): CliArgs {
  const out: CliArgs = {
    prompt: null,
    promptFiles: [],
    videoPath: null,
    provider: null,
    model: null,
    seconds: null,
    size: null,
    resolution: null,
    referenceImages: [],
    refMode: null,
    segments: null,
    segmentPrompts: [],
    audio: false,
    cleanup: false,
    reencode: false,
    json: false,
    help: false,
  }

  const positional: string[] = []

  const takeMany = (i: number): { items: string[]; next: number } => {
    const items: string[] = []
    let j = i + 1
    while (j < argv.length) {
      const v = argv[j]!
      if (v.startsWith("-")) break
      items.push(v)
      j++
    }
    return { items, next: j - 1 }
  }

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!

    if (a === "--help" || a === "-h") { out.help = true; continue }
    if (a === "--json") { out.json = true; continue }
    if (a === "--audio") { out.audio = true; continue }
    if (a === "--cleanup") { out.cleanup = true; continue }
    if (a === "--reencode") { out.reencode = true; continue }

    if (a === "--prompt" || a === "-p") {
      const v = argv[++i]
      if (!v) throw new Error(`缺少 ${a} 的值`)
      out.prompt = v
      continue
    }

    if (a === "--promptfiles") {
      const { items, next } = takeMany(i)
      if (items.length === 0) throw new Error("--promptfiles 缺少文件参数")
      out.promptFiles.push(...items)
      i = next
      continue
    }

    if (a === "--video") {
      const v = argv[++i]
      if (!v) throw new Error("缺少 --video 的值")
      out.videoPath = v
      continue
    }

    if (a === "--provider") {
      const v = argv[++i]
      if (v !== "tuzi" && v !== "apimart") {
        throw new Error(`无效的 provider: ${v}（有效值: tuzi, apimart）`)
      }
      out.provider = v
      continue
    }

    if (a === "--model" || a === "-m") {
      const v = argv[++i]
      if (!v) throw new Error(`缺少 ${a} 的值`)
      out.model = v
      continue
    }

    if (a === "--seconds" || a === "-s") {
      const v = argv[++i]
      if (!v) throw new Error(`缺少 ${a} 的值`)
      const n = parseInt(v, 10)
      if (isNaN(n) || n <= 0) throw new Error(`无效的时长: ${v}（必须为正整数）`)
      out.seconds = n
      continue
    }

    if (a === "--size") {
      const v = argv[++i]
      if (!v) throw new Error("缺少 --size 的值")
      out.size = v
      continue
    }

    if (a === "--resolution") {
      const v = argv[++i]
      if (!v) throw new Error("缺少 --resolution 的值")
      out.resolution = v
      continue
    }

    if (a === "--ref" || a === "--reference") {
      const { items, next } = takeMany(i)
      if (items.length === 0) throw new Error(`缺少 ${a} 的文件参数`)
      out.referenceImages.push(...items)
      i = next
      continue
    }

    if (a === "--ref-mode") {
      const v = argv[++i]
      if (v !== "reference" && v !== "frames" && v !== "components" && v !== "last_frame") throw new Error(`无效的 ref-mode: ${v}`)
      out.refMode = v
      continue
    }

    if (a === "--segments") {
      const v = argv[++i]
      if (!v) throw new Error("缺少 --segments 的值")
      out.segments = parseInt(v, 10)
      if (isNaN(out.segments) || out.segments < 2) throw new Error(`无效的段数: ${v}（最少 2 段）`)
      continue
    }

    if (a === "--segment-prompts") {
      const { items, next } = takeMany(i)
      if (items.length === 0) throw new Error("--segment-prompts 缺少文件参数")
      out.segmentPrompts.push(...items)
      i = next
      continue
    }

    if (a.startsWith("-")) throw new Error(`未知选项: ${a}`)
    positional.push(a)
  }

  if (!out.prompt && out.promptFiles.length === 0 && positional.length > 0) {
    out.prompt = positional.join(" ")
  }

  return out
}

async function loadEnvFile(p: string): Promise<Record<string, string>> {
  try {
    const content = await readFile(p, "utf8")
    const env: Record<string, string> = {}
    for (const line of content.split("\n")) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith("#")) continue
      const idx = trimmed.indexOf("=")
      if (idx === -1) continue
      const key = trimmed.slice(0, idx).trim()
      let val = trimmed.slice(idx + 1).trim()
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1)
      }
      env[key] = val
    }
    return env
  } catch {
    return {}
  }
}

async function loadEnv(): Promise<void> {
  const home = homedir()
  const cwd = process.cwd()
  const homeEnv = await loadEnvFile(path.join(home, ".laoli-recipe", ".env"))
  const cwdEnv = await loadEnvFile(path.join(cwd, ".laoli-recipe", ".env"))
  for (const [k, v] of Object.entries(homeEnv)) {
    if (!process.env[k]) process.env[k] = v
  }
  for (const [k, v] of Object.entries(cwdEnv)) {
    if (!process.env[k]) process.env[k] = v
  }
}

function extractYamlFrontMatter(content: string): string | null {
  const match = content.match(/^---\s*\n([\s\S]*?)\n---\s*$/m)
  return match ? match[1] : null
}

/**
 * 简易 YAML 解析器，仅支持 EXTEND.md 中的扁平+一层嵌套结构。
 * 局限性：不支持多行值、值中包含冒号等复杂情况。
 */
function parseSimpleYaml(yaml: string): Partial<ExtendConfig> {
  const config: Partial<ExtendConfig> = {
    default_model: { tuzi: null, apimart: null },
  }
  let currentKey: string | null = null

  for (const line of yaml.split("\n")) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const indent = line.match(/^\s*/)?.[0].length ?? 0

    if (trimmed.includes(":") && !trimmed.startsWith("-")) {
      const colonIdx = trimmed.indexOf(":")
      const key = trimmed.slice(0, colonIdx).trim()
      let value = trimmed.slice(colonIdx + 1).trim()

      if (value === "null" || value === "") {
        value = "null"
      }

      // 剥离 YAML 值的外层引号（" 或 '）
      const cleanedValue = value.replace(/^["']|["']$/g, "")

      if (key === "version") {
        config.version = cleanedValue === "null" ? 1 : parseInt(cleanedValue, 10)
      } else if (key === "default_provider") {
        config.default_provider = cleanedValue === "null" ? null : (cleanedValue as Provider)
      } else if (key === "default_seconds") {
        config.default_seconds = cleanedValue === "null" ? null : cleanedValue
      } else if (key === "default_size") {
        config.default_size = cleanedValue === "null" ? null : cleanedValue
      } else if (key === "default_resolution") {
        config.default_resolution = cleanedValue === "null" ? null : cleanedValue
      } else if (key === "default_model") {
        config.default_model = { tuzi: null, apimart: null }
        currentKey = "default_model"
      } else if (currentKey === "default_model" && indent >= 2 && (key === "tuzi" || key === "apimart")) {
        const cleaned = value.replace(/['"]/g, "")
        config.default_model![key] = cleaned === "null" ? null : cleaned
      }
    }
  }
  return config
}

async function loadExtendConfig(): Promise<Partial<ExtendConfig>> {
  const home = homedir()
  const cwd = process.cwd()
  const paths = [
    path.join(cwd, ".laoli-recipe", "laoli-videoize", "EXTEND.md"),
    path.join(home, ".laoli-recipe", "laoli-videoize", "EXTEND.md"),
  ]
  for (const p of paths) {
    try {
      const content = await readFile(p, "utf8")
      const yaml = extractYamlFrontMatter(content)
      if (!yaml) continue
      return parseSimpleYaml(yaml)
    } catch {
      continue
    }
  }
  return {}
}

function mergeConfig(args: CliArgs, extend: Partial<ExtendConfig>): CliArgs {
  return {
    ...args,
    provider: args.provider ?? extend.default_provider ?? null,
    // model 不在此处合并 EXTEND.md default_model，由 getModelForProvider 统一处理
    model: args.model ?? null,
    seconds: args.seconds ?? (extend.default_seconds != null ? parseInt(extend.default_seconds, 10) : null),
    size: args.size ?? extend.default_size ?? null,
    resolution: args.resolution ?? extend.default_resolution ?? null,
  }
}

function inferProviderFromModel(model: string | null): Provider | null {
  if (!model) return null
  const m = model.toLowerCase()

  // APIMart 独有模型（更具体的匹配优先）
  if (
    m.includes("doubao") ||
    m.includes("seedance") ||
    m === "veo3.1-fast" ||
    m.includes("sora")
  ) {
    return "apimart"
  }

  // Tuzi 独有模型
  if (m === "veo3.1" || m.includes("kling")) {
    return "tuzi"
  }

  // 通用 veo3 前缀（如未来新版本），有 APIMart key 优先 apimart
  if (m.includes("veo3")) {
    return "apimart"
  }

  return null
}

function detectProvider(args: CliArgs): Provider {
  if (args.provider) return args.provider

  const hasTuzi = !!process.env.TUZI_API_KEY
  const hasApimart = !!process.env.APIMART_API_KEY

  // Infer from explicit --model if present
  const inferred = inferProviderFromModel(args.model)
  if (inferred === "apimart" && hasApimart) return "apimart"
  if (inferred === "tuzi" && hasTuzi) return "tuzi"

  if (hasApimart && !hasTuzi) return "apimart"
  if (hasTuzi && !hasApimart) return "tuzi"
  if (hasTuzi && hasApimart) return "apimart" // Prefer APIMart as default

  throw new Error(
    "未找到 API Key。请设置 APIMART_API_KEY 或 TUZI_API_KEY。\n" +
      "创建 ~/.laoli-recipe/.env 或 <cwd>/.laoli-recipe/.env 文件配置密钥。"
  )
}

function getModelForProvider(
  provider: Provider,
  requestedModel: string | null,
  extendConfig: Partial<ExtendConfig>,
  providerModule: { getDefaultModel: () => string }
): string {
  if (requestedModel) return requestedModel
  if (extendConfig.default_model) {
    if (provider === "tuzi" && extendConfig.default_model.tuzi) return extendConfig.default_model.tuzi
    if (provider === "apimart" && extendConfig.default_model.apimart) return extendConfig.default_model.apimart
  }
  return providerModule.getDefaultModel()
}

async function readPromptFromFiles(files: string[]): Promise<string> {
  const parts: string[] = []
  for (const f of files) {
    parts.push(await readFile(f, "utf8"))
  }
  return parts.join("\n\n")
}

async function readPromptFromStdin(): Promise<string | null> {
  if (process.stdin.isTTY) return null
  try {
    const t = await Bun.stdin.text()
    const v = t.trim()
    return v.length > 0 ? v : null
  } catch {
    return null
  }
}

function normalizeOutputPath(p: string): string {
  const full = path.resolve(p)
  const ext = path.extname(full)
  if (ext) return full
  return `${full}.mp4`
}

async function validateReferenceImages(refs: string[]): Promise<void> {
  for (const r of refs) {
    if (r.startsWith("http://") || r.startsWith("https://")) continue
    try {
      await access(path.resolve(r))
    } catch {
      throw new Error(`参考图片未找到: ${path.resolve(r)}`)
    }
  }
}

async function checkFfmpeg(): Promise<boolean> {
  try {
    const proc = Bun.spawn(["ffmpeg", "-version"], { stdout: "pipe", stderr: "pipe" })
    await proc.exited
    return proc.exitCode === 0
  } catch {
    return false
  }
}

async function extractLastFrame(videoPath: string, outputPath: string): Promise<void> {
  const proc = Bun.spawn(
    ["ffmpeg", "-y", "-sseof", "-0.1", "-i", videoPath, "-frames:v", "1", outputPath],
    { stdout: "pipe", stderr: "pipe" }
  )
  const exitCode = await proc.exited
  if (exitCode !== 0) {
    const err = await new Response(proc.stderr).text()
    throw new Error(`ffmpeg 提取尾帧失败: ${err}`)
  }
}

async function concatVideos(segments: string[], outputPath: string, reencode: boolean): Promise<void> {
  const tmpDir = path.dirname(outputPath)
  const listFile = path.join(tmpDir, ".concat-list.txt")
  const lines = segments.map((s) => `file '${s}'`).join("\n")
  await writeFile(listFile, lines)

  const args = reencode
    ? ["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", listFile, "-c:v", "libx264", "-c:a", "aac", outputPath]
    : ["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", listFile, "-c", "copy", outputPath]

  const proc = Bun.spawn(args, { stdout: "pipe", stderr: "pipe" })
  const exitCode = await proc.exited
  await unlink(listFile).catch(() => {})
  if (exitCode !== 0) {
    const err = await new Response(proc.stderr).text()
    throw new Error(`ffmpeg 合并失败: ${err}`)
  }
}

/**
 * 通用视频生成逻辑（修复 #6：消除重复的代码）
 *
 * 重试策略：视频生成很贵，只在确认是网络错误时重试（网络错误意味着请求根本没到达服务端，不会产生计费）。
 * 其他所有错误（API 参数错误、内容审核拒绝、服务端错误、下载失败等）一律直接报错，让用户检查后手动重试。
 */
async function generateWithRetry(
  generateVideo: (prompt: string, model: string, args: CliArgs, opts: { taskId?: string }) => Promise<Uint8Array | { data: Uint8Array; taskId: string }>,
  prompt: string,
  model: string,
  args: CliArgs,
  provider: Provider
): Promise<{ data: Uint8Array; taskId: string | undefined }> {
  // 跟踪已提交任务的 taskId，供重试时恢复（避免重复提交新任务）
  let currentTaskId: string | undefined

  // 提交并等待结果的内部函数，提交成功后自动记录 taskId
  async function attempt(taskId?: string): Promise<{ data: Uint8Array; taskId: string | undefined }> {
    const genOpts = provider === "apimart" && taskId ? { taskId } : {}
    const result = await generateVideo(prompt, model, args, genOpts)
    const data = result instanceof Uint8Array ? result : result.data
    const returnedTaskId = result instanceof Uint8Array ? undefined : result.taskId
    if (returnedTaskId && !currentTaskId) currentTaskId = returnedTaskId
    return { data, taskId: returnedTaskId ?? currentTaskId }
  }

  try {
    return await attempt()
  } catch (e) {
    // 严格判断：只有网络错误才重试（请求没到达服务端，不会产生费用）
    if (!isNetworkError(e)) {
      // 非网络错误直接报错，让用户检查原因
      console.error(`视频生成失败（非网络错误，不会自动重试）: ${e instanceof Error ? e.message : e}`)
      throw e
    }
    // 网络错误：重试一次，带上已有的 taskId 恢复任务
    console.error(`网络错误，正在重试 (taskId=${currentTaskId ?? "无"})...: ${e instanceof Error ? e.message : e}`)
    try {
      return await attempt(currentTaskId)
    } catch (e2) {
      console.error(`重试也失败: ${e2 instanceof Error ? e2.message : e2}`)
      throw e2
    }
  }
}

function getFfmpegInstallHint(): string {
  const platform = process.platform
  if (platform === "darwin") return "  macOS: brew install ffmpeg"
  if (platform === "win32") return "  Windows: winget install ffmpeg 或 choco install ffmpeg"
  return "  Ubuntu/Debian: sudo apt install ffmpeg\n  CentOS/RHEL: sudo yum install ffmpeg"
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))

  if (args.help) {
    printUsage()
    return
  }

  await loadEnv()
  const extendConfig = await loadExtendConfig()
  const mergedArgs = mergeConfig(args, extendConfig)

  let lastTaskId: string | undefined

  let prompt: string | null = mergedArgs.prompt
  if (!prompt && mergedArgs.promptFiles.length > 0) prompt = await readPromptFromFiles(mergedArgs.promptFiles)
  if (!prompt) prompt = await readPromptFromStdin()

  const hasSegmentPrompts = mergedArgs.segmentPrompts.length > 0

  if (!prompt && !hasSegmentPrompts) {
    console.error("错误: 提示词不能为空（使用 --prompt、--promptfiles 或 --segment-prompts）")
    printUsage()
    process.exitCode = 1
    return
  }

  if (!mergedArgs.videoPath) {
    console.error("错误: --video 参数必填")
    printUsage()
    process.exitCode = 1
    return
  }

  if (mergedArgs.referenceImages.length > 0) {
    await validateReferenceImages(mergedArgs.referenceImages)
  }

  const tuziModule = await import("./providers/tuzi")
  const apimartModule = await import("./providers/apimart")

  // Detect provider and select module
  const provider = detectProvider(mergedArgs)
  const providerModule = provider === "apimart" ? apimartModule : tuziModule

  // Get model for the selected provider
  const model = getModelForProvider(provider, mergedArgs.model, extendConfig, providerModule)

  console.log(`Using ${provider}: ${model}`)
  console.log(`Switch provider: --provider tuzi|apimart | EXTEND.md default_provider`)
  console.log(`Switch model: --model <id> | EXTEND.md default_model.${provider} | env ${provider.toUpperCase()}_VIDEO_MODEL`)

  const generateVideo = providerModule.generateVideo
  const outputPath = normalizeOutputPath(mergedArgs.videoPath)

  if (mergedArgs.segments && mergedArgs.segments >= 2) {
    const hasFfmpeg = await checkFfmpeg()
    if (!hasFfmpeg) {
      console.error(`错误: 长视频模式需要 ffmpeg。请安装 ffmpeg 后重试。\n${getFfmpegInstallHint()}`)
      process.exitCode = 1
      return
    }

    const segDir = path.join(path.dirname(outputPath), "segments")
    await mkdir(segDir, { recursive: true })

    const segPaths: string[] = []
    const n = mergedArgs.segments

    for (let i = 0; i < n; i++) {
      let segPrompt: string | null = null
      if (mergedArgs.segmentPrompts[i]) {
        segPrompt = await readFile(mergedArgs.segmentPrompts[i]!, "utf8")
      } else {
        segPrompt = prompt
      }

      if (!segPrompt) {
        console.error(`错误: 第 ${i + 1} 段缺少提示词（需要 --prompt 或对应的 --segment-prompts）`)
        process.exitCode = 1
        return
      }

      const segArgs: CliArgs = { ...mergedArgs }

      if (i === 0) {
        // 第 1 段保持用户原始的参考图片
      } else if (i > 0 && segPaths.length > 0) {
        // 第 2+ 段：使用前一段尾帧作为参考
        const lastFramePath = path.join(segDir, `frame-${i - 1}.png`)
        try {
          await extractLastFrame(segPaths[i - 1]!, lastFramePath)
          segArgs.referenceImages = [lastFramePath]
          segArgs.refMode = segArgs.refMode || "frames"
        } catch (e) {
          console.error(`警告: 提取第 ${i} 段尾帧失败，跳过首帧参考: ${e instanceof Error ? e.message : e}`)
        }
      }

      const segPath = path.join(segDir, `seg-${String(i + 1).padStart(2, "0")}.mp4`)
      console.log(`\n生成第 ${i + 1}/${n} 段...`)

      const { data, taskId: segTaskId } = await generateWithRetry(generateVideo, segPrompt, model, segArgs, provider)
      if (segTaskId) lastTaskId = segTaskId

      await writeFile(segPath, data)
      segPaths.push(segPath)
      console.log(`第 ${i + 1}/${n} 段完成`)
    }

    console.log("\n正在合并视频...")
    const dir = path.dirname(outputPath)
    await mkdir(dir, { recursive: true })
    await concatVideos(segPaths, outputPath, mergedArgs.reencode)

    if (mergedArgs.cleanup) {
      console.log("正在清理分段视频...")
      await rm(segDir, { recursive: true, force: true })
      console.log("分段视频已清理。")
    } else {
      console.log(`合并完成。分段视频保留在: ${segDir}（使用 --cleanup 可自动清理）`)
    }
  } else {
    if (!prompt) {
      console.error("错误: 单视频模式需要 --prompt 或 --promptfiles")
      process.exitCode = 1
      return
    }

    const { data, taskId } = await generateWithRetry(generateVideo, prompt, model, mergedArgs, provider)
    lastTaskId = taskId

    const dir = path.dirname(outputPath)
    await mkdir(dir, { recursive: true })
    await writeFile(outputPath, data)
  }

  if (mergedArgs.json) {
    console.log(JSON.stringify({ savedVideo: outputPath, provider, model, prompt: (prompt ?? "").slice(0, 200), taskId: lastTaskId }, null, 2))
  } else {
    console.log(outputPath)
  }
}

main().catch((e) => {
  const msg = e instanceof Error ? e.message : String(e)
  console.error(msg)
  process.exit(1)
})
