---
name: preferences-schema
description: EXTEND.md YAML schema for laoli-bgm user preferences
---

# Preferences Schema

## Full Schema

```yaml
---
version: 1

default_provider: minimax        # 默认 BGM 提供商
default_model: music-2.6         # 默认模型 ID
default_format: mp3              # 默认音频格式
default_style: 电子               # 默认音乐风格（可选，自动拼接到 prompt 前）
default_sample_rate: 44100       # 默认采样率
default_bitrate: 256000          # 默认比特率
---
```

## Field Reference

| Field | Type | Description |
|-------|------|-------------|
| `version` | int | Schema version |
| `default_provider` | string | 默认 BGM 提供商（当前: `minimax`）|
| `default_model` | string | 默认模型 ID（`music-2.6` / `music-2.6-free`）|
| `default_format` | string | 默认音频格式（mp3/wav/pcm）|
| `default_style` | string | 默认音乐风格，如 `电子`、`古风`，自动拼接到 prompt 前形成 `{style}, {prompt}`；留空则不拼接 |
| `default_sample_rate` | int | 默认采样率（16000/24000/32000/44100）|
| `default_bitrate` | int | 默认比特率（32000/64000/128000/256000）|

## 优先级

配置优先级：命令参数 > EXTEND.md 配置 > Provider 内置默认值

## 示例

```yaml
---
version: 1
default_provider: minimax
default_model: music-2.6
default_format: mp3
default_style: 古风
default_sample_rate: 44100
default_bitrate: 256000
---
```

使用效果：当用户调用时输入 `--prompt "悠扬的笛声"`，最终实际 prompt 为 `古风, 悠扬的笛声`。
