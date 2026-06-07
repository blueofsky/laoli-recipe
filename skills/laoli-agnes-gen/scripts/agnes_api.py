#!/usr/bin/env python3
"""CLI for Agnes AI image and video generation APIs."""

from __future__ import annotations

import argparse
import base64
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
from typing import Any


BASE_URL = "https://apihub.agnes-ai.com"
TEXT_MODEL = "agnes-2.0-flash"
IMAGE_MODEL = "agnes-image-2.1-flash"
VIDEO_MODEL = "agnes-video-v2.0"
SIZE_RE = re.compile(r"^[1-9]\d*x[1-9]\d*$")
ASPECT_RE = re.compile(r"^(\d+):(\d+)$")

# Aspect ratio → pixel dimension lookups
# Default: 1536p benchmark — optimized for Agnes image API pixel limits
# (the API rejects 2MP+ sizes like 1080x1920 with 500 Internal Server Error).
# Each mapping keeps total pixels within ~1.3MP for reliable generation.
# Video generation uses a separate VIDEO_ASPECT_MAP (see below).
ASPECT_TO_SIZE = {
    "16:9": "1536x864",
    "9:16": "864x1536",
    "1:1": "1024x1024",
    "4:3": "1280x960",
    "3:2": "1440x960",
    "2:3": "960x1440",
    "21:9": "1536x658",
    "9:21": "658x1536",
}

# High-quality fallback (same pixel-safe constraints as default)
# Agnes Image API rejects sizes beyond ~1.3-1.5MP with 500 error,
# so HQ uses the same pixel-count-safe dimensions.
ASPECT_TO_SIZE_HQ = {
    "16:9": "1536x864",
    "9:16": "864x1536",
    "1:1": "1152x1152",
    "4:3": "1280x960",
    "3:2": "1440x960",
    "2:3": "960x1440",
    "21:9": "1536x658",
    "9:21": "658x1536",
}

# Aspect ratio → video dimensions (longer side = 1152px for better video quality)
ASPECT_TO_VIDEO = {
    "16:9": (1152, 648),
    "9:16": (648, 1152),
    "1:1": (768, 768),
    "4:3": (1152, 864),
    "3:2": (1152, 768),
    "2:3": (768, 1152),
    "21:9": (1152, 494),
    "9:21": (494, 1152),
}

# Supported local image formats and their MIME types
IMAGE_MIME_MAP = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".bmp": "image/bmp",
}


def resolve_image_sources(sources: list[str]) -> list[str]:
    """Resolve a list of image paths/URLs. Local files are converted to base64 data URLs."""
    resolved = []
    for src in sources:
        src_stripped = src.strip()
        # If it already looks like a URL, pass through
        if src_stripped.startswith(("http://", "https://", "data:", "file://")):
            resolved.append(src_stripped)
            continue
        # Otherwise treat as a local file path
        if not os.path.isfile(src_stripped):
            raise SystemExit(f"Image file not found: {src_stripped}")
        ext = os.path.splitext(src_stripped)[1].lower()
        mime = IMAGE_MIME_MAP.get(ext)
        if not mime:
            raise SystemExit(
                f"Unsupported image format: {ext} (from {src_stripped}). "
                f"Supported: {', '.join(IMAGE_MIME_MAP.keys())}"
            )
        # Resize large images to avoid oversized base64 payloads
        image_data = _maybe_resize_image(src_stripped)
        b64_bytes = base64.b64encode(image_data)
        # Ensure padding to multiple of 4
        b64_str = b64_bytes.decode("ascii")
        padding = (4 - len(b64_str) % 4) % 4
        if padding:
            b64_str += "=" * padding
        resolved.append(f"data:{mime};base64,{b64_str}")
    return resolved


