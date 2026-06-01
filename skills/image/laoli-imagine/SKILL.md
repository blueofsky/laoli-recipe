---
name: laoli-imagine
description: 图像生成技能，AI image generation with Tuzi and APIMart APIs. Supports text-to-image, reference images, aspect ratios, and batch generation from saved prompt files. Sequential by default; use batch parallel generation when the user already has multiple prompts or wants stable multi-image throughput. Use when user asks to generate, create, or draw images.
version: 1.59.0
dependencies:
  runtime:
    - name: bun
      version: ">=1.0.0"
      optional: false
      reason: "首选脚本运行时"
    - name: npx
      version: ">=10.0.0"
      optional: true
      reason: "bun 不可用时的备选运行时"
metadata:
  openclaw:
    homepage: https://github.com/blueofsky/laoli-recipe
    requires:
      anyBins:
        - bun
        - npx
---

# Image Generation (AI SDK)

支持 Tuzi 和 APIMart 两大 provider 的图片生成。两者均为全异步（提交任务 → 轮询状态 → 下载结果）。

## User Input Tools

When this skill prompts the user, follow this tool-selection rule (priority order):

1. **Prefer built-in user-input tools** exposed by the current agent runtime — e.g., `AskUserQuestion`, `request_user_input`, `clarify`, `ask_user`, or any equivalent.
2. **Fallback**: if no such tool exists, emit a numbered plain-text message and ask the user to reply with the chosen number/answer for each question.
3. **Batching**: if the tool supports multiple questions per call, combine all applicable questions into a single call; if only single-question, ask them one at a time in priority order.

Concrete `AskUserQuestion` references below are examples — substitute the local equivalent in other runtimes.

## Script Directory

`{baseDir}` = this SKILL.md's directory. Main script: `{baseDir}/scripts/main.ts`. Resolve `${BUN_X}`: prefer `bun`; else `npx -y bun`; else suggest `brew install oven-sh/bun/bun`.

## Step 0: Load Preferences

EXTEND.md 配置文件用于设置默认值，可跳过（脚本会使用内置默认值继续执行）。

**查找路径**（按顺序，首个匹配的文件生效）：

| 路径 | Scope |
|------|-------|
| `{cwd}/.laoli-recipe/laoli-imagine/EXTEND.md` | 项目级（当前工作目录） |
| `$HOME/.laoli-recipe/laoli-imagine/EXTEND.md` | 用户级（全系统） |

**行为**：
- 找到配置 → 加载并应用默认值
- 未找到配置 → 使用内置默认值继续执行（**不会阻塞或触发 setup**）

> 注意：脚本不会自动创建 EXTEND.md。如需持久化偏好设置，请手动创建。参见 `references/config/preferences-schema.md`。

## Usage

Minimum working examples — see `references/usage-examples.md` for the full set including per-provider invocations and batch mode.

```bash
# Basic
${BUN_X} {baseDir}/scripts/main.ts --prompt "A cat" --image cat.png

# With aspect ratio and high quality
${BUN_X} {baseDir}/scripts/main.ts --prompt "A landscape" --image out.png --ar 16:9 --quality 2k

# Prompt from files
${BUN_X} {baseDir}/scripts/main.ts --promptfiles system.md content.md --image out.png

# With reference image
${BUN_X} {baseDir}/scripts/main.ts --prompt "Make blue" --image out.png --ref source.png

# Specific provider
${BUN_X} {baseDir}/scripts/main.ts --prompt "A cat" --image out.png --provider tuzi --model gpt-image-2

# Batch mode
${BUN_X} {baseDir}/scripts/main.ts --batchfile batch.json --jobs 4
```

## Options

| Option | Description |
|--------|-------------|
| `--prompt <text>`, `-p` | Prompt text |
| `--promptfiles <files...>` | Read prompt from files (concatenated) |
| `--image <path>` | Output image path (required in single-image mode) |
| `--batchfile <path>` | JSON batch file for multi-image generation |
| `--jobs <count>` | Worker count for batch mode (default: auto, max from config, built-in default 10) |
| `--provider tuzi\|apimart` | Force provider (default: auto-detect) |
| `--model <id>`, `-m` | Model ID — see `references/providers/tuzi.md` and `references/providers/apimart.md` for model lists |
| `--ar <ratio>` | Aspect ratio (`16:9`, `1:1`, `4:3`, …) |
| `--size <WxH>` | Explicit size (e.g., `1024x1024`) |
| `--quality normal\|2k` | Quality preset (default: `2k`) |
| `--imageSize 1K\|2K\|4K` | Image size (default: from quality) |
| `--ref <files...>` | Reference images. Supported by Tuzi multimodal and APIMart (GPT-Image-2, Gemini, Seedream) |
| `--n <count>` | Number of images (default: 1) |
| `--json` | JSON output |

## Environment Variables

