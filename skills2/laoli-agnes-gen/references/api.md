# Agnes AI API Reference

Base URL (image/video creation): `https://apihub.agnes-ai.com/v1/`  
Base URL (video query): `https://apihub.agnes-ai.com/agnesapi?video_id=...`  
Auth: `Authorization: Bearer <API_KEY>`
API Key env vars: `AGNES_API_KEY`, `AGNES_API_TOKEN`, `APIHUB_AGNES_API_KEY`

---

## Best Practices

1. **Prompt language**: Use English prompts for best results, especially for video. The CLI script auto-translates non-English prompts.
2. **Resolution strategy**:
   - **Daily use** (efficient): 1080p benchmark (e.g., `1080x1920` for 9:16) — matches Douyin/Kuaishou/YouTube Shorts
   - **Final output** (high quality): Use `--hq` flag for 1536px-based resolution
   - Or pass exact pixel dimensions: `--size 1920x1080`
3. **Video queries**: ⚠️ **Always use `video_id`** via `GET /agnesapi?video_id=...` to avoid excessively long queues. Do NOT use `task_id` via `GET /v1/videos/{task_id}`.
4. **Video polling**: Use `--poll` with a realistic timeout (e.g., `--timeout 600`). The CLI auto-uses `video_id` for polling.
5. **Local images for video**: The video API only accepts public URLs. Local images are auto-uploaded via `picgo` to CDN.

---

## 1. Image Generation (Text-to-Image)

**Endpoint**: `POST /v1/images/generations`
**Model**: `agnes-image-2.1-flash`

| Parameter   | Type   | Required | Default      | Description |
|-------------|--------|----------|--------------|-------------|
| `model`     | string | yes      | -            | `agnes-image-2.1-flash` |
| `prompt`    | string | yes      | -            | Image description, supports Chinese |
| `size`      | string | no       | `1024x1024`  | e.g. `1024x768` or `1080x1920` |

> ⚠️ **⚠️ Critical**: Pure text-to-image must NOT include `extra_body` at all — it errors with `UnsupportedParamsError`. The `extra_body.image` field is for image-to-image only.

**cURL Example**:
```bash
curl -X POST https://apihub.agnes-ai.com/v1/images/generations \
  -H "Authorization: Bearer $AGNES_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "agnes-image-2.1-flash",
    "prompt": "A cute shiba inu sleeping under cherry blossoms, warm sunlight",
    "size": "1080x1920"
  }'
```

**Response**:
```json
{
  "data": [{"url": "https://..."}]
}
```

---

## 2. Image-to-Image (Edit / Multi-Image)

**Endpoint**: `POST /v1/images/generations`
**Model**: `agnes-image-2.1-flash`

| Parameter                      | Type   | Required | Description |
|--------------------------------|--------|----------|-------------|
| `model`                        | string | yes      | `agnes-image-2.1-flash` |
| `prompt`                       | string | yes      | Edit instruction |
| `size`                         | string | no       | Output size |
| `extra_body.image`             | array  | yes      | Image URL list: `["url1"]` |
| `extra_body.response_format`   | string | no       | `"url"` to get URL back |

**cURL Example**:
```bash
curl -X POST https://apihub.agnes-ai.com/v1/images/generations \
  -H "Authorization: Bearer $AGNES_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "agnes-image-2.1-flash",
    "prompt": "Change to watercolor painting style",
    "size": "1080x1920",
    "extra_body": {
      "image": ["https://example.com/photo.png"],
      "response_format": "url"
    }
  }'
```

---

## 3. Video Creation

**Endpoint**: `POST /v1/videos`
**Model**: `agnes-video-v2.0` (async, returns task id + video_id)

| Parameter            | Type   | Required | Default | Description |
|----------------------|--------|----------|---------|-------------|
| `model`              | string | yes      | -       | `agnes-video-v2.0` |
| `prompt`             | string | yes      | -       | Video description (English recommended) |
| `width`              | int    | no       | 1152    | **脚本中使用 `--aspect` 会自动覆盖此默认值** |
| `height`             | int    | no       | 768     | **脚本中使用 `--aspect` 会自动覆盖此默认值** |
| `num_frames`         | int    | no       | 121     | Must be `8n+1` (e.g., 81, 121, 241, 441) and ≤ 441 |
| `frame_rate`         | float  | no       | 24      | 1-60 |
| `num_inference_steps`| int    | no       | -       | Quality steps |
| `seed`               | int    | no       | -       | Reproducibility seed |
| `negative_prompt`    | string | no       | -       | What to avoid |
| `mode`               | string | no       | -       | `ti2vid` or `keyframes` |
| `image`              | string | no       | -       | Single image URL for image-to-video |
| `extra_body.image`   | array  | no       | -       | Multiple image URLs for multi-image/keyframes |

