---
name: preferences-schema
description: EXTEND.md YAML schema for laoli-tts user preferences
---

# Preferences Schema

## Full Schema

```yaml
---
version: 1

default_provider: minimax  # 其他 provider 待实现
---
```

## Field Reference

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `version` | int | 1 | Schema version |
| `default_provider` | string | minimax | 默认 TTS 提供商 |

## 示例

```yaml
---
version: 1
default_provider: minimax
---
```
