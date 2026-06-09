# Agnes AI Provider

Agnes AI 提供免费的文本到图像和图像到图像生成 API。

## Quick Facts

| Item | Value |
|------|-------|
| Base URL | `https://apihub.agnes-ai.com/v1` |
| Image endpoint | `POST /v1/images/generations` |
| API Key | `AGNES_API_KEY` (获取: https://platform.agnes-ai.com) |
| Default model | `agnes-image-2.1-flash` |
| Auth | `Authorization: Bearer <key>` |
| Model selector | `AGNES_IMAGE_MODEL` env var |
| Custom endpoint | `AGNES_BASE_URL` env var |
| R-rate limit | 20 RPM (免费) |

## Supported Models

| Model | Purpose |
|-------|---------|
| `agnes-image-2.1-flash` | Text-to-image, image-to-image (推荐) |
| `agnes-image-2.0-flash` | Legacy image model |

## Size Limits

⚠️ **Agnes Image API 不支持超过 ~1.3MP 的尺寸**，例如 `1080x1920` (2MP) 会导致 HTTP 500。

Safe aspect ratio → pixel dimension mappings:

| Aspect Ratio | Safe Size | Pixels |
|-------------|-----------|--------|
| `1:1` | `1024x1024` | 1.05 MP |
| `16:9` | `1536x864` | 1.33 MP |
| `9:16` | `864x1536` | 1.33 MP |
| `4:3` | `1280x960` | 1.23 MP |
| `3:2` | `1440x960` | 1.38 MP |
| `21:9` | `1536x658` | 1.01 MP |

## Environment Variables

| Variable | Description |
|----------|-------------|
| `AGNES_API_KEY` | **Required.** API key from platform.agnes-ai.com |
| `AGNES_BASE_URL` | Custom endpoint (default: https://apihub.agnes-ai.com/v1) |
| `AGNES_IMAGE_MODEL` | Default model (default: agnes-image-2.1-flash) |

## Reference Images (Image-to-Image)

Agnes supports image-to-image via `extra_body.image`. Local files are automatically converted to base64 data URLs. Supported formats: `.jpg`, `.jpeg`, `.png`, `.webp`, `.gif`, `.bmp`.

## Usage in laoli-imagine

```bash
# Text-to-image
${BUN_X} {baseDir}/scripts/main.ts --provider agnes --prompt "A cat on a beach" --image cat.png

# With aspect ratio
${BUN_X} {baseDir}/scripts/main.ts --provider agnes --prompt "Mountain landscape" --image out.png --ar 16:9

# With reference image (image-to-image via extra_body)
${BUN_X} {baseDir}/scripts/main.ts --provider agnes --prompt "Turn into watercolor style" --image out.png --ref source.png

# Custom model
${BUN_X} {baseDir}/scripts/main.ts --provider agnes --model agnes-image-2.1-flash --prompt "..." --image out.png
```

## EXTEND.md Configuration

```yaml
---
default_provider: agnes
default_model:
  agnes: "agnes-image-2.1-flash"
batch:
  provider_limits:
    agnes:
      concurrency: 3
      start_interval_ms: 1100
---
```
