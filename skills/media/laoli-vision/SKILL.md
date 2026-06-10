---
name: laoli-vision
description: >
  图片和视频理解。使用 laoli vision 命令分析图片或视频内容。
  当用户需要识别图片、理解画面内容、分析视频、描述多媒体内容时触发。
license: MIT
metadata:
  version: "1.0.0"
  category: creative
triggers:
  - 图片理解
  - 图片识别
  - 视频理解
  - 视频分析
  - 看图说话
  - 分析图片
  - 分析视频
  - 识别画面
  - image understanding
  - image recognition
  - video understanding
  - video analysis
  - describe image
  - describe video
sources:
  - laoli vision --help
  - https://platform.xiaomimimo.com/docs/zh-CN/usage-guide/multimodal-understanding/image-understanding
  - https://platform.xiaomimimo.com/docs/zh-CN/usage-guide/multimodal-understanding/video-understanding
---

# 视觉理解 Skill

使用 `laoli vision` 命令分析图片或视频内容。自动根据文件扩展名识别媒体类型。

## 前置条件

- 安装 CLI：`npm install -g laoli-creative`
- 配置 MiMo Provider 的 API Key：
  ```bash
  laoli auth login --api-key sk-xxxxx --provider mimo
  ```
- 如需 `--mode url`（上传到图床），需额外配置 picgo：
  ```bash
  laoli picgo config --repo owner/repo --token ghp_xxxxx
  ```

## 命令

```bash
laoli vision --input <path> --prompt <text> [options]
```

| 选项 | 说明 |
|------|------|
| `--input <path>` | 图片/视频文件路径或 URL（必填。根据扩展名自动识别类型） |
| `--prompt <text>` | 提问或指令，如"描述这张图片"、"画面里有什么"（必填） |
| `--provider <name>` | Provider：`mimo`（当前仅此一个） |
| `--model <id>` | 模型 ID（默认 `mimo-v2.5`） |
| `--fps <n>` | 视频专用：抽帧频率 0.1~10（默认 2） |
| `--media-resolution <mode>` | 视频专用：分辨率模式 `default` 或 `max` |
| `--mode <mode>` | 本地文件传输方式：`base64`（默认）或 `url`（上传到 GitHub 图床） |
| `--json` | JSON 输出，含推理过程和 Token 用量 |

## 媒体类型自动识别

无需指定是图片还是视频，`laoli vision` 根据扩展名自动判断：

| 类型 | 支持的格式 |
|------|-----------|
| 图片 | JPEG、PNG、GIF、WebP、BMP |
| 视频 | MP4、MOV、AVI、WMV |

## 传输模式

| 模式 | 说明 | 本地文件上限 |
|------|------|-------------|
| `base64`（默认） | 文件直接编码为 Base64 发送 | ~36.5MB |
| `url` | 先上传到 GitHub 图床，再用公网 URL 发送 | 图片 50MB / 视频 300MB |

> 文件较大或 Base64 超限时，用 `--mode url` 切换到上传模式。

## 工作流程

1. **确认媒体类型**：支持图片和视频，根据文件扩展名自动识别
2. **构建 prompt**：明确告诉模型要看什么，如"描述画面"、"识别物体"、"读出文字"
3. **调用分析**：`laoli vision --input photo.jpg --prompt "描述这张图片"`
4. **检查结果**：默认输出文本描述；加 `--json` 获取结构化结果

## 示例

```bash
# 图片理解
laoli vision --input photo.jpg --prompt "图片里有什么？"

# 带推理过程
laoli vision --input photo.jpg --prompt "识别画面中的物体" --json

# 视频理解
laoli vision --input video.mp4 --prompt "描述这个视频的内容"

# 视频理解，调节抽帧频率
laoli vision --input video.mp4 --prompt "画面逐帧变化" --fps 1

# 大文件使用 URL 模式（先上传到图床）
laoli vision --input large.mp4 --prompt "描述" --mode url
```

## 注意事项

- 当前仅 MiMo provider 支持视觉理解
- 图片格式支持：JPEG、PNG、GIF、WebP、BMP
- 视频格式支持：MP4、MOV、AVI、WMV
- URL 传入时：图片 ≤ 50MB，视频 ≤ 300MB
- Base64 编码传入时：编码后字符串 ≤ 50MB（原始文件约 ≤ 36.5MB）
- `--fps` 和 `--media-resolution` 仅对视频有效，图片模式下忽略
- 所有命令支持 `--help` 查看最新参数
