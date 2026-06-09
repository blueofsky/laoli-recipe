---
name: tuzi
description: Tuzi image generation — Gemini native API with sync and async modes
---

# Tuzi Provider

[Tuzi](https://api.tu-zi.com) 提供基于 Gemini 原生 API 的图片生成，支持**同步**和**异步**两种模式。所有模型均通过 OpenAI 兼容格式调用。

## Supported Models

| Model ID | Mode | Ref Images | Notes |
|----------|------|------------|-------|
| `gpt-image-2` | 同步 | ✅ | 主力模型，支持质量参数 (`quality`) |
| `gemini-3-pro-image-preview` | 同步 | ✅ | 同步版，支持质量参数 (`quality`) |
| `gemini-3-pro-image-preview-async` | 异步 | ✅ | 异步版 2K |
| `gemini-3-pro-image-preview-2k-async` | 异步 | ✅ | 显式 2K 异步 |
| `gemini-3-pro-image-preview-4k-async` | 异步 | ✅ | 显式 4K 异步 |
| `mj-imagine` | 异步 | ✅ | Midjourney 风格 |

## Mode

### 同步模式（Sync）

提交请求后同步返回图片 URL 或 base64 数据。

- 端点: `POST /images/generations`
- 轮询: 无（直接返回）
- 适用模型: `gpt-image-2`, `gemini-3-pro-image-preview`

### 异步模式（Async）

提交任务后进入队列，轮询状态直到完成。

- 提交端点: `POST /videos`（注意是 `/videos` 而非 `/images`）
- 轮询端点: `GET /videos/{id}`
- 轮询间隔: 5 秒
- 最大轮询次数: 360 次（约 30 分钟）
- 适用模型: `-async` 后缀模型, `mj-imagine`

## Parameters

### 同步模式请求体

| 参数 | 类型 | 说明 |
|------|------|------|
| `model` | string | 模型 ID |
| `prompt` | string | 提示词 |
| `response_format` | string | `url`（固定） |
| `size` | string | 可选，如 `1024x1024`、`1280x720`。可由 `--ar` 自动转换 |
| `quality` | string | 仅 `gpt-image-2`、`gemini-3-pro-image-preview` 支持：`1k`、`2k` |
| `image` | array | 参考图 base64 data URL（可选），最多多张 |
| `n` | integer | 生成数量（可选） |

### 异步模式请求体（FormData）

| 参数 | 类型 | 说明 |
|------|------|------|
| `model` | string | 模型 ID |
| `prompt` | string | 提示词 |
| `size` | string | 比例，如 `1:1`、`16:9`。可由 `--ar` 自动转换 |
| `input_reference` | file | 参考图文件（可选） |

## Reference Images

通过 `--ref` 参数传入，支持 PNG/JPG/WebP/GIF。

- 大小限制: 原始文件超过 1MB 时自动压缩为 JPEG（质量 70%）以节省 token
- 异步模式传入 FormData `input_reference` 字段
- 同步模式传入 base64 data URL 数组

## Size & Aspect Ratio

| CLI 参数 | 同步 `size` | 异步 `size` |
|---------|-------------|-------------|
| `--ar 1:1` | `1x1` | `1:1` |
| `--ar 16:9` | `16x9` | `16:9` |
| `--ar 9:16` | `9x16` | `9:16` |
| `--ar 4:3` | `4x3` | `4:3` |
| `--ar 3:4` | `3x4` | `3:4` |
| `--ar 2.35:1` | `2.35x1` | `2.35:1` |
| `--size 1024x1024` | `1024x1024` | 不适用 |

异步模式默认比例: `1:1`（当未指定 `--ar` 且未指定 `--size` 时）。

## Quality

仅 `gpt-image-2`、`gemini-3-pro-image-preview`（同步）支持 `--quality` 参数：

| CLI `--quality` | API `quality` | 说明 |
|----------------|--------------|------|
| `normal` | `1k` | 快速预览 |
| `2k`（默认） | `2k` | 高质量 |

## Limits

- 并发: 默认 3（可通过 `LAOLI_IMAGE_GEN_TUZI_CONCURRENCY` 调整）
- 异步轮询间隔: 5 秒，最长等待 360 次（约 30 分钟）
- 单张参考图最大: 压缩前无限制，压缩后 JPEG 质量 70%
- 异步参考图压缩: macOS 使用 `sips`，其他平台使用 ImageMagick `convert`

## Environment Variables

| Variable | Description |
|----------|-------------|
| `TUZI_API_KEY` | Tuzi API Key（必需） |
| `TUZI_IMAGE_MODEL` | 默认模型（默认: `gpt-image-2`） |
| `TUZI_BASE_URL` | 自定义端点（默认: `https://api.tu-zi.com/v1`） |

## Error Handling

| revised_prompt | 含义 | 处理 |
|----------------|------|------|
| `PROHIBITED_CONTENT` | 内容违规被拒绝 | 更换提示词 |
| `NO_IMAGE` | 模型未生成图片 | 尝试更明确的提示词 |

异步任务状态 `failed` 时，直接抛出 `error` 字段内容。
