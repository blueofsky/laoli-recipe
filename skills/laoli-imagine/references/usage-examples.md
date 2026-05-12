# Usage Examples

Extended CLI examples. SKILL.md shows the minimum set; read this file when the user asks about provider-specific invocation, batch generation, or less-common flags.

## Core Patterns

```bash
# Basic text-to-image
${BUN_X} {baseDir}/scripts/main.ts --prompt "A cat" --image cat.png

# With aspect ratio
${BUN_X} {baseDir}/scripts/main.ts --prompt "A landscape" --image out.png --ar 16:9

# High quality
${BUN_X} {baseDir}/scripts/main.ts --prompt "A cat" --image out.png --quality 2k

# Prompt from files
${BUN_X} {baseDir}/scripts/main.ts --promptfiles system.md content.md --image out.png

# With reference images
${BUN_X} {baseDir}/scripts/main.ts --prompt "Make blue" --image out.png --ref source.png
```

## Per-Provider

### Tuzi

```bash
# Tuzi (default model)
${BUN_X} {baseDir}/scripts/main.ts --prompt "A fashion editorial portrait" --image out.jpg --provider tuzi

# Tuzi with explicit model
${BUN_X} {baseDir}/scripts/main.ts --prompt "A fashion editorial portrait" --image out.jpg --provider tuzi --model gpt-image-2

# Tuzi with reference image
${BUN_X} {baseDir}/scripts/main.ts --prompt "A girl by the library window" --image out.jpg --provider tuzi --model gpt-image-2 --ref portrait.png --ar 16:9
```

### APIMart

```bash
# APIMart (default: gpt-image-2)
${BUN_X} {baseDir}/scripts/main.ts --prompt "一只可爱的猫" --image out.png --provider apimart

# APIMart with Gemini model
${BUN_X} {baseDir}/scripts/main.ts --prompt "A cinematic landscape" --image out.png --provider apimart --model gemini-3.1-flash-image-preview

# APIMart with reference image
${BUN_X} {baseDir}/scripts/main.ts --prompt "Make it blue" --image out.png --provider apimart --model gpt-image-2 --ref source.png

# APIMart Seedream model (2K/3K only)
${BUN_X} {baseDir}/scripts/main.ts --prompt "A poster with Chinese text" --image out.png --provider apimart --model seedream-5.0-lite --ar 16:9
```

## Batch Mode

```bash
# Batch from saved prompt files
${BUN_X} {baseDir}/scripts/main.ts --batchfile batch.json

# Batch with explicit worker count
${BUN_X} {baseDir}/scripts/main.ts --batchfile batch.json --jobs 4 --json
```

### Batch File Format

> ⚠️ **完整的字段定义、所有可选值、常见错误对照表请查阅 `references/batch-schema.md`**。以下仅作快速示例。

```json
{
  "jobs": 4,
  "tasks": [
    {
      "id": "hero",
      "promptFiles": ["prompts/hero.md"],
      "image": "out/hero.png",
      "provider": "apimart",
      "model": "gpt-image-2",
      "ar": "16:9",
      "quality": "2k"
    },
    {
      "id": "portrait",
      "promptFiles": ["prompts/portrait.md"],
      "image": "out/portrait.png",
      "provider": "tuzi",
      "model": "gpt-image-2",
      "ref": ["references/ref.png"]
    }
  ]
}
```

Paths in `promptFiles`, `image`, and `ref` are resolved relative to the batch file's directory. `jobs` is optional (overridden by CLI `--jobs`). A top-level array without the `jobs` wrapper is also accepted.