def _maybe_resize_image(filepath: str, max_dim: int = 1024) -> bytes:
    """Resize large images (>= 512KB) to avoid oversized base64 payloads."""
    size = os.path.getsize(filepath)
    if size < 512 * 1024:
        with open(filepath, "rb") as f:
            return f.read()
    # Try PIL for resizing
    try:
        from PIL import Image
        import io
        img = Image.open(filepath)
        # Scale down so the longer side is max_dim
        w, h = img.size
        if w > max_dim or h > max_dim:
            ratio = max_dim / max(w, h)
            img = img.resize((int(w * ratio), int(h * ratio)), Image.LANCZOS)
        buf = io.BytesIO()
        fmt = img.format or "PNG"
        img.save(buf, format=fmt, optimize=True)
        result = buf.getvalue()
        saved = size - len(result)
        print(f"  📐 图片已缩放: {w}x{h} → {img.size[0]}x{img.size[1]}, 节省 {saved // 1024}KB", file=sys.stderr)
        return result
    except ImportError:
        print("  ⚠️  图片 > 512KB，建议安装 Pillow 以自动缩放", file=sys.stderr)
        with open(filepath, "rb") as f:
            return f.read()


def load_dotenv() -> None:
    """Load .env file from CWD, script directory, .workbuddy, or home directory (in order)."""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    candidates = [
        os.path.join(os.getcwd(), ".env"),
        os.path.join(script_dir, ".env"),
        os.path.join(os.path.expanduser("~"), ".workbuddy", ".env"),
        os.path.join(os.path.expanduser("~"), ".env"),
    ]
    for path in candidates:
        if os.path.isfile(path):
            with open(path, encoding="utf-8") as f:
                for line in f:
                    stripped = line.strip()
                    if not stripped or stripped.startswith("#") or "=" not in stripped:
                        continue
                    key, _, value = stripped.partition("=")
                    key, value = key.strip(), value.strip().strip("\"'").strip()
                    if key and value and key not in os.environ:
                        os.environ[key] = value


def get_api_key() -> str:
    load_dotenv()
    for name in ("AGNES_API_KEY", "AGNES_API_TOKEN", "APIHUB_AGNES_API_KEY"):
        value = os.environ.get(name)
        if value:
            return value
    raise SystemExit(
        "Missing API key. Set AGNES_API_KEY in .env file, "
        "or export AGNES_API_KEY / AGNES_API_TOKEN / APIHUB_AGNES_API_KEY."
    )


