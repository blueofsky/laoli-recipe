---
name: laoli-asr
description: >
  语音转文字。使用 laoli asr 命令将音频转为文字。
  当用户需要语音识别、音频转文字、生成字幕文稿、会议记录转写时触发。
license: MIT
metadata:
  version: "1.0.0"
  category: creative
triggers:
  - 语音识别
  - 语音转文字
  - 音频转文字
  - 字幕生成
  - 听写
  - 会议记录
  - 转写
  - speech to text
  - ASR
  - transcribe
  - audio transcription
sources:
  - laoli asr --help
  - https://platform.xiaomimimo.com/docs/zh-CN/usage-guide/Speech-Recognition
dependencies:
  cli:
    name: laoli
    version: ">=1.0.0"
---

# 语音转文字 Skill

使用 `laoli asr` 命令将音频文件转为文字。

## 前置条件

- 安装 CLI：`npm install -g laoli-creative`
- 配置 MiMo Provider 的 API Key：
  ```bash
  laoli auth login --api-key sk-xxxxx --provider mimo
  ```

## 命令

```bash
laoli asr --input <path> [--output <path>] [options]
```

| 选项 | 说明 |
|------|------|
| `--input <path>` | 音频文件路径（wav/mp3，必填） |
| `--output <path>` | 输出文本文件路径（可选，不填则直接打印到控制台） |
| `--provider <name>` | Provider：`mimo`（当前仅此一个） |
| `--model <id>` | 模型 ID（默认 `mimo-v2.5-asr`） |
| `--lang <lang>` | 语言提示：`auto`（默认自动检测）、`zh`（中文）、`en`（英文） |

## 支持特性

- **音频格式**：WAV、MP3
- **语种**：中文、英文、粤语、吴语、闽南语、四川话等方言（自动识别）
- **文件上限**：Base64 编码后 ≤ 10MB（原始文件约 ≤ 7.3MB）
- **输出**：纯文本，可存为 `.txt` 文件

## 工作流程

1. **准备音频**：录制或准备好音频文件（wav/mp3）
2. **调用转写**：`laoli asr --input speech.mp3 --output transcript.txt`
3. **获取文本**：检查转写结果，可用于剪映文稿匹配或后续处理

## 示例

```bash
# 转写并保存到文件
laoli asr --input meeting.mp3 --output meeting.txt

# 指定中文，提高准确率
laoli asr --input speech.wav --output transcript.txt --lang zh

# 仅打印到控制台（不保存文件）
laoli asr --input audio.mp3
```

## 注意事项

- 当前仅 MiMo provider 支持语音识别
- 短音频效果最好，长音频建议分段处理
- 转写结果可用于剪映"文稿匹配"功能生成时间轴字幕
- 所有命令支持 `--help` 查看最新参数
