---
name: preferences-schema
description: EXTEND.md YAML schema for laoli-tts user preferences
---

# Preferences Schema

## Full Schema

```yaml
---
version: 1

default_provider: minimax      # 默认 TTS 提供商
default_model: speech-2.8-hd   # 默认模型
default_voice: ttv-voice-2025121421155125-EvCDaW5m # 默认音色（男声）
default_speed: 1.0             # 默认语速
default_vol: 3                 # 默认音量
default_pitch: 0               # 默认语调
default_format: mp3            # 默认音频格式
default_emotion: happy         # 默认情绪
default_sample_rate: 32000     # 默认采样率
default_bitrate: 128000        # 默认比特率
default_channel: 1             # 默认声道数
default_language_boost: Chinese # 默认语言增强
---
```

## Field Reference

| Field | Type | Description |
|-------|------|-------------|
| `version` | int | Schema version |
| `default_provider` | string | 默认 TTS 提供商（当前: `minimax`）|
| `default_model` | string | 默认模型 ID |
| `default_voice` | string | 默认音色 ID |
| `default_speed` | float | 默认语速 (0.5~2) |
| `default_vol` | float | 默认音量 (0~10) |
| `default_pitch` | int | 默认语调 (-12~12) |
| `default_format` | string | 默认音频格式 (mp3/pcm/flac/wav) |
| `default_emotion` | string | 默认情绪 |
| `default_sample_rate` | int | 默认采样率 |
| `default_bitrate` | int | 默认比特率 |
| `default_channel` | int | 默认声道数 (1/2) |
| `default_language_boost` | string | 默认语言增强 |

## 优先级

配置优先级：命令参数 > EXTEND.md 配置 > Provider 内置默认值

## 示例

```yaml
---
version: 1
default_provider: minimax
default_voice: ttv-voice-2025121421155125-EvCDaW5m
default_speed: 1.2
default_vol: 3
---
```
