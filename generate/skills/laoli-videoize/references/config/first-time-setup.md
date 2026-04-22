---
name: first-time-setup
description: First-time setup flow for laoli-videoize
---

# First-Time Setup

## Overview

Triggered when:
1. API key missing → API key setup
2. No EXTEND.md found → full setup (model + preferences)
3. EXTEND.md found but `default_model` is null → model selection only

## API Key Setup

**Triggered when**: `TUZI_API_KEY` not found in env, `.laoli-recipe/.env`, or `~/.laoli-recipe/.env`.

### Step 1: Guide user to obtain API key

```
TUZI_API_KEY 未配置。请先获取 API Key：

1. 打开 https://api.tu-zi.com/token 创建并获取 API Key
2. 视频教程：https://www.bilibili.com/video/BV1k4PqzPEKz/
```

### Step 2: Ask user for API key

Directly ask the user in plain text to paste their API key:

```
请粘贴你的 Tuzi API Key（以 sk- 开头）：
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
2. Append: `echo "TUZI_API_KEY=<key>" >> <chosen-path>/.laoli-recipe/.env`
3. Confirm: "API Key 已保存到 `<full-path>/.laoli-recipe/.env`"

## Flow 1: No EXTEND.md (Full Setup)

Use AskUserQuestion:

### Question 1: Default Model

```yaml
header: "Video Model"
question: "默认视频生成模型？"
options:
  - label: "veo3.1 (Recommended)"
    description: "Google Veo 3.1 - 8s, frames mode"
  - label: "veo3"
    description: "Google Veo 3 - 8s, 16:9/9:16"
  - label: "sora-2"
    description: "OpenAI Sora 2 - 10/15s"
  - label: "kling-v1-6"
    description: "Kling v1.6 - 5/10s, 多宽高比"
  - label: "seedance-1.5-pro"
    description: "Seedance 1.5 Pro - 5/10s"
```

### Question 2: Save Location

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
default_model: [selected model or null]
default_seconds: null
default_size: null
---
```

## Flow 2: EXTEND.md Exists, Model Null

Ask ONLY the model question, then update EXTEND.md.
