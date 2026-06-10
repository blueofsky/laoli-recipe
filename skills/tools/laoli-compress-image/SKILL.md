---
name: laoli-compress-image
description: 压缩图片技能，Compresses images to WebP (default) or PNG with automatic tool selection. Use when user asks to "compress image", "optimize image", "convert to webp", or reduce image file size.
version: 1.56.1
---

# Image Compressor

Compresses images using best available tool (sips → cwebp → ImageMagick → Sharp).

## Script Directory

Scripts in `scripts/` subdirectory. `{baseDir}` = this SKILL.md's directory path. Resolve `${BUN_X}` runtime: if `bun` installed → `bun`; if `npx` available → `npx -y bun`; else suggest installing bun. Replace `{baseDir}` and `${BUN_X}` with actual values.

| Script | Purpose |
|--------|---------|
| `scripts/main.ts` | Image compression CLI |

## Configuration

Configuration is managed via `laoli recipe` CLI:

```bash
laoli recipe get --skill laoli-compress-image          # Get current config
laoli recipe set --skill laoli-compress-image --key default_format --value webp
laoli recipe set --skill laoli-compress-image --key default_quality --value 80
laoli recipe set --skill laoli-compress-image --key keep_original --value false
laoli recipe schema --skill laoli-compress-image       # View config schema
```

If no config exists, built-in defaults are used automatically.

## Usage

```bash
${BUN_X} {baseDir}/scripts/main.ts <input> [options]
```

## Options

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `<input>` | | File or directory | Required |
| `--output` | `-o` | Output path | Same path, new ext |
| `--format` | `-f` | webp, png, jpeg | webp |
| `--quality` | `-q` | Quality 0-100 | 80 |
| `--keep` | `-k` | Keep original | false |
| `--recursive` | `-r` | Process subdirs | false |
| `--json` | | JSON output | false |

## Examples

```bash
# Single file → WebP (replaces original)
${BUN_X} {baseDir}/scripts/main.ts image.png

# Keep PNG format
${BUN_X} {baseDir}/scripts/main.ts image.png -f png --keep

# Directory recursive
${BUN_X} {baseDir}/scripts/main.ts ./images/ -r -q 75

# JSON output
${BUN_X} {baseDir}/scripts/main.ts image.png --json
```

**Output**:
```
image.png → image.webp (245KB → 89KB, 64% reduction)
```

## Extension Support

Custom configurations via `laoli recipe` CLI. See **Configuration** section for commands.