**Frame count**: Must satisfy `8n+1`. Valid values: 81 (~3.4s), 121 (~5s), 241 (~10s), 441 (~18.4s at 24fps).

> 💡 **Tip**: Use `--seconds <N>` (1-15) instead of calculating frames manually. The script auto-finds the optimal `num_frames`:
> ```bash
> python scripts/agnes_api.py video --prompt "..." --seconds 4 --aspect 9:16 --poll
> # → num_frames=97 @ 24fps = 4.042s
> ```

**Duration formula**: `seconds = num_frames / frame_rate`

| Duration | num_frames | frame_rate |
|----------|------------|------------|
| ~3s      | 81         | 24         |
| ~4s      | 97         | 24         |
| ~5s      | 121        | 24         |
| ~8s      | 193        | 24         |
| ~10s     | 241        | 24         |
| ~15s     | 361        | 24         |

**cURL Example**:
```bash
curl -X POST https://apihub.agnes-ai.com/v1/videos \
  -H "Authorization: Bearer $AGNES_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "agnes-video-v2.0",
    "prompt": "A cinematic shot of a cat walking on the beach at sunset",
    "width": 648,
    "height": 1152,
    "num_frames": 121,
    "frame_rate": 24
  }'
```

**Response** (task created):
```json
{
  "id": "task_xxx123",
  "video_id": "video_xxx123",
  "status": "pending"
}
```

> ⚠️ Save the `video_id` field — you'll need it for status queries.

---

## 4. Video Task Status Retrieval

**Endpoint (recommended)**: `GET /agnesapi?video_id={video_id}`  
**Endpoint (legacy)**: `GET /v1/videos/{task_id}`

> ⚠️ **IMPORTANT**: Always use `video_id` (not `task_id`) to query video status. Using `task_id` can cause excessively long queues (>5 min). This is the #1 mistake users make.

**cURL Example (recommended)**:
```bash
curl "https://apihub.agnes-ai.com/agnesapi?video_id=video_xxx123" \
  -H "Authorization: Bearer $AGNES_API_KEY"
```

**cURL Example (legacy — avoid)**:
```bash
curl "https://apihub.agnes-ai.com/v1/videos/task_xxx123" \
  -H "Authorization: Bearer $AGNES_API_KEY"
```

**Response** (completed):
```json
{
  "status": "completed",
  "remixed_from_video_id": "https://storage.googleapis.com/...",
  "progress": 100
}
```

> ⚠️ The actual video URL field may be `remixed_from_video_id`, not `video_url`. Code must handle both field names.

---

## Known Issues & Notes

1. **Image API — parameter isolation**: Pure text-to-image must NOT include `extra_body` at all, or it errors with `UnsupportedParamsError`. Only add `extra_body.image` for image-to-image/edit mode.
2. **Video URL field**: The completed video URL may be in `remixed_from_video_id` instead of the documented `video_url`.
3. **Video query — use video_id**: Always query with `video_id` via `/agnesapi?video_id=...`. Using `task_id` via `/v1/videos/{task_id}` causes excessive queuing.
4. **Video frame count**: Must be `8n + 1` and ≤ 441. Valid examples: 81, 121, 241, 441.
5. **Local images for video**: Video API only accepts public URLs. The CLI script auto-uploads local files via picgo to GitHub CDN.
6. **No payment required**: Registration gives free API access, no credit card needed.
7. **Rate limit**: 20 RPM (requests per minute). Plan your requests accordingly.

---

## Error Troubleshooting

### Error Code Quick Reference

