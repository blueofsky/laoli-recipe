---
name: batch-schema
description: Batch JSON file format specification for laoli-imagine — fields, valid values, and common mistakes
---

# Batch JSON Schema

## Format Overview

支持两种顶层结构：

### 格式 A（推荐）— 对象包裹，可设全局 worker 数

```json
{
  "jobs": 4,
  "tasks": [
    { /* task 1 */ },
    { /* task 2 */ }
  ]
}
```

### 格式 B — 纯数组

```json
[
  { /* task 1 */ },
  { /* task 2 */ }
]
```

## Task 字段定义

| 字段 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `id` | string | 否 | 任务标识（默认 `task-01`、`task-02`...） |
| `prompt` | string | 与 `promptFiles` 二选一 | 内联提示词 |
| `promptFiles` | string[] | 与 `prompt` 二选一 | 提示词文件路径（**相对 batch.json 所在目录**） |
| `image` | string | **是** | 输出图片路径（相对 batch.json 所在目录） |
| `provider` | string | 否 | `"tuzi"` 或 `"apimart"`（默认自动检测） |
| `model` | string | 否 | 模型 ID，如 `"gpt-image-2"`（默认由配置/环境变量决定） |
| `ar` | string | 否 | 宽高比，如 `"16:9"`、`"9:16"`、`"1:1"`、`"4:3"`、`"3:4"`、`"2.35:1"` |
| `size` | string | 否 | 显式尺寸，如 `"1024x1024"`（覆盖 `ar`） |
| `quality` | string | 否 | `"normal"` 或 `"2k"`（默认 `2k`） |
| `imageSize` | string | 否 | `"1K"`、`"2K"`、`"4K"`（覆盖 quality 的尺寸） |
| `ref` | string[] | 否 | 参考图路径列表（相对 batch.json 所在目录） |
| `n` | number | 否 | 生成数量（默认 1） |

## 常见错误 ❌

### 1. 字段名写错

```json
// ❌ 错误
{ "aspectRatio": "16:9", "referenceImages": ["ref.png"], "output": "out.png" }

// ✅ 正确
{ "ar": "16:9", "ref": ["ref.png"], "image": "out.png" }
```

### 2. 路径用了绝对路径

```json
// ❌ 错误（路径会被解析为相对 batch.json 的路径，绝对路径一般没问题但不好移植）
{ "promptFiles": ["C:/Users/me/prompts/hero.md"], "image": "C:/out/hero.png" }

// ✅ 正确（使用相对路径，相对于 batch.json 所在目录）
{ "promptFiles": ["prompts/hero.md"], "image": "attachments/hero.png" }
```

### 3. 拼写错误

```json
// ❌ 错误
{ "provider": "apimart", "ar": "19:6", "quality": "2k", "imageSize": "2K" }

// ✅ 正确
{ "provider": "apimart", "ar": "16:9", "quality": "2k", "imageSize": "2K" }
```

### 4. 缺少 `image` 字段

```json
// ❌ 错误（每个 task 必须指定输出路径）
{ "id": "hero", "promptFiles": ["hero.md"] }

// ✅ 正确
{ "id": "hero", "promptFiles": ["hero.md"], "image": "out/hero.png" }
```

### 5. 同时省略 `prompt` 和 `promptFiles`

```json
// ❌ 错误（必须二选一）
{ "id": "hero", "image": "out.png" }

// ✅ 正确（用 promptFiles 指向文件）
{ "id": "hero", "promptFiles": ["prompts/hero.md"], "image": "out/hero.png" }

// 或（用 prompt 内联）
{ "id": "hero", "prompt": "a cat", "image": "out/hero.png" }
```

### 6. `promptFiles` 传了字符串而非数组

```json
// ❌ 错误
{ "promptFiles": "prompts/hero.md" }

// ✅ 正确
{ "promptFiles": ["prompts/hero.md"] }
```

### 7. 必须同时有 prompt 和 image

每个 task 必须同时满足：
- 有 `prompt` 或 `promptFiles`
- 有 `image`

否则脚本会在 `prepareBatchTasks` 阶段抛出错误。

## 完整示例

### 多图生成（promptFiles）

```json
{
  "jobs": 3,
  "tasks": [
    {
      "id": "hero",
      "promptFiles": ["prompts/hero.md"],
      "image": "attachments/hero.png",
      "provider": "apimart",
      "model": "gpt-image-2",
      "ar": "16:9",
      "quality": "2k"
    },
    {
      "id": "portrait",
      "promptFiles": ["prompts/portrait.md"],
      "image": "attachments/portrait.png",
      "provider": "tuzi",
      "ar": "9:16",
      "ref": ["references/face.png"]
    },
    {
      "id": "icon",
      "promptFiles": ["prompts/icon.md"],
      "image": "attachments/icon.png",
      "ar": "1:1"
    }
  ]
}
```

### 多图生成（内联 prompt）

```json
{
  "tasks": [
    {
      "id": "img-01",
      "prompt": "beautiful Asian girl, vintage film portrait",
      "image": "out/portrait-01.png",
      "ar": "9:16",
      "quality": "2k"
    },
    {
      "id": "img-02",
      "prompt": "Japanese garden in spring, watercolor style",
      "image": "out/garden-02.png",
      "ar": "16:9"
    }
  ]
}
```

## 路径说明

- `promptFiles`、`image`、`ref` 中的路径均**相对于 batch.json 所在目录解析**
- 也支持绝对路径，但不推荐（不方便移植）

## 来自 laoli-article-illustrator 的批量生成

如果输入来自 `laoli-article-illustrator`（outline.md + prompts/），应使用 `build-batch.ts` 脚本自动构建 batch.json：

```bash
bun scripts/build-batch.ts \
  --outline outline.md \
  --prompts prompts \
  --output batch.json \
  --images-dir attachments \
  --ar 16:9 \
  --provider apimart
```
