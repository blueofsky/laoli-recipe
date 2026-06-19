---
name: laoli-image
description: >
  AI 图片生成。使用 laoli image 命令生成和编辑图片。
  当用户需要生成图片、创建插图、设计素材、图生图修改或批量生成图片时触发。
license: MIT
metadata:
  version: "1.0.0"
  category: creative
triggers:
  - 生成图片
  - 画图
  - 文生图
  - 图生图
  - 批量生成图片
  - 图片编辑
  - create image
  - generate picture
  - text to image
  - image to image
sources:
  - laoli image generate --help
  - laoli image batch --help
---

# 图片生成 Skill

使用 `laoli image` 命令生成图片。

## 前置条件

- 安装 CLI：`npm install -g laoli-creative`
- 配置至少一个 Provider 的 API Key（如 agnes、apimart、tuzi）：
  ```bash
  laoli auth login --api-key sk-xxxxx --provider agnes
  ```

## 命令

### 文生图 / 图生图

```bash
laoli image generate --prompt <text> --output <path> [options]
```

| 选项 | 说明 |
|------|------|
| `--prompt <text>` | 图片描述（必填） |
| `--output <path>` | 输出路径（必填） |
| `--provider <name>` | Provider: agnes（默认）, apimart, tuzi |
| `--model <id>` | 模型 ID（默认 agnes-image-2.1-flash） |
| `--aspect-ratio <ratio>` | 宽高比：16:9, 9:16, 1:1, 4:3（默认 1:1） |
| `--size <WxH>` | 尺寸：1024x1024（可选，不填则由 provider 决定） |
| `--quality <level>` | 质量：normal、2k（默认） |
| `--ref <files...>` | 参考图片路径或 URL（图生图） |
| `--n <count>` | 生成数量（默认 1） |
| `--json` | JSON 输出 |
| `--quiet` | 抑制非必要输出 |

### 批量生成

```bash
laoli image batch (--param <json> | --batchfile <path>) [options]
```

| 选项 | 说明 |
|------|------|
| `--param <json>` | 内联 JSON 数组（二选一） |
| `--batchfile <path>` | JSON 批处理文件路径（二选一） |
| `--jobs <count>` | 并发数（默认 4） |
| `--json` | JSON 输出 |
| `--quiet` | 抑制非必要输出 |

**内联传参（`--param`）**：

```bash
# 简洁场景：每个 item 只用 prompt + output
laoli image batch --param '[{"prompt":"一只猫","output":"cat.png"},{"prompt":"一只狗","output":"dog.png"}]'

# 图生图：每个 item 独立 ref
laoli image batch --param '[{"prompt":"加个帽子","output":"with-hat.png","ref":"portrait.jpg"},{"prompt":"换个颜色","output":"recolor.png","ref":"portrait.jpg"}]'

# 每个 item 可独立指定 provider、model、aspect-ratio 等
laoli image batch --param '[{"prompt":"风景","output":"a.png","aspect-ratio":"16:9"},{"prompt":"人像","output":"b.png","aspect-ratio":"9:16","quality":"2k"}]'
```

**路径规则（两种传参方式通用）**：

所有路径都基于**运行 `laoli` 命令时终端所在的目录**（可用 `pwd` 查看），而不是 batch.json 或脚本所在的目录。

| 字段 | 解析方式 | 说明 |
|------|---------|------|
| `output` | 相对于**终端目录** | 建议直接写文件名，文件会生成在终端目录下 |
| `ref` | 相对于**终端目录** | 支持 `../images/ref.png` 等相对路径，也支持绝对路径 |
| `prompt_file` | 相对于 batch.json 所在目录 | ❌ **`--param` 模式下不支持**，仅 `--batchfile` 可用 |

示例：假设终端在 `D:\项目\素材`，则：
- `output: "cat.png"` → 生成到 `D:\项目\素材\cat.png`
- `ref: "../refs/portrait.jpg"` → 指向 `D:\项目\refs\portrait.jpg`

**`ref` 字段**：字符串或数组格式均可（如 `"../ref/image.jpg"` 或 `["../ref/image.jpg"]`）

---

**文件传参（`--batchfile`）示例**：

终端在 `D:\项目\素材\图片` 下运行：

```bash
cd D:\项目\素材\图片
laoli image batch --batchfile batch.json
```

batch.json：
```json
[
  {
    "prompt": "Soviet military officer staring at radar screen...",
    "output": "scene01.jpg",
    "ref": ["../定妆/ref_PET01.jpg"]
  }
]
```

路径解析：
- `output: "scene01.jpg"` → `D:\项目\素材\图片\scene01.jpg`
- `ref: "../定妆/ref_PET01.jpg"` → `D:\项目\素材\定妆\ref_PET01.jpg`

**内联传参（`--param`）示例**：

终端在 `D:\项目` 下运行：

```bash
cd D:\项目
laoli image batch --param '[{"prompt":"猫","output":"cat.png","ref":"refs/portrait.jpg"}]'
```

路径解析：
- `output: "cat.png"` → `D:\项目\cat.png`
- `ref: "refs/portrait.jpg"` → `D:\项目\refs\portrait.jpg`

## 工作流程

1. **确认需求**：文生图还是图生图？是否批量？
2. **构建 prompt**：清晰描述画面内容、风格、构图
3. **选择参数**：provider、尺寸、宽高比、质量
4. **调用生成**：`laoli image generate --prompt "..." --output output.png`
5. **返回结果**：提供文件路径，如需上传图床再用 `laoli picgo upload`

## 示例

```bash
# 文生图
laoli image generate --prompt "A cat in a spacesuit" --output cat.png

# 指定宽高比
laoli image generate --prompt "Landscape" --aspect-ratio 16:9 --output landscape.png

# 图生图（参考图片）
laoli image generate --prompt "Add a hat" --ref portrait.png --output portrait-hat.png

# 批量生成

laoli image batch --param '[{"prompt":"一只猫","output":"cat.png"},{"prompt":"一只狗","output":"dog.png"}]' --job 2
laoli image batch --batchfile batch.json --jobs 3
```

## 注意事项

- 支持格式：PNG、JPG、WebP
- 参考图片支持本地文件和 URL
- 日志文件位于 `~/.laoli/logs/`
- 所有命令支持 `--help` 查看最新参数

## ⚠️ Provider 差异

| Provider | aspect-ratio | size | 推荐用法 |
|----------|-------------|------|----------|
| agnes | ✅ 生效 | ✅ 生效 | 默认选择 |
| tuzi (gpt-image-2) | ❌ **忽略** | ✅ 生效 | 用 `--size 1024x1792` 代替 `--aspect-ratio 9:16` |
| apimart | ✅ 生效 | ✅ 生效 | - |

**tuzi provider 坑**：`--aspect-ratio 9:16` 会被忽略，生成 1:1 图片。必须用 `--size 1024x1792`（9:16）或 `--size 1792x1024`（16:9）指定尺寸。
