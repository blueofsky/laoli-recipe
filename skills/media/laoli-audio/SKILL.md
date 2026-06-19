---
name: laoli-audio
description: >
  音频理解。使用 laoli audio 命令分析音频内容（转写 + 问答）。
  当用户需要理解音频内容、分析音频、对音频提问、总结音频核心要点时触发。
license: MIT
metadata:
  version: "1.0.0"
  category: creative
triggers:
  - 音频理解
  - 音频分析
  - 理解音频
  - 分析音频
  - 音频问答
  - 听音频
  - 总结音频
  - 音频转述
  - 音频内容总结
  - audio understanding
  - audio analysis
  - understand audio
  - analyze audio
  - audio Q&A
  - audio transcription
sources:
  - laoli audio --help
  - https://platform.xiaomimimo.com/docs/zh-CN/usage-guide/multimodal-understanding/audio-understanding
---

# 音频理解 Skill

使用 `laoli audio` 命令分析音频内容，支持转写和基于提示词的问答。

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
laoli audio --input <path> --prompt <text> [options]
```

| 选项 | 说明 |
|------|------|
| `--input <path>` | 音频文件路径或 URL（必填，支持 mp3/wav/flac/m4a/ogg） |
| `--prompt <text>` | 关于音频的问题或指令，如"请转写这段音频"、"总结核心要点"（必填） |
| `--provider <name>` | Provider：`mimo`（当前仅此一个） |
| `--model <id>` | 模型 ID（默认 `mimo-v2.5`） |
| `--mode <mode>` | 本地文件传输方式：`base64`（默认）或 `url`（上传到 GitHub 图床） |
| `--json` | 以 JSON 格式输出结果，含推理过程和 Token 用量 |

## 传输模式

| 模式 | 说明 | 本地文件上限 |
|------|------|-------------|
| `base64`（默认） | 文件直接编码为 Base64 发送 | ~36MB（编码后 ≤ 50MB） |
| `url` | 先上传到 GitHub 图床，再用公网 URL 发送 | 取决于图床限制 |

> 文件较大或 Base64 超限时，用 `--mode url` 切换到上传模式。

## 与语音识别的区别

`laoli audio` 不同于 `laoli asr`（纯语音转文字），它借助多模态模型直接"听懂"音频内容：

| 能力 | laoli asr | laoli audio |
|------|-----------|-------------|
| 纯转写 | ✅ | ✅ |
| 按指令问答 | ❌ | ✅ |
| 总结归纳 | ❌ | ✅ |
| 识别情绪/语气 | ❌ | ✅ |
| 识别语种 | ✅ | ✅ |
| 输出格式 | 纯文本 | 文本 / JSON |

## 支持特性

- **音频格式**：MP3、WAV、FLAC、OGG（M4A 需先转 MP3）
- **文件大小**：Base64 模式编码后 ≤ 50MB（原始文件约 ≤ 36MB）
- **输出**：文本内容（默认）或完整 JSON（`--json`）

## 工作流程

1. **准备音频**：录制或准备好音频文件，支持常见格式
2. **构建 prompt**：明确告诉模型要做什么，如"转写"、"总结"、"识别语种"、"这段音频在说什么？"
3. **调用分析**：`laoli audio --input speech.mp3 --prompt "请转写这段音频"`
4. **检查结果**：默认输出文本内容；加 `--json` 获取结构化结果（含推理过程、Token 用量）

## 示例

```bash
# 基础转写
laoli audio --input speech.mp3 --prompt "请转写这段音频内容"

# 会议总结
laoli audio --input meeting.wav --prompt "总结这段会议的核心要点和待办事项"

# 识别语种并翻译
laoli audio --input recording.m4a --prompt "这段音频用什么语言说的？翻译成中文"

# 大文件使用 URL 模式
laoli audio --input large.mp3 --prompt "描述音频内容" --mode url

# JSON 输出（含推理过程和 Token 用量）
laoli audio --input speech.mp3 --prompt "转写并总结" --json
```

## 注意事项

- 当前仅 MiMo provider 支持音频理解
- 音频格式支持：MP3、WAV、FLAC、OGG
- ⚠️ **M4A 不支持**：虽然文档列出 M4A，但 MiMo API 实际返回 400 错误。必须先转 MP3：`ffmpeg -i input.m4a -acodec libmp3lame -q:a 2 output.mp3`
- Base64 编码传入时：编码后字符串 ≤ 50MB（原始文件约 ≤ 36MB）
- 短音频效果最好，长音频建议先分段处理
- prompt 越具体，回答越精确——不只是说"转写"，还可以要求"提取人名"、"识别情绪"等
- 所有命令支持 `--help` 查看最新参数
