---
name: first-time-setup
description: First-time setup and default model selection flow for laoli-imagine
---

# First-Time Setup

> ⚠️ **状态**: 此功能当前**未实现**于脚本中。EXTEND.md 查找失败时，脚本会使用内置默认值继续执行，不会触发此 setup 流程。
>
> 此文档保留作为未来自动 setup 功能的设计参考。

## Overview

Triggered when:
1. No EXTEND.md found → full setup (provider + model + preferences)
2. EXTEND.md found but `default_model.[provider]` is null → model selection only

## Setup Flow

```
No EXTEND.md found          EXTEND.md found, model null
        │                            │
        ▼                            ▼
┌─────────────────────┐    ┌──────────────────────┐
│ AskUserQuestion     │    │ AskUserQuestion      │
│ (full setup)        │    │ (model only)         │
└─────────────────────┘    └──────────────────────┘
        │                            │
        ▼                            ▼
┌─────────────────────┐    ┌──────────────────────┐
│ Create EXTEND.md    │    │ Update EXTEND.md     │
└─────────────────────┘    └──────────────────────┘
        │                            │
        ▼                            ▼
    Continue                     Continue
```

## Flow 1: No EXTEND.md (Full Setup)

**Language**: Use user's input language or saved language preference.

Use AskUserQuestion with ALL questions in ONE call:

### Question 1: Default Provider

```yaml
header: "Provider"
question: "Default image generation provider?"
options:
  - label: "APIMart (Recommended)"
    description: "OpenAI-compatible gateway — GPT-Image-2, Gemini, Seedream, Grok Imagine, and more"
  - label: "Tuzi"
    description: "Gemini-based image generation with subject-reference character workflows"
  - label: "Agnes"
    description: "Free Agnes AI image-to-image and text-to-image (platform.agnes-ai.com)"
```

### Question 2: Default APIMart Model

Only show if user selected APIMart.

```yaml
header: "APIMart Model"
question: "Default APIMart image generation model?"
options:
  - label: "gpt-image-2 (Recommended)"
    description: "OpenAI GPT-Image-2 — best overall quality, supports all aspect ratios and reference images"
  - label: "gemini-3-pro-image-preview"
    description: "Google Gemini 3 Pro Image — high quality, supports reference images"
  - label: "gemini-3.1-flash-image-preview"
    description: "Google Gemini 3.1 Flash Image — fast generation speed"
  - label: "seedream-5.0-lite"
    description: "Seedream 5.0 Lite — supports 2K/3K resolution only"
  - label: "grok-imagine-1.0"
    description: "xAI Grok Imagine — does NOT support reference images"
```

Notes for APIMart setup:
- APIMart is fully async: submit job → poll task status → download result.
- Reference images (`--ref`) are supported by GPT-Image-2, Gemini, and Seedream; **not** supported by Grok Imagine and Wan.
- Seedream models only support 2K/3K resolution.

### Question 2b: Default Tuzi Model

Only show if user selected Tuzi.

```yaml
header: "Tuzi Model"
question: "Default Tuzi image generation model?"
options:
  - label: "gpt-image-2 (Recommended)"
    description: "OpenAI GPT-Image-2 — best overall quality, supports quality parameters and reference images"
```

Notes for Tuzi setup:
- `gpt-image-2` is the default model. Supports quality parameters and reference images.
- Tuzi subject reference uses `subject_reference[].type = character`; docs recommend front-facing portrait references in JPG/JPEG/PNG under **1MB** (larger images are auto-compressed).

### Question 3: Default Quality

```yaml
header: "Quality"
question: "Default image quality?"
options:
  - label: "2k (Recommended)"
    description: "2048px - covers, illustrations, infographics"
  - label: "normal"
    description: "1024px - quick previews, drafts"
```

### Question 4: Default Aspect Ratio

```yaml
header: "Aspect Ratio"
question: "Default aspect ratio? (skip to use none)"
options:
  - label: "No default (Recommended)"
    description: "Use model default (16:9 for most models)"
  - label: "16:9"
    description: "Widescreen - YouTube thumbnails, presentations"
  - label: "1:1"
    description: "Square - Instagram posts, social cards"
  - label: "9:16"
    description: "Vertical - Mobile wallpapers, stories"
  - label: "4:3"
    description: "Standard - Blog headers, documentation"
  - label: "3:2"
    description: "Photo - Photography, prints"
```

### Question 5: Default Image Size

