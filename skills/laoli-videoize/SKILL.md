---
name: laoli-videoize
description: 视频生成技能。支持 APIMart (VEO3, Sora, Doubao Seedance) 和 Tuzi (VEO3.1, Kling) 多 Provider，单视频和长视频（多段合成）模式。当用户要求生成视频、创建视频或需要视频生成后端时使用。
version: 1.59.0
dependencies:
  runtime:
    - name: bun
      version: ">=1.0.0"
      optional: false
      reason: "脚本运行时"
  env:
    - name: APIMART_API_KEY
      reason: "APIMart API 密钥（推荐，支持多厂商）"
    - name: TUZI_API_KEY
      reason: "Tuzi API 密钥（备用）"
  skills:
    - name: laoli-imagine
      version: ">=1.57.0"
      optional: true
      reason: "可选的图片生成后端（如需生成视频封面）"
---

# Video Generation (Multi-Provider)

APIMart 和 Tuzi 双 Provider 支持。默认 Provider: APIMart。

## Script Directory

**Agent Execution**:
1. `SKILL_DIR` = this SKILL.md file's directory
2. Script path = `${SKILL_DIR}/scripts/main.ts`

## Step 0: Load Preferences ⛔ BLOCKING

**CRITICAL**: This step MUST complete BEFORE any video generation. Do NOT skip or defer.

### 0.1 Check API Key

```bash
# Check APIMart first (recommended)
echo "${APIMART_API_KEY:-not_set}"
grep -s APIMART_API_KEY .laoli-recipe/.env "$HOME/.laoli-recipe/.env"

# Fallback to Tuzi
echo "${TUZI_API_KEY:-not_set}"
grep -s TUZI_API_KEY .laoli-recipe/.env "$HOME/.laoli-recipe/.env"
```

| Result | Action |
|--------|--------|
| Key found | Continue to Step 0.2 |
| Key NOT found | ⛔ Run API key setup (see [references/config/first-time-setup.md](references/config/first-time-setup.md)) → Store key → Then continue |

### 0.2 Check EXTEND.md

```bash
test -f .laoli-recipe/laoli-videoize/EXTEND.md && echo "project"
test -f "$HOME/.laoli-recipe/laoli-videoize/EXTEND.md" && echo "user"
```

| Result | Action |
|--------|--------|
| Found | Load, parse, apply settings |
| Not found | ⛔ Run first-time setup ([references/config/first-time-setup.md](references/config/first-time-setup.md)) → Save EXTEND.md → Then continue |

| Path | Location |
|------|----------|
| `.laoli-recipe/laoli-videoize/EXTEND.md` | Project directory |
| `$HOME/.laoli-recipe/laoli-videoize/EXTEND.md` | User home |

**EXTEND.md Supports**: `default_provider` | `default_model.{provider}` | `default_seconds` | `default_size` | `default_resolution`

Schema: `references/config/preferences-schema.md`

## Usage

```bash
# Single video (uses APIMart by default)
npx -y bun ${SKILL_DIR}/scripts/main.ts --prompt "A cat walking in a garden" --video cat.mp4

# Force specific provider
npx -y bun ${SKILL_DIR}/scripts/main.ts --provider tuzi --prompt "城市夜景" --video city.mp4

# With model and duration
npx -y bun ${SKILL_DIR}/scripts/main.ts --prompt "城市夜景延时" --video city.mp4 --model doubao-seedance-1-0-pro-fast --seconds 8

# With resolution
npx -y bun ${SKILL_DIR}/scripts/main.ts --prompt "城市夜景" --video city.mp4 --resolution 1080p

# With audio (Seedance 2.0 only)
npx -y bun ${SKILL_DIR}/scripts/main.ts --prompt "城市夜景" --video city.mp4 --model doubao-seedance-2.0-fast --audio

# With reference image
npx -y bun ${SKILL_DIR}/scripts/main.ts --prompt "Animate this scene" --video out.mp4 --ref source.png

# From prompt file
npx -y bun ${SKILL_DIR}/scripts/main.ts --promptfiles prompt.md --video out.mp4

# Long video (multi-segment with ffmpeg concat)
npx -y bun ${SKILL_DIR}/scripts/main.ts --prompt "A journey through seasons" --video long.mp4 --segments 3

# Long video with cleanup and reencode
npx -y bun ${SKILL_DIR}/scripts/main.ts --prompt "A journey" --video long.mp4 --segments 3 --cleanup --reencode

# Long video with per-segment prompts
npx -y bun ${SKILL_DIR}/scripts/main.ts --video long.mp4 --segments 3 --segment-prompts seg1.md seg2.md seg3.md
```

## Options

