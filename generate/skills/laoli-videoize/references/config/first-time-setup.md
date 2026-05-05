---
name: first-time-setup
description: First-time setup flow for laoli-videoize
---

# First-Time Setup

## Overview

Triggered when:
1. API key missing → API key setup
2. No EXTEND.md found → full setup (provider + model + preferences)
3. EXTEND.md found but `default_provider` is null → provider/model selection

## API Key Setup

**Triggered when**: No API key found in env, `.laoli-recipe/.env`, or `~/.laoli-recipe/.env`.

### Step 1: Guide user to obtain API key

```
API Key 未配置。请先获取 API Key：

APIMart (推荐 - 支持多家厂商):
1. 打开 https://apimart.ai/keys 创建并获取 API Key
2. 支持 Doubao Seedance, VEO3, Sora 2 等模型

Tuzi (备用):
1. 打开 https://api.tu-zi.com/token 创建并获取 API Key
2. 视频教程：https://www.bilibili.com/video/BV1k4PqzPEKz/
```

### Step 2: Ask user for API key

Directly ask the user in plain text to paste their API key:

```
请粘贴你的 API Key（以 sk- 或 amt- 开头）：

推荐 APIMart: https://apimart.ai/keys
备选 Tuzi: https://api.tu-zi.com/token
```

### Step 3: Ask save location

```yaml
header: "Save Location"
question: "API Key 保存位置？"
options:
  - label: "Project (Recommended)"
    description: ".laoli-recipe/.env (仅当前项目)"
  - label: "User"
    description: "~/.laoli-recipe/.env (所有项目共享)"
```

### Step 4: Store API key

1. Create directory: `mkdir -p <chosen-path>/.laoli-recipe`
2. For APIMart: `echo "APIMART_API_KEY=<key>" >> <chosen-path>/.laoli-recipe/.env`
3. For Tuzi: `echo "TUZI_API_KEY=<key>" >> <chosen-path>/.laoli-recipe/.env`
4. Confirm: "API Key 已保存到 `<full-path>/.laoli-recipe/.env`"

## Flow 1: No EXTEND.md (Full Setup)

Use AskUserQuestion:

### Question 1: Default Provider

```yaml
header: "Provider"
question: "默认使用哪个视频生成 Provider？"
options:
  - label: "apimart (推荐)"
    description: "支持 Doubao Seedance 2.0, VEO3, Sora 2 等多厂商模型"
  - label: "tuzi"
    description: "Tuzi VEO3.1, Kling v1.6"
```

### Question 2: Default Model

#### If apimart selected:

```yaml
header: "Video Model"
question: "默认视频生成模型？"
options:
  - label: "doubao-seedance-1-0-pro-fast (推荐)"
    description: "豆包 Seedance 1.0 快速版 - 2-12s, 多宽高比"
  - label: "doubao-seedance-2.0-fast"
    description: "豆包 Seedance 2.0 快速版 - 4-15s, 支持音频生成"
  - label: "doubao-seedance-1-5-pro"
    description: "豆包 Seedance 1.5 Pro - 4-12s"
  - label: "veo3.1-fast"
    description: "Google VEO3.1 快速版 - 8s"
  - label: "sora-2-preview"
    description: "OpenAI Sora 2 Preview - 4/8/12s"
```

#### If tuzi selected:

```yaml
header: "Video Model"
question: "默认视频生成模型？"
options:
  - label: "veo3.1 (推荐)"
    description: "Tuzi VEO3.1 - 8s, frames mode"
  - label: "kling-v1-6"
    description: "Tuzi Kling v1.6 - 5/10s"
```

### Question 3: Save Location

```yaml
header: "Save"
question: "偏好保存位置？"
options:
  - label: "Project (Recommended)"
    description: ".laoli-recipe/ (仅当前项目)"
  - label: "User"
    description: "~/.laoli-recipe/ (所有项目)"
```

### Save Locations

| Choice | Path | Scope |
|--------|------|-------|
| Project | `.laoli-recipe/laoli-videoize/EXTEND.md` | Current project |
| User | `$HOME/.laoli-recipe/laoli-videoize/EXTEND.md` | All projects |

### EXTEND.md Template

```yaml
---
version: 1
default_provider: [selected provider]
default_model:
  tuzi: [selected model or null]
  apimart: [selected model or null]
default_seconds: null
default_size: null
---
```

## Flow 2: EXTEND.md Exists, Provider Null

Ask provider and model question, then update EXTEND.md.

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `APIMART_API_KEY` | APIMart API key | Required |
| `APIMART_VIDEO_MODEL` | Default model | doubao-seedance-1-0-pro-fast |
| `APIMART_BASE_URL` | Custom endpoint | https://api.apimart.ai |
| `TUZI_API_KEY` | Tuzi API key | Required |
| `TUZI_VIDEO_MODEL` | Default model | veo3.1 |
| `TUZI_BASE_URL` | Custom endpoint | https://api.tu-zi.com |