```yaml
header: "Image Size"
question: "Default image resolution? (skip to use quality default)"
options:
  - label: "Use quality default (Recommended)"
    description: "2K → 2048px, Normal → 1024px"
  - label: "1K"
    description: "1024px - fast generation, previews"
  - label: "2K"
    description: "2048px - balanced quality and speed"
  - label: "4K"
    description: "4096px - maximum detail (slower)"
```

### Question 6: Save Location

```yaml
header: "Save"
question: "Where to save preferences?"
options:
  - label: "Project (Recommended)"
    description: ".laoli-recipe/ (this project only)"
  - label: "User"
    description: "~/.laoli-recipe/ (all projects)"
```

### Save Locations

| Choice | Path | Scope |
|--------|------|-------|
| Project | `.laoli-recipe/laoli-imagine/EXTEND.md` | Current project |
| User | `$HOME/.laoli-recipe/laoli-imagine/EXTEND.md` | All projects |

### EXTEND.md Template

```yaml
---
version: 1
default_provider: apimart          # tuzi | apimart | agnes
default_quality: 2k               # normal | 2k
default_aspect_ratio: null         # "16:9" | "1:1" | "9:16" | "4:3" | "3:2" | null
default_image_size: null           # 1K | 2K | 4K | null (null = 由 quality 控制)
default_model:
  tuzi: null                       # 用户选 Tuzi 时填入
  apimart: gpt-image-2            # 用户选 APIMart 时填入
  agnes: null                      # 用户选 Agnes 时填入
---
```

**说明**：
- `null` 表示"无默认值"
- `default_image_size` 为 null 时，由 `default_quality` 控制分辨率
- 首次设置后可用 `laoli-imagine --setup` 重新配置

## Flow 2: EXTEND.md Exists, Model Null

When EXTEND.md exists but `default_model.[current_provider]` is null, ask ONLY the model question for the current provider.

### APIMart Model Selection

```yaml
header: "APIMart Model"
question: "Choose a default APIMart image generation model?"
options:
  - label: "gpt-image-2 (Recommended)"
    description: "OpenAI GPT-Image-2 — best overall quality, supports all aspect ratios and reference images"
  - label: "gemini-3-pro-image-preview"
    description: "Google Gemini 3 Pro Image — high quality, supports reference images"
  - label: "gemini-3.1-flash-image-preview"
    description: "Google Gemini 3.1 Flash Image — fast generation speed"
  - label: "seedream-5.0-lite"
    description: "Seedream 5.0 Lite — supports 2K/3K resolution only"
  - label: "grok-imagine-1.0"
    description: "xAI Grok Imagine — does NOT support reference images"
```

Notes for APIMart setup:
- APIMart is fully async: submit job → poll task status → download result.
- Reference images (`--ref`) are supported by GPT-Image-2, Gemini, and Seedream; **not** supported by Grok Imagine and Wan.

### Tuzi Model Selection

```yaml
header: "Tuzi Model"
question: "Choose a default Tuzi image generation model?"
options:
  - label: "gpt-image-2 (Recommended)"
    description: "OpenAI GPT-Image-2 — best overall quality, supports quality parameters and reference images"
```

Notes for Tuzi setup:
- `gpt-image-2` is the default model. Supports quality parameters and reference images.
- Tuzi subject reference currently uses `subject_reference[].type = character`; docs recommend front-facing portrait references in JPG/JPEG/PNG under **1MB** (larger images are auto-compressed).

### Agnes Model Selection

Only show if user selected Agnes.

```yaml
header: "Agnes Model"
question: "Choose a default Agnes image generation model?"
options:
  - label: "agnes-image-2.1-flash (Recommended)"
    description: "Agnes Image 2.1 Flash — free text-to-image and image-to-image, 20 RPM"
```

Notes for Agnes setup:
- `agnes-image-2.1-flash` is the default model. Free API with 20 RPM limit.
- Image-to-image supported via `--ref` (local files auto-converted to base64).
- Maximum image size ~1.3MP (e.g. 864x1536 for 9:16, 1024x1024 for 1:1).

### Update EXTEND.md

After user selects a model:

1. Read existing EXTEND.md
2. If `default_model:` section exists → update the provider-specific key
3. If `default_model:` section missing → add the full section:

```yaml
default_model:
  tuzi: [value or null]
  apimart: [value or null]
  agnes: [value or null]
```

Only set the selected provider's model; leave others as their current value or null.

## After Setup

1. Create directory if needed
2. Write/update EXTEND.md with frontmatter
3. Confirm: "Preferences saved to [path]"
4. Continue with image generation