| Option | Description |
|--------|-------------|
| `--prompt <text>`, `-p` | Prompt text |
| `--promptfiles <files...>` | Read prompt from files (concatenated) |
| `--video <path>` | Output video path (required) |
| `--provider tuzi\|apimart` | Force provider (default: auto-detect) |
| `--model <id>`, `-m` | Model ID |
| `--seconds <n>`, `-s` | Duration in seconds |
| `--size <WxH>` | Video size (e.g., `1280x720`, `16x9`) |
| `--resolution <p>` | Resolution (e.g., `480p`, `720p`, `1080p`, `4k`) |
| `--ref <files...>` | Reference images |
| `--ref-mode reference\|frames\|components\|last_frame` | Reference image mode |
| `--segments <n>` | Long video segment count (min 2) |
| `--segment-prompts <files...>` | Per-segment prompt files |
| `--audio` | Generate audio (Seedance 2.0 only) |
| `--cleanup` | Remove segment files after concat |
| `--reencode` | Re-encode when concatenating (avoids black frames at joints) |
| `--json` | JSON output |

## Providers & Models

### APIMart (推荐)

| Model | Duration | Sizes | Resolution |
|-------|----------|-------|------------|
| `doubao-seedance-1-0-pro-fast` | 5s (2-12s) | 16:9, 9:16, 1:1, 4:3, 3:4, 21:9 | 480p, 720p, 1080p |
| `doubao-seedance-1-5-pro` | 5s (4-12s) | 16:9, 9:16, 1:1, 4:3, 3:4, 21:9 | 480p, 720p, 1080p |
| `doubao-seedance-2.0-fast` | 5s (4-15s) | 16:9, 9:16, 1:1, 4:3, 3:4, 21:9 | 480p, 720p, 1080p |
| `veo3.1-lite` | 8s | 16:9, 9:16 | 720p, 1080p, 4k |
| `veo3.1-fast` | 8s | 16:9, 9:16 | 720p, 1080p, 4k |
| `sora-2-preview` | 4/8/12s (仅支持这三个值) | 16:9, 9:16 | 480p, 720p, 1080p |

> **默认模型**: `doubao-seedance-1-0-pro-fast`
> **音频生成**: 仅 `doubao-seedance-2.0-fast` 支持 `--audio`

### Tuzi

| Model | Duration | Sizes |
|-------|----------|-------|
| `veo3.1` | 8s | 16:9, 9:16 |
| `kling-v1-6` | 5/10s | 16:9, 9:16, 1:1 |

## Long Video Mode

When `--segments N` is specified (N >= 2):

1. Generates N video segments sequentially
2. After each segment, extracts last frame via ffmpeg
3. Last frame becomes next segment's reference image (continuity)
4. All segments concatenated via `ffmpeg -f concat`
5. With `--cleanup`, segment files are removed after successful concat
6. With `--reencode`, ffmpeg re-encodes during concat to avoid black frames at joints

**Requirements**: ffmpeg must be installed.

**Per-segment prompts**: Use `--segment-prompts` to provide individual prompt files for each segment. If fewer files than segments, remaining segments use the main `--prompt`.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `APIMART_API_KEY` | APIMart API key (https://apimart.ai/keys) |
| `APIMART_VIDEO_MODEL` | Default APIMart model (default: doubao-seedance-1-0-pro-fast) |
| `APIMART_BASE_URL` | Custom APIMart endpoint (default: https://api.apimart.ai) |
| `TUZI_API_KEY` | Tuzi API key (https://api.tu-zi.com) |
| `TUZI_VIDEO_MODEL` | Default Tuzi model (default: veo3.1) |
| `TUZI_BASE_URL` | Custom Tuzi endpoint (default: https://api.tu-zi.com) |

**Load Priority**: CLI args > EXTEND.md > env vars > `<cwd>/.laoli-recipe/.env` > `~/.laoli-recipe/.env`

## Resolution Priority

**Provider** (highest → lowest):
1. CLI: `--provider tuzi|apimart`
2. EXTEND.md: `default_provider`
3. Built-in default: `apimart`

**Model** (highest → lowest):
1. CLI: `--model <id>`
2. EXTEND.md: `default_model.{provider}`
3. Env var: `{PROVIDER}_VIDEO_MODEL`
4. Built-in default: `doubao-seedance-1-0-pro-fast` (apimart) / `veo3.1` (tuzi)

**Agent MUST display info** before each generation:
- Show: `Using {provider}: {model}`
- Show switch hints: `Switch provider: --provider | EXTEND.md default_provider`
- Show switch hints: `Switch model: --model <id> | EXTEND.md default_model.{provider} | env {PROVIDER}_VIDEO_MODEL`

## Error Handling

- Missing API key → ⛔ MUST run API key setup from Step 0.1
- **Network error** (请求未到达服务端) → auto-retry once with exponential backoff (不产生新费用)
- **API error** (参数错误、模型不存在、服务端 500 等) → no retry, report error directly
- **Content rejected** (内容审核拒绝) → no retry, report error
- **Generation failed** (视频生成失败) → no retry, report error for user investigation
- Timeout → error after 90 minutes
- Missing ffmpeg (long video mode) → clear error with platform-specific install instructions

> ⚠️ 视频生成很贵，只在确认是网络错误（请求未到达服务端）时自动重试。其他所有错误一律直接报错，请检查后手动重试。

## Extension Support

Custom configurations via EXTEND.md. See **Step 0** for paths and supported options.
