---
name: minimax-tts
description: MiniMax TTS provider
requires:
  mcp:
    - server: MiniMax
      tool: text_to_audio
---

# MiniMax TTS

调用 `mcp__MiniMax__text_to_audio`

## 调用示例

```json
{
  "text": "中华人民共和国万岁，世界人民大团结万岁！",
  "output_directory": "d:/output/path",
  "model": "speech-2.8-hd",
  "voice_id": "ttv-voice-2025121421155125-EvCDaW5m",
  "vol": 3,
  "speed": 1.0,
  "format": "mp3",
  "language_boost": "Chinese"
}
```

## 参数映射

| MCP 参数 | 值来源 | 说明 |
|----------|--------|------|
| `text` | 用户 `[text]` | 台词文本 |
| `output_directory` | 用户 `[output-directory]` | 输出目录 |
| `model` | **固定值**: `speech-2.8-hd` | 模型 ID |
| `voice_id` | **固定值**: `ttv-voice-2025121421155125-EvCDaW5m` | 声音 ID （男声）|
| `vol` | **固定值**: `3` | 音量 |
| `speed` | **固定值**: `1.0` | 语速 |
| `format` | **固定值**: `mp3` | 音频格式 |
| `language_boost` | **固定值**: `Chinese` | 语言增强 |

## 可选参数（未指定时使用默认值）

| 参数 | 默认值 | 可选值 |
|------|--------|--------|
| `emotion` | `happy` | happy, sad, angry, fearful, disgusted, surprised, neutral |
| `pitch` | `0` | -12 ~ 12 |
| `sample_rate` | `32000` | 8000, 16000, 22050, 24000, 32000, 44100 |
| `bitrate` | `128000` | 32000, 64000, 128000, 256000 |
| `channel` | `1` | 1, 2 |

## 注意事项

1. **voice_id 使用 `female-shaonv`**：这是经过优化的中文少女音
2. **language_boost 必须设为 `Chinese`**：确保中文发音准确
3. **output_directory 必须完整**：不接受空值，否则文件会保存到桌面
