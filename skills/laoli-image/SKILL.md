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
dependencies:
  cli:
    name: laoli
    version: ">=1.0.0"
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
laoli image batch --batchfile <path> [options]
```

| 选项 | 说明 |
|------|------|
| `--batchfile <path>` | JSON 批处理文件路径（必填） |
| `--jobs <count>` | 并发数（默认 4） |
| `--json` | JSON 输出 |
| `--quiet` | 抑制非必要输出 |

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
laoli image batch --batchfile batch.json --jobs 3
```

## 注意事项

- 支持格式：PNG、JPG、WebP
- 参考图片支持本地文件（自动上传图床）和 URL
- 日志文件位于 `~/.laoli/logs/`
- 所有命令支持 `--help` 查看最新参数