| Variable | Description |
|----------|-------------|
| `TUZI_API_KEY` | Tuzi API key |
| `APIMART_API_KEY` | APIMart API key |
| `TUZI_IMAGE_MODEL` | Default Tuzi model (default: `gpt-image-2`; 异步模型不受此变量控制) |
| `APIMART_IMAGE_MODEL` | Default APIMart model (gpt-image-2) |
| `TUZI_BASE_URL` | Custom Tuzi endpoint |
| `APIMART_BASE_URL` | Custom APIMart endpoint (default: https://api.apimart.ai/v1) |
| `LAOLI_IMAGE_GEN_MAX_WORKERS` | Override batch worker cap |
| `LAOLI_IMAGE_GEN_<PROVIDER>_CONCURRENCY` | Per-provider concurrency (e.g., `LAOLI_IMAGE_GEN_APIMART_CONCURRENCY`) |
| `LAOLI_IMAGE_GEN_<PROVIDER>_START_INTERVAL_MS` | Per-provider start-gap |

**Load priority**: CLI args > process.env > `~/.laoli-recipe/.env` > `<cwd>/.laoli-recipe/.env` (EXTEND.md is loaded separately)

## Model Resolution

Priority (highest → lowest):

1. CLI flag `--model <id>`
2. EXTEND.md `default_model.[provider]`
3. Env var `<PROVIDER>_IMAGE_MODEL`
4. Built-in default

**Display model info before each generation**:

- `Using [provider] / [model]`
- `Switch model: --model <id> | EXTEND.md default_model.[provider] | env <PROVIDER>_IMAGE_MODEL`

## Provider-Specific Guides

| Provider | Reference |
|----------|-----------|
| Tuzi (gpt-image-2, subject-reference character workflow) | Gemini 原生 API，详见 `references/providers/tuzi.md` |
| APIMart (GPT-Image-2, Gemini, Seedream, Grok Imagine, Wan) | OpenAI 兼容网关，详见 `references/providers/apimart.md` |

## Provider Selection

按以下优先级检测：

1. **CLI `--provider`** → 最高优先级，显式指定即使用
2. **EXTEND.md `default_provider`** → 其次，用户明确配置
3. **`--ref` 参考图**（隐式推断）：两者都支持，按 `tuzi` → `apimart` 优先
4. **API Key 数量**（兜底）：
   - 只有 `TUZI_API_KEY` → `tuzi`
   - 只有 `APIMART_API_KEY` → `apimart`
   - 两个都有 → `tuzi`（默认优先级）

> **为什么 `--ref` 不优先于 `default_provider`？** `--ref` 只是根据"多模态支持更好"的启发式推断，不应覆盖用户在 EXTEND.md 中的显式配置。如果传了 `--ref` 且用户没有明确配置 provider，默认走 `--ref` 推断；有明确配置则尊重配置。

## Quality Presets

| Preset | imageSize | Use case |
|--------|-----------|----------|
| `normal` | 1K | Quick previews |
| `2k` (default) | 2K | Covers, illustrations, infographics |

## Aspect Ratios

Supported: `1:1`, `16:9`, `9:16`, `4:3`, `3:4`, `2.35:1`.

- Tuzi: `imageConfig.aspectRatio`
- APIMart: `size` field; 4K resolution has limited aspect ratio support for GPT-Image-2

## Generation Mode

**Default**: sequential. **Batch parallel**: enabled automatically when `--batchfile` contains 2+ pending tasks.

> **生成 batch.json 前请务必查阅 `references/batch-schema.md`**，其中包含完整的字段定义、可行值和常见错误对照。

| Situation | Prefer | Why |
|-----------|--------|-----|
| One image, or 1-2 simple images | Sequential | Lower coordination overhead, easier debugging |
| Multiple images with saved prompt files | Batch (`--batchfile`) | Reuses finalized prompts, applies shared throttling/retries, predictable throughput |
| Each image still needs its own reasoning / prompt writing / style exploration | Subagents | Work is still exploratory, each needs independent analysis |
| Input is `outline.md` + `prompts/` (e.g. from `laoli-article-illustrator`) | Batch — use `scripts/build-batch.ts` to assemble the payload | The outline + prompt files already contain everything needed |

Rule of thumb: once prompt files are saved and the task is "generate all of these", prefer batch over subagents. Use subagents only when generation is coupled with per-image thinking or divergent creative exploration.

**Parallel behavior**:

- Default worker count is automatic, capped by config, built-in default 10
- Provider-specific throttling applies only in batch mode; defaults are tuned for throughput while avoiding RPM bursts
- Override with `--jobs <count>`
- Each image retries up to 3 attempts
- Final output includes success count, failure count, and per-image failure reasons

## Error Handling

- Missing API key → error with setup instructions
- Generation failure → auto-retry up to 3 attempts per image
- Invalid aspect ratio → warning, proceed with default
- Reference images with unsupported provider → error with fix hint

## References

| File | Content |
|------|---------|
| `references/batch-schema.md` | **Batch JSON 完整 schema — AI 生成 batch.json 前必读** |
| `references/usage-examples.md` | Extended CLI examples across providers and batch mode |
| `references/providers/apimart.md` | APIMart supported models, sizes, limits |
| `references/providers/tuzi.md` | Tuzi supported models and usage |
| `references/config/preferences-schema.md` | EXTEND.md schema (manual creation guide) |

## Extension Support

Custom configurations via EXTEND.md. See Step 0 for paths and schema.

> **Manual Setup**: If you want to persist preferences, create EXTEND.md manually at one of the paths above. See `references/config/preferences-schema.md` for the schema.