| Status | Meaning | Common Causes | Solutions |
|--------|---------|---------------|----------|
| 400 | Bad Request | Invalid JSON, missing required params, wrong param types | Check JSON format, verify all required fields, ensure param types |
| 401 | Unauthorized | API Key wrong/expired | Check `Authorization` header format (`Bearer ` with space), verify key is valid |
| 404 | Not Found | Invalid video/task ID | Confirm the ID is correct, check if using `task_id` vs `video_id` |
| 429 | Rate Limited | Too many requests (free tier: 20 RPM) | Reduce request frequency, implement exponential backoff |
| 500 | Server Error | Service-side exception | Retry later, contact support if persistent |
| 503 | Service Busy | High load or maintenance | Exponential backoff retry (1s → 2s → 4s → 8s), check announcements |

### Common Failure Scenarios

#### Video queuing > 5 minutes
**Likely cause**: Using `task_id` instead of `video_id` for status query.
**Fix**: Use `video-query <video_id>` (recommended) instead of `video-get <task_id>`.

#### Image generation returns UnsupportedParamsError
**Likely cause**: Sending `extra_body` (even `extra_body.response_format`) in a pure text-to-image request.
**Fix**: Only include `extra_body` when using image-to-image mode (i.e., when `--image` is specified).

#### Video creation returns 404
**Likely cause**: Wrong endpoint URL.
**Fix**: Video creation is `POST /v1/videos`. Video query is `GET /agnesapi?video_id=...`. Do NOT confuse the two.

#### Local image path "file not found"
**Likely cause**: The path contains spaces or special characters.
**Fix**: Quote the path properly: `--image "D:\my folder\image.jpg"`. Use forward slashes.

### Exponential Backoff Strategy (for 429/503)

```python
import time
import random

def retry_with_backoff(func, max_retries=5):
    for attempt in range(max_retries):
        try:
            return func()
        except (HTTPError, URLError) as e:
            if e.code not in (429, 503):
                raise
            wait = (2 ** attempt) + random.uniform(0, 1)
            time.sleep(wait)
    raise Exception("Max retries exceeded")
```

---

## Multi-Platform Integration Guide

This skill provides a **standalone Python CLI** (`scripts/agnes_api.py`). It does NOT depend on WorkBuddy — you can use it on any platform with Python 3.11+.

### WorkBuddy (Plugin Install)

The skill is installed as a **plugin/marketplace skill**:

```
~/.workbuddy/plugins/marketplaces/laoli/skills/laoli-agnes-gen/
├── SKILL.md
├── scripts/agnes_api.py
└── references/api.md
```

Run from the skill directory or use absolute path:
```bash
cd ~/.workbuddy/plugins/marketplaces/laoli/skills/laoli-agnes-gen
python scripts/agnes_api.py image --prompt "..." --size 9:16
```

### Standalone CLI (Any Platform)

Copy the `scripts/` folder anywhere and run directly:

```bash
# 1. Clone or copy the scripts
cp -r agnes-gen/scripts /your/project/agnes-scripts

# 2. Set your API key
export AGNES_API_KEY=sk-xxxx

# 3. Run commands
python agnes-scripts/agnes_api.py image --prompt "A cat" --size 9:16
python agnes-scripts/agnes_api.py video --prompt "A cat walking" --aspect 9:16 --poll
```

### Windows (PowerShell)

```powershell
# Set API key
$env:AGNES_API_KEY="sk-xxxx"

# Or use .env file (script auto-detects)
# Create .env in project root:
# AGNES_API_KEY=sk-xxxx

python scripts/agnes_api.py image --prompt "..." --size 9:16
```

### macOS / Linux (Bash)

```bash
export AGNES_API_KEY=sk-xxxx
python3 scripts/agnes_api.py image --prompt "..." --size 9:16
```

### CI/CD / Automated Pipelines

```bash
# Non-interactive usage (outputs JSON)
python scripts/agnes_api.py image --prompt "..." --size 9:16 --raw

# Download result with jq
python scripts/agnes_api.py image --prompt "..." --size 9:16 --raw | \
  jq -r '.data[0].url' | xargs curl -o output.png
```

### Prerequisites

- **Python 3.11+** — no external packages required (uses only stdlib)
- **Pillow** (optional) — for automatic image resizing when base64 encoding large files
  ```bash
  pip install Pillow
  ```
- **picgo** (optional, for local image-to-video) — uploads local images to CDN
  ```bash
  npm install -g picgo
  ```
