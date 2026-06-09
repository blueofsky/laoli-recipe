---
name: laoli-tts
description: >
  文本转语音合成。使用 laoli tts 命令将文字转为语音。
  当用户需要朗读文本、生成语音、配音、有声读物、语音合成时触发。
license: MIT
metadata:
  version: "1.0.0"
  category: creative
triggers:
  - 语音合成
  - 文字转语音
  - 配音
  - 朗读
  - TTS
  - text to speech
  - synthesize speech
  - voice over
sources:
  - laoli tts speak --help
  - laoli tts voice --help
  - https://platform.minimaxi.com/docs/faq/system-voice-id
  - https://platform.xiaomimimo.com/docs/zh-CN/usage-guide/speech-synthesis-v2.5
dependencies:
  cli:
    name: laoli
    version: ">=1.0.0"
---

# TTS 语音合成 Skill

## 前置条件

- 安装 CLI：`npm install -g laoli-creative`
- 配置至少一个 TTS Provider 的 API Key：
  ```bash
  laoli auth login --api-key sk-xxxxx --provider minimax
  ```

## 命令

### 合成语音

```bash
laoli tts speak --text "<text>" --output <path> [options]
```

| 选项 | 说明 |
|------|------|
| `--text <text>` | 要合成的文本（必填） |
| `--output <path>` | 输出音频文件路径（必填） |
| `--provider <name>` | Provider：`minimax`（默认）、`mimo` |
| `--model <id>` | 模型 ID（默认 `speech-2.8-hd`） |
| `--voice <id>` | 音色 ID（默认 `female-shaonv`） |
| `--speed <n>` | 语速 0.5~2.0（默认 1.0，minimax） |
| `--vol <n>` | 音量 0~10（默认 3，minimax） |
| `--pitch <n>` | 音调 -12~12（默认 0，minimax） |
| `--emotion <e>` | 情绪：happy/sad/angry/calm/whisper...（minimax） |
| `--context <text>` | 自然语言风格描述（mimo 导演模式） |
| `--format <fmt>` | 输出格式：mp3（默认）、wav |
| `--json` | JSON 输出 |

### 查看音色

```bash
laoli tts voice [--provider minimax|mimo]
```

## Provider 对比

| 特性 | MiniMax | MiMo |
|------|---------|------|
| 预置音色 | 327 个（多语言） | 9 个 |
| 语速/音量/音调 | ✅ 数值精确控制 | 通过 context 自然语言控制 |
| 情绪参数 | ✅ 枚举值 | 文本内标签 |
| 导演模式 | ❌ | ✅ 自然语言风格描述 |
| 唱歌 | ❌ | ✅ 文本内 `(唱歌)` 标签 |
| 成熟度 | 成熟稳定 | 测试阶段 |

## 工作流程

1. **选择 Provider**：日常用 minimax，要自然语言风格控制用 mimo
2. **选择音色**：`laoli tts voice --provider minimax` 查看可用音色
3. **合成语音**：`laoli tts speak --text "..." --voice female-shaonv --output output.mp3`
4. **精细调节**（minimax）：用 speed/vol/pitch/emotion 控制效果
5. **返回结果**：提供音频文件路径

## 示例

```bash
# MiniMax 基础合成
laoli tts speak --text "你好世界" --output hello.mp3

# 指定音色和情绪
laoli tts speak --text "太棒了" --voice female-shaonv --emotion happy --output happy.mp3

# 调整语速和音量
laoli tts speak --text "慢慢说" --speed 0.8 --vol 5 --output slow.mp3

# MiMo 导演模式
laoli tts speak --text "晚安" --provider mimo --context "温柔轻声" --output goodnight.wav

# MiniMax 查看所有音色
laoli tts voice --provider minimax
```

## 注意事项

- minimax 输出默认 mp3，mimo 固定 wav 格式
- minimax 音色 ID 通过 `laoli tts voice` 动态拉取
- mimo 固定 wav 格式
- 所有命令支持 `--help` 查看最新参数
