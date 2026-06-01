---
name: apimart
description: APIMart image generation — OpenAI-compatible gateway aggregating GPT-Image-2, Gemini, Seedream, Grok Imagine, Wan and more
---

# APIMart Provider

[APIMart](https://apimart.ai) 是一个 OpenAI 兼容的 API 网关，聚合了多个图片生成上游。所有模型均为**全异步**：提交任务 → 轮询状态 → 下载结果。

## Supported Models

> **来源**：APIMart 文档 https://docs.apimart.ai/cn/api-reference/images

| Model ID | Source | Ref Images | Notes |
|----------|--------|------------|-------|
| `gpt-image-2` | OpenAI | ✅ | 主力模型，支持 aspect ratios 和 reference images |
| `gpt-image` | OpenAI | ✅ | 上一代 GPT Image |
| `gemini-3-pro-image-preview` | Google | ✅ | 高质量（Nano banana Pro） |
| `gemini-3.1-flash-image-preview` | Google | ✅ | 快速（Nano banana2） |
| `gemini-2.5-flash-image-preview` | Google | ✅ | 快速（Nano banana） |
| `seedream-4.0` | Seedream | ✅ | 仅支持 2K/3K |
| `seedream-4.5` | Seedream | ✅ | 仅支持 2K/3K |
| `seedream-5.0-lite` | Seedream | ✅ | 仅支持 2K/3K |
| `grok-imagine-1.0` | xAI | ❌ | 不支持参考图 |
| `wan2.7-image` | Wan | ❌ | 不支持参考图 |
| `imagen-4.0` | Google | ? | (TODO: 验证) |
| `qwen-image-2.0` | Qwen | ? | (TODO: 验证) |
| `z-image-turbo` | ? | ? | (TODO: 验证) |

## Size & Resolution

### GPT-Image-2

| Resolution | Supported Sizes |
|------------|-----------------|
| `1k` (default) | 全部比例 |
| `2k` | 全部比例 |
| `4k` | 仅 `16:9`, `9:16`, `2:1`, `1:2`, `21:9`, `9:21` |

4K 传入不支持的比例会自动降级为 2K。

### Seedream 系列

仅支持 `2k` 和 `3k`。传入 `1k` → 自动映射为 `2k`；传入 `4k` → 自动映射为 `3k`。

### Gemini 系列

支持 `1k`, `2k`, `4k`（TODO: 验证是否有 0.5K）。

## Reference Images

通过 `--ref <files...>` 传入参考图。支持两种类型的传入方式：

- **本地文件路径**：脚本会自动调用 `POST /v1/uploads/images` 上传至 APIMart，获取公开 URL（有效期 72 小时）后传入 `image_urls`
- **公网 URL**（`http://` 或 `https://` 开头）：直接透传至 `image_urls`

支持 JPG, PNG, WebP, GIF 格式，单文件最大 20MB。GPT-Image-2 最多 16 张参考图，其他模型最多 14 张（TODO: 验证上限）。

## Limits

- 并发: 默认 3（可通过 `LAOLI_IMAGE_GEN_APIMART_CONCURRENCY` 调整）
- 轮询间隔: 默认 5 秒，最长等待 360 次（约 30 分钟）
- 提交后建议等待 10~20 秒再开始轮询（单图一般 44~53 秒完成）
- 图片 URL 有效期: 完成后 24 小时，建议尽快下载

## Environment Variables

| Variable | Description |
|----------|-------------|
| `APIMART_API_KEY` | APIMart API Key |
| `APIMART_IMAGE_MODEL` | 默认模型（默认: `gpt-image-2`） |
| `APIMART_BASE_URL` | 自定义端点（默认: `https://api.apimart.ai/v1`） |