def request_json(method: str, path: str, payload: dict[str, Any] | None = None,
                 base: str | None = None, timeout: int = 120) -> dict[str, Any]:
    """Send a JSON request. Default base is BASE_URL (apihub.agnes-ai.com)."""
    full_url = (base or BASE_URL) + path
    body = None if payload is None else json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        full_url,
        data=body,
        method=method,
        headers={
            "Authorization": f"Bearer {get_api_key()}",
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            text = resp.read().decode("utf-8")
            return json.loads(text) if text else {}
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise SystemExit(f"HTTP {exc.code} from {full_url}: {detail}") from exc
    except urllib.error.URLError as exc:
        raise SystemExit(f"Request failed for {full_url}: {exc}") from exc


def print_json(data: Any) -> None:
    print(json.dumps(data, ensure_ascii=False, indent=2))


def parse_json_arg(name: str, value: str) -> Any:
    try:
        return json.loads(value)
    except json.JSONDecodeError as exc:
        raise SystemExit(f"Invalid JSON for {name}: {exc.msg} at position {exc.pos}") from exc


def needs_english_translation(prompt: str) -> bool:
    return any(ord(ch) > 127 for ch in prompt)


def translate_prompt_to_english(prompt: str) -> str:
    payload = {
        "model": TEXT_MODEL,
        "messages": [
            {
                "role": "system",
                "content": (
                    "Translate the user's image/video generation prompt into fluent English. "
                    "Preserve all concrete visual details, style words, camera motion, lighting, "
                    "composition constraints, and negative instructions. Return only the English prompt."
                ),
            },
            {"role": "user", "content": prompt},
        ],
        "temperature": 0,
        "max_tokens": 800,
    }
    data = request_json("POST", "/v1/chat/completions", payload)
    try:
        translated = data["choices"][0]["message"]["content"].strip()
    except (KeyError, IndexError, TypeError) as exc:
        raise SystemExit(f"Prompt translation failed: {json.dumps(data, ensure_ascii=False)}") from exc
    if not translated:
        raise SystemExit("Prompt translation failed: empty translated prompt")
    return translated


def prepare_generation_prompt(prompt: str, translate: bool = True) -> tuple[str, str | None]:
    if translate and needs_english_translation(prompt):
        translated = translate_prompt_to_english(prompt)
        return translated, translated
    return prompt, None



def output_result(
    result_type: str,
    raw: dict[str, Any],
    *,
    prompt_used: str | None = None,
    translated_prompt: str | None = None,
    urls: list[str] | None = None,
    status: str | None = None,
    next_steps: list[str] | None = None,
    raw_only: bool = False,
) -> None:
    if raw_only:
        print_json(raw)
        return
    summary: dict[str, Any] = {"type": result_type}
    if status:
        summary["status"] = status
    if urls:
        summary["urls"] = urls
    if prompt_used:
        summary["prompt_used"] = prompt_used
    if translated_prompt:
        summary["translated_prompt"] = translated_prompt
    if next_steps:
        summary["next_steps"] = next_steps
    summary["raw"] = raw
    print_json(summary)


def extract_image_urls(data: dict[str, Any]) -> list[str]:
    urls = []
    if isinstance(data.get("url"), str):
        urls.append(data["url"])
    if isinstance(data.get("image_url"), str):
        urls.append(data["image_url"])
    if isinstance(data.get("data"), list):
        for item in data["data"]:
            if isinstance(item, dict):
                for key in ("url", "image_url"):
                    if isinstance(item.get(key), str):
                        urls.append(item[key])
    return urls


def extract_video_urls(data: dict[str, Any]) -> list[str]:
    urls = []
    for key in ("video_url", "url", "remixed_from_video_id"):
        value = data.get(key)
        if isinstance(value, str) and value.startswith(("http://", "https://")):
            urls.append(value)
    if isinstance(data.get("data"), list):
        for item in data["data"]:
            if isinstance(item, dict):
                urls.extend(extract_video_urls(item))
    return list(dict.fromkeys(urls))


def resolve_size(value: str | None, use_hq: bool = False) -> str | None:
    """Convert an aspect ratio string (e.g. '16:9') to pixel dimensions, or pass through 'WxH'.
    
    use_hq: When True, uses the high-quality 1536px-based mapping instead of default 1080p.
    """
    if not value:
        return value
    m = ASPECT_RE.match(value)
    if m:
        table = ASPECT_TO_SIZE_HQ if use_hq else ASPECT_TO_SIZE
        resolved = table.get(value)
        if not resolved:
            raise SystemExit(f"Unknown aspect ratio: {value}. Supported: {', '.join(ASPECT_TO_SIZE.keys())}")
        return resolved
    return value


def validate_size(value: str | None, name: str = "size") -> None:
    if value and not SIZE_RE.match(value):
        raise SystemExit(f"Invalid {name}: {value}. Expected WIDTHxHEIGHT (e.g. 1024x768) or aspect ratio (e.g. 16:9).")


def validate_video_args(args: argparse.Namespace) -> None:
    # If --seconds is provided, auto-calculate num_frames
    if args.seconds is not None:
        if args.seconds < 1 or args.seconds > 15:
            raise SystemExit("Invalid --seconds: supported range is 1-15.")
        target_frames = args.seconds * args.frame_rate
        n = max(10, min(55, round((target_frames - 1) / 8)))
        args.num_frames = 8 * n + 1
        actual = args.num_frames / args.frame_rate
        print(f"  ⏱ {args.seconds}s → num_frames={args.num_frames} @ {args.frame_rate}fps = {actual:.3f}s", file=sys.stderr)
    # Default to 121 frames (~5s) if neither --seconds nor --num-frames is given
    elif args.num_frames is None:
        args.num_frames = 121
    if args.num_frames > 441 or (args.num_frames - 1) % 8 != 0:
        raise SystemExit("Invalid --num-frames: must be <= 441 and satisfy 8n + 1, for example 81 or 121.")
    if args.frame_rate is not None and not (1 <= args.frame_rate <= 60):
        raise SystemExit("Invalid --frame-rate: supported range is 1-60.")
    for name in ("height", "width"):
        value = getattr(args, name)
        if value is not None and value <= 0:
            raise SystemExit(f"Invalid --{name.replace('_', '-')}: must be a positive integer.")



def cmd_image(args: argparse.Namespace) -> None:
    args.size = resolve_size(args.size, args.hq)
    validate_size(args.size)
    prompt, translated_prompt = prepare_generation_prompt(args.prompt, not args.no_translate_prompt)
    payload: dict[str, Any] = {
        "model": IMAGE_MODEL,
        "prompt": prompt,
    }
    if args.size:
        payload["size"] = args.size
    extra: dict[str, Any] = {"response_format": "url"}
    if args.image:
        extra["image"] = resolve_image_sources(args.image)
    if extra:
        payload["extra_body"] = extra
    data = request_json("POST", "/v1/images/generations", payload)
    urls = extract_image_urls(data)
    output_result(
        "image-to-image" if args.image else "text-to-image",
        data,
        prompt_used=prompt,
        translated_prompt=translated_prompt,
        urls=urls,
        raw_only=args.raw,
    )


def picgo_upload(filepath: str) -> str:
    """Upload an image via picgo-core (GitHub CDN) and return the public URL."""
    import subprocess
    result = subprocess.run(
        ["picgo", "upload", os.path.abspath(filepath)],
        capture_output=True, text=True, timeout=30,
    )
    if result.returncode != 0:
        raise SystemExit(
            "picgo 上传失败，请确认已全局安装：npm install -g picgo\n"
            f"错误: {result.stderr[:200]}"
        )
    out = result.stdout.strip()
    for line in out.splitlines():
        line = line.strip()
        if line.startswith("http"):
            return line
    raise SystemExit(f"picgo upload failed. Output:\n{out[:300]}")


def video_payload(args: argparse.Namespace) -> dict[str, Any]:
    validate_video_args(args)
    # Resolve --aspect into width/height if set
    if args.aspect:
        dims = ASPECT_TO_VIDEO.get(args.aspect)
        if not dims:
            raise SystemExit(f"Unknown aspect ratio: {args.aspect}. Supported: {', '.join(ASPECT_TO_VIDEO.keys())}")
        w, h = dims
        # Explicit --width/--height override aspect-derived values
        args.width = args.width or w
        args.height = args.height or h
    prompt, translated_prompt = prepare_generation_prompt(args.prompt, not args.no_translate_prompt)
    args._prompt_used = prompt
    args._translated_prompt = translated_prompt
    payload: dict[str, Any] = {
        "model": VIDEO_MODEL,
        "prompt": prompt,
    }
    for name in (
        "height",
        "width",
        "num_frames",
        "frame_rate",
        "num_inference_steps",
        "seed",
        "negative_prompt",
    ):
        value = getattr(args, name)
        if value is not None:
            payload[name] = value
    if args.mode:
        payload["mode"] = args.mode
    if args.image:
        # Video API doesn't support data URLs. Use picgo to upload local images to CDN.
        resolved = resolve_image_sources(args.image)
        final_images = []
        for src in resolved:
            if src.startswith("data:"):
                # Decode base64 to temp file and upload via picgo
                import io
                import tempfile
                header, _, b64data = src.partition(",")
                raw_bytes = base64.b64decode(b64data)
                mime = header.split(";")[0].split(":")[1] if ":" in header else "image/png"
                ext_map = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif"}
                ext = ext_map.get(mime, ".png")
                tmpf = tempfile.NamedTemporaryFile(suffix=ext, delete=False)
                tmpf.write(raw_bytes)
                tmpf.close()
                public_url = picgo_upload(tmpf.name)
                os.unlink(tmpf.name)
                print(f"  📤 本地图片已上传: {public_url}", file=sys.stderr)
                final_images.append(public_url)
            else:
                final_images.append(src)
        payload["extra_body"] = {"image": final_images}
        if args.mode:
            payload["extra_body"]["mode"] = args.mode
    return payload


def poll_video(task_id: str, timeout: int, interval: int) -> dict[str, Any]:
    deadline = time.time() + timeout
    last: dict[str, Any] = {}
    while time.time() < deadline:
        last = request_json("GET", f"/v1/videos/{task_id}")
        if last.get("error"):
            raise SystemExit(f"Video task {task_id} returned error: {json.dumps(last, ensure_ascii=False)}")
        status = str(last.get("status", "")).lower()
        progress = last.get("progress")
        if status:
            print(f"video {task_id}: status={status} progress={progress}", file=sys.stderr)
        if status in {"completed", "failed"}:
            return last
        time.sleep(interval)
    raise SystemExit(f"Timed out waiting for video task {task_id}. Last response: {json.dumps(last)}")


def poll_video_by_video_id(video_id: str, timeout: int, interval: int) -> dict[str, Any]:
    """Poll video status using video_id via /agnesapi?video_id= (official recommended way)."""
    deadline = time.time() + timeout
    last: dict[str, Any] = {}
    while time.time() < deadline:
        last = request_json("GET", f"/agnesapi?video_id={video_id}", base=BASE_URL)
        if last.get("error"):
            raise SystemExit(f"Video {video_id} returned error: {json.dumps(last, ensure_ascii=False)}")
        status = str(last.get("status", "")).lower()
        progress = last.get("progress")
        if status:
            print(f"video {video_id}: status={status} progress={progress}", file=sys.stderr)
        if status in {"completed", "failed"}:
            return last
        time.sleep(interval)
    raise SystemExit(f"Timed out waiting for video {video_id}. Last response: {json.dumps(last)}")


def cmd_video(args: argparse.Namespace) -> None:
    created = request_json("POST", "/v1/videos", video_payload(args))
    task_id = created.get("id")
    video_id = created.get("video_id")
    if not args.poll:
        next_steps = []
        if video_id:
            next_steps.append(f"python scripts/agnes_api.py video-query {video_id}")
        elif task_id:
            next_steps.append(f"python scripts/agnes_api.py video-get {task_id}")
        output_result(
            "video-task",
            created,
            prompt_used=getattr(args, "_prompt_used", None),
            translated_prompt=getattr(args, "_translated_prompt", None),
            status=str(created.get("status", "")) if created.get("status") is not None else None,
            next_steps=next_steps,
            raw_only=args.raw,
        )
        return
    # Use video_id for polling (recommended, avoids long queues)
    if video_id:
        data = poll_video_by_video_id(str(video_id), args.timeout, args.interval)
    elif task_id:
        data = poll_video(str(task_id), args.timeout, args.interval)
    else:
        raise SystemExit(f"Video create response did not include id or video_id: {json.dumps(created)}")
    urls = extract_video_urls(data)
    output_result(
        "video-result",
        data,
        prompt_used=getattr(args, "_prompt_used", None),
        translated_prompt=getattr(args, "_translated_prompt", None),
        urls=urls,
        status=str(data.get("status", "")) if data.get("status") is not None else None,
        raw_only=args.raw,
    )


def cmd_video_get(args: argparse.Namespace) -> None:
    data = request_json("GET", f"/v1/videos/{args.task_id}")
    urls = extract_video_urls(data)
    output_result(
        "video-result",
        data,
        urls=urls,
        status=str(data.get("status", "")) if data.get("status") is not None else None,
        next_steps=[] if urls else [f"python scripts/agnes_api.py video-get {args.task_id}"],
        raw_only=args.raw,
    )
    if data.get("error"):
        raise SystemExit(1)


def cmd_video_query(args: argparse.Namespace) -> None:
    """Query video status using video_id (official recommended way)."""
    data = request_json("GET", f"/agnesapi?video_id={args.video_id}", base=BASE_URL)
    urls = extract_video_urls(data)
    output_result(
        "video-result",
        data,
        urls=urls,
        status=str(data.get("status", "")) if data.get("status") is not None else None,
        next_steps=[] if urls else [f"python scripts/agnes_api.py video-query {args.video_id}"],
        raw_only=args.raw,
    )
    if data.get("error"):
        raise SystemExit(1)


def require_ok(name: str, data: dict[str, Any], keys: tuple[str, ...]) -> None:
    missing = [key for key in keys if key not in data]
    if missing:
        raise SystemExit(f"{name} response missing {missing}: {json.dumps(data)}")
    print(f"{name}: ok")


def require_video_ok(name: str, data: dict[str, Any], completed: bool = False) -> None:
    require_ok(name, data, ("id", "status"))
    if data.get("error"):
        raise SystemExit(f"{name} returned error: {json.dumps(data, ensure_ascii=False)}")
    status = str(data.get("status", "")).lower()
    if status == "failed":
        raise SystemExit(f"{name} failed: {json.dumps(data, ensure_ascii=False)}")
    if completed and status != "completed":
        raise SystemExit(f"{name} did not complete: {json.dumps(data, ensure_ascii=False)}")
    if completed and not extract_video_urls(data):
        raise SystemExit(f"{name} completed without a video URL: {json.dumps(data, ensure_ascii=False)}")



def extract_image_url(data: dict[str, Any]) -> str:
    candidates = extract_image_urls(data)
    if not candidates:
        raise SystemExit(f"Could not find image URL in response: {json.dumps(data, ensure_ascii=False)}")
    return candidates[0]


def create_video_case(name: str, payload: dict[str, Any], args: argparse.Namespace) -> dict[str, Any]:
    created = request_json("POST", "/v1/videos", payload)
    require_video_ok(f"{name}-create", created)
    task_id = str(created["id"])
    retrieved = (
        poll_video(task_id, args.video_timeout, args.video_interval)
        if args.poll_video
        else request_json("GET", f"/v1/videos/{task_id}")
    )
    require_video_ok(f"{name}-get", retrieved, completed=args.poll_video)
    return {"create": created, "get": retrieved}


VIDEO_CASES = ("text-to-video", "image-to-video", "multi-image", "keyframes")


def cmd_smoke_test(args: argparse.Namespace) -> None:
    args.image_size = resolve_size(args.image_size)
    validate_size(args.image_size, "image-size")
    validate_video_args(
        argparse.Namespace(
            seconds=None,
            num_frames=args.video_num_frames,
            frame_rate=args.video_frame_rate,
            height=args.video_height,
            width=args.video_width,
        )
    )

    image_text = request_json(
        "POST",
        "/v1/images/generations",
        {
            "model": IMAGE_MODEL,
            "prompt": "A simple red square icon centered on a white background",
            "size": args.image_size,
            "extra_body": {"response_format": "url"},
        },
    )
    require_ok("image-text-to-image", image_text, ("data",))
    generated_image_url = extract_image_url(image_text)

    image_edit = None
    edited_image_url = None
    selected_cases = set(args.video_case or [])
    needs_second_image = bool(selected_cases.intersection({"multi-image", "keyframes"}))
    if args.include_image_edit or needs_second_image:
        image_edit = request_json(
            "POST",
            "/v1/images/generations",
            {
                "model": IMAGE_MODEL,
                "prompt": "Turn this into a clean blue square icon while preserving the centered composition",
                "size": args.image_size,
                "extra_body": {"image": [generated_image_url], "response_format": "url"},
            },
        )
        require_ok("image-to-image", image_edit, ("data",))
        edited_image_url = extract_image_url(image_edit)

    video_common = {
        "model": VIDEO_MODEL,
    }
    for key, value in (
        ("height", args.video_height),
        ("width", args.video_width),
        ("num_frames", args.video_num_frames),
        ("frame_rate", args.video_frame_rate),
    ):
        if value is not None:
            video_common[key] = value
    video_results = {}
    if "text-to-video" in selected_cases:
        video_results["text_to_video"] = create_video_case(
            "video-text-to-video",
            {
                **video_common,
                "prompt": "A simple cinematic shot of a red square gently moving on a white background",
            },
            args,
        )
    if "image-to-video" in selected_cases:
        video_results["image_to_video"] = create_video_case(
            "video-image-to-video",
            {
                **video_common,
                "prompt": "Animate the icon with subtle floating motion, stable centered composition",
                "image": generated_image_url,
            },
            args,
        )
    if "multi-image" in selected_cases:
        if not edited_image_url:
            raise SystemExit("multi-image test requires an edited image URL")
        video_results["multi_image"] = create_video_case(
            "video-multi-image",
            {
                **video_common,
                "prompt": "Create a smooth transformation from the first icon to the second icon, stable centered composition",
                "extra_body": {"image": [generated_image_url, edited_image_url]},
            },
            args,
        )
    if "keyframes" in selected_cases:
        if not edited_image_url:
            raise SystemExit("keyframes test requires an edited image URL")
        video_results["keyframes"] = create_video_case(
            "video-keyframes",
            {
                **video_common,
                "prompt": "Create a smooth keyframe transition between the two icons, stable centered composition",
                "extra_body": {"image": [generated_image_url, edited_image_url], "mode": "keyframes"},
            },
            args,
        )
    print_json(
        {
            "image_text_to_image": image_text,
            "image_to_image": image_edit,
            "video": video_results,
        }
    )


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Call Agnes AI image and video generation APIs.")
    sub = parser.add_subparsers(dest="command", required=True)

    image = sub.add_parser("image", help="Generate or edit an image.")
    image.add_argument("--prompt", required=True)
    image.add_argument("--size", default="1024x768", help='Pixel dimensions (e.g. 1024x768) or aspect ratio (e.g. 16:9, 9:16).')
    image.add_argument("--image", action="append", help="Input image URL or local file path. Repeat for multiple images. Local files are auto-converted to base64.")
    image.add_argument(
        "--hq",
        action="store_true",
        help="Use high-quality 1536px-based resolution mapping (default is 1080p efficient).",
    )
    image.add_argument(
        "--no-translate-prompt",
        action="store_true",
        help="Do not translate non-English prompts before sending to the image API.",
    )
    image.add_argument("--raw", action="store_true", help="Print the raw provider response.")
    image.set_defaults(func=cmd_image)

    video = sub.add_parser("video", help="Create a video task.")
    video.add_argument("--prompt", required=True)
    video.add_argument("--image", action="append", help="Input image URL or local file path. Repeat for multi-image or keyframes. Local files are auto-converted to base64.")
    video.add_argument("--mode", choices=("ti2vid", "keyframes"))
    video.add_argument("--aspect", help="Aspect ratio shorthand, e.g. 16:9, 9:16, 1:1. Overridden by explicit --width/--height.")
    video.add_argument("--seconds", type=int, help="Target video duration in seconds (1-15). Auto-calculates optimal num_frames.")
    video.add_argument("--height", type=int)
    video.add_argument("--width", type=int)
    video.add_argument("--num-frames", type=int, default=None)
    video.add_argument("--frame-rate", type=float, default=24)
    video.add_argument("--num-inference-steps", type=int)
    video.add_argument("--seed", type=int)
    video.add_argument("--negative-prompt")
    video.add_argument(
        "--no-translate-prompt",
        action="store_true",
        help="Do not translate non-English prompts before sending to the video API.",
    )
    video.add_argument("--poll", action="store_true")
    video.add_argument("--timeout", type=int, default=900)
    video.add_argument("--interval", type=int, default=10)
    video.add_argument("--raw", action="store_true", help="Print the raw provider response.")
    video.set_defaults(func=cmd_video)

    video_get = sub.add_parser("video-get", help="Retrieve a video task by task_id (legacy).")
    video_get.add_argument("task_id")
    video_get.add_argument("--raw", action="store_true", help="Print the raw provider response.")
    video_get.set_defaults(func=cmd_video_get)

    video_query = sub.add_parser("video-query", help="Query video by video_id (official recommended way).")
    video_query.add_argument("video_id", help="The video_id returned when creating the task")
    video_query.add_argument("--raw", action="store_true", help="Print the raw provider response.")
    video_query.set_defaults(func=cmd_video_query)

    smoke = sub.add_parser("smoke-test", help="Run live image and video API tests.")
    smoke.add_argument("--image-size", default="1024x768")
    smoke.add_argument("--video-height", type=int)
    smoke.add_argument("--video-width", type=int)
    smoke.add_argument("--video-num-frames", type=int, default=81)
    smoke.add_argument("--video-frame-rate", type=float, default=24)
    smoke.add_argument("--include-image-edit", action="store_true", help="Also test image-to-image editing.")
    smoke.add_argument("--poll-video", action="store_true")
    smoke.add_argument("--video-timeout", type=int, default=900)
    smoke.add_argument("--video-interval", type=int, default=10)
    smoke.add_argument(
        "--video-case",
        action="append",
        choices=VIDEO_CASES,
        help="Video case to test. Repeat to test multiple cases. Omit to skip video creation.",
    )
    smoke.set_defaults(func=cmd_smoke_test)

    return parser


def main() -> None:
    args = build_parser().parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
