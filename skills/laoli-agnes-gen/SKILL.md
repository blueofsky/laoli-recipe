---
name: laoli-agnes-gen
description: Agnes AI image and video generation. Use when the user wants to generate or edit images, create videos from text or images, or use picgo to upload local images for video generation.
---

# Agnes AI Generation

Use this skill to call Agnes image and video generation APIs through `https://apihub.agnes-ai.com`.

## Quick Start

1. Read `references/api.md` when endpoint details, parameters, or response fields are needed.
2. This skill works on **any platform with Python 3.11+** — not limited to WorkBuddy. See `references/api.md` → "Multi-Platform Integration Guide" for standalone usage.
3. Require an API key in `AGNES_API_KEY`, `AGNES_API_TOKEN`, or `APIHUB_AGNES_API_KEY`. Never print the key.
   - **Option A (推荐)**: 任选以下一个位置创建 `.env` 文件（按优先级）：
     1. **项目根目录** (CWD) `.env` — 按项目隔离
     2. **`~/.workbuddy/.env`** — WorkBuddy 全局（如使用 WorkBuddy）
     3. **`~/.env`** — 系统全局（通用，任何平台）
     ```bash
     # 从 skill 的模板复制
     cp references/env.example ./.env
     # 然后编辑 .env 填入你的 API Key
     ```
   - **Option B**: 设置环境变量：`export AGNES_API_KEY=your_key_here`
4. Use `scripts/agnes_api.py` for real API calls instead of rewriting curl by hand.
5. For light live verification, run `smoke-test`.
   Treat the skill as fully tested only when text-to-image, image-to-image, text-to-video, image-to-video, multi-image video, keyframe video, and video retrieval return successful responses.

## Commands

Image generation:

```bash
# 使用像素尺寸
python scripts/agnes_api.py image --prompt "A luminous floating city above a misty canyon at sunrise, cinematic realism" --size 1024x768
# 使用宽高比（16:9 横屏 / 9:16 竖屏 / 1:1 方形）
python scripts/agnes_api.py image --prompt "一位穿汉服的少女在樱花树下" --size 9:16
python scripts/agnes_api.py image --prompt "壮丽的山脉日落全景" --size 16:9
```

Image-to-image:

```bash
# 使用公网 URL
python scripts/agnes_api.py image --prompt "Turn the scene into a rainy cyberpunk night while preserving composition" --image https://example.com/input.png --size 1024x768
# 使用本地图片（自动转 base64）
python scripts/agnes_api.py image --prompt "改成水彩画风格" --image D:\图片\photo.jpg --size 1024x768
```

Text-to-video with polling:

```bash
# 使用像素尺寸
python scripts/agnes_api.py video --prompt "A cinematic shot of a cat walking on the beach at sunset" --poll
# 指定时长（自动计算最优帧数）
python scripts/agnes_api.py video --prompt "一只猫在夕阳下沙滩上漫步，电影级画面" --aspect 9:16 --seconds 4 --poll
python scripts/agnes_api.py video --prompt "赛博朋克城市夜景航拍" --aspect 16:9 --seconds 10 --poll
```

Image-to-video:

```bash
# 使用公网 URL
python scripts/agnes_api.py video --prompt "Animate subtle camera movement and natural lighting" --image https://example.com/image.png --poll
# 使用本地图片
python scripts/agnes_api.py video --prompt "让这张照片动起来，微风吹动树叶" --image D:\图片\scenery.jpg --poll
```

Keyframe / multi-image video:

```bash
python scripts/agnes_api.py video --prompt "Create a smooth cinematic transition between the two keyframes" --image https://example.com/a.png --image https://example.com/b.png --mode keyframes --poll
```

Retrieve a video task:

```bash
# ⭐ 推荐方式：使用 video_id 查询（避免排队过长）
python scripts/agnes_api.py video-query video_xxxxxx
# 兼容方式：使用 task_id 查询
python scripts/agnes_api.py video-get task_xxxxxx
```

Light live smoke test:

```bash
python scripts/agnes_api.py smoke-test
```

Image edit smoke test:

```bash
python scripts/agnes_api.py smoke-test --include-image-edit
```

Single video smoke test:

```bash
python scripts/agnes_api.py smoke-test --video-case text-to-video
```

## Workflow

- Prefer `agnes-image-2.1-flash` for text-to-image, image-to-image, and high-information-density image generation. For high-density output, prompts should be detailed and include subject hierarchy, environment, secondary details, lighting, composition, and quality requirements.
- Prefer `agnes-video-v2.0` for text-to-video, image-to-video, multi-image video, keyframe animation, prompt-based motion and scene control, cinematic output, asynchronous task creation, polling-based result retrieval, and seed-based reproducibility.
- For image and video generation, convert any non-English user prompt to a fluent English generation prompt before calling the image/video API. English prompts are more stable for Agnes video generation. Preserve concrete visual details, style, lighting, composition, motion, camera instructions, and constraints during translation.
- For videos, remember the API is asynchronous: create a task first, then poll or retrieve by video_id. Use `--poll` for automatic polling; it uses `video_id` internally to avoid long queues.
- The script validates image sizes, video frame counts, frame rates, and dimensions before sending requests. `num_frames` must be `8n + 1` and `<= 441`; `81` or `121` are good short values.
- The video command defaults to `num_frames=121` and `frame_rate=24` for more stable generation. Video smoke tests default to `num_frames=81` and `frame_rate=24`.
- Warn the user before costly or long-running live video generation unless they explicitly asked to test or generate video.
- Test video capabilities one at a time with `smoke-test --video-case <case>` to avoid creating many tasks at once. Supported cases are `text-to-video`, `image-to-video`, `multi-image`, and `keyframes`.

## Output Handling

- Return or save generated URLs from the JSON response.
- For image responses, expect URL-style results when `extra_body.response_format` is `url`.
- For video responses, extract URLs from `video_url`, `url`, or `remixed_from_video_id` when `status` is `completed`.
- If a request fails, report HTTP status and provider error body without exposing the API key.

## Important Notes

- **Video query critical**: ⚠️ 必须使用 `video_id` 而非 `task_id` 查询视频状态，否则会排队长达数十分钟！
  - 创建视频任务时，响应中会同时返回 `task_id`（`id` 字段）和 `video_id` 字段
  - ✅ 推荐：`video-query <video_id>` → `GET /agnesapi?video_id=...`
  - ❌ 旧兼容：`video-get <task_id>` → `GET /v1/videos/{task_id}`
  - `--poll` 模式已自动使用 video_id 方式轮询
- **Aspect ratio support**: `image --size` 和 `video --aspect` 都支持 `16:9`、`9:16`、`1:1`、`4:3`、`3:2`、`21:9` 等常用宽高比。
  - 图片默认（高效）：`--size 9:16` → **1080x1920**（1080p，匹配抖音/快手/YouTube Shorts）
  - 图片高清：`--size 9:16 --hq` → **864x1536**（1536px 基准，适合高质量存档）
  - 视频：`--aspect 9:16` → 自动设为宽 648 高 1152（长边 1152px）。也可再通过 `--width` / `--height` 单独覆盖。
  - 也可直接传像素尺寸如 `--size 1920x1080` 或 `--size 1080x1920` 精确指定
- **Local image support**: `--image` 同时支持公网 URL 和本地文件路径。本地图片会自动转为 base64 数据 URL 发送。支持的格式：`.jpg`, `.jpeg`, `.png`, `.webp`, `.gif`, `.bmp`。
- **Parameter isolation**: Pure text-to-image (`agnes-image-2.1-flash`) **must NOT** send `extra_body` with image/edit parameters, otherwise it errors with `UnsupportedParamsError`.
- **Video URL field**: The video API returns the video URL in `remixed_from_video_id`, not `video_url`. Code must handle both field names.
- **Frame count constraint**: Video `num_frames` must strictly satisfy `8n + 1` (e.g., 81, 121, 241, 441).
- **Duration shortcut**: Use `--seconds <N>` (1~15) to set video length without counting frames. The script auto-calculates the optimal `num_frames`.
  ```bash
  python scripts/agnes_api.py video --prompt "..." --seconds 4 --poll   # ~4秒
  python scripts/agnes_api.py video --prompt "..." --seconds 8 --poll   # ~8秒
  python scripts/agnes_api.py video --prompt "..." --seconds 15 --poll  # ~15秒
  ```
  Default is ~5秒 (121帧 @24fps).
- **No payment required**: Registration gives free API access, no credit card needed.
