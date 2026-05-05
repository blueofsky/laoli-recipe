---
name: preferences-schema
description: EXTEND.md YAML schema for laoli-videoize user preferences
---

# Preferences Schema

## Full Schema

```yaml
---
version: 1

default_provider: null      # tuzi|apimart|null (null = auto-detect)

default_seconds: null      # "8"|"5"|"10"|"12"|null (null = model default)

default_size: null          # "16:9"|"9:16"|"1:1"|"1280x720"|null (null = model default)

default_model:
  tuzi: null                # e.g., "veo3.1", "kling-v1-6"
  apimart: null             # e.g., "doubao-seedance-1-0-pro-fast", "doubao-seedance-2.0-fast", "sora-2-preview"
---
```

## Field Reference

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `version` | int | 1 | Schema version |
| `default_provider` | string\|null | null | Default provider (null = auto-detect) |
| `default_seconds` | string\|null | null | Default duration in seconds |
| `default_size` | string\|null | null | Default video size |
| `default_model.tuzi` | string\|null | null | Tuzi default model |
| `default_model.apimart` | string\|null | null | APIMart default model |

## Provider Models

### APIMart Models (推荐)

| Model ID | Name | Duration | Aspect Ratios | Resolution |
|----------|------|----------|---------------|------------|
| `doubao-seedance-1-0-pro-fast` | Doubao Seedance 1.0 Pro Fast | 5s (2-12s) | 16:9, 9:16, 1:1, 4:3, 3:4, 21:9 | 480p, 720p, 1080p |
| `doubao-seedance-1-5-pro` | Doubao Seedance 1.5 Pro | 5s (4-12s) | 16:9, 9:16, 1:1, 4:3, 3:4, 21:9 | 480p, 720p, 1080p |
| `doubao-seedance-2.0-fast` | Doubao Seedance 2.0 Fast | 5s (4-15s) | 16:9, 9:16, 1:1, 4:3, 3:4, 21:9 | 480p, 720p, 1080p |
| `veo3.1-fast` | VEO3.1 Fast | 8s | 16:9, 9:16 | 720p, 1080p, 4k |
| `sora-2-preview` | Sora 2 Preview | 4/8/12s | 16:9, 9:16 | 480p, 720p, 1080p |

> `doubao-seedance-2.0-fast` 支持 `--audio` 生成音频

### Tuzi Models

| Model ID | Name | Duration | Aspect Ratios |
|----------|------|----------|---------------|
| `veo3.1` | VEO3.1 | 8s | 16:9, 9:16 |
| `kling-v1-6` | Kling v1.6 | 5/10s | 16:9, 9:16, 1:1 |

## Examples

**Minimal (APIMart Doubao Seedance)**:
```yaml
---
version: 1
default_provider: apimart
default_model:
  apimart: doubao-seedance-1-0-pro-fast
---
```

**APIMart VEO3**:
```yaml
---
version: 1
default_provider: apimart
default_model:
  apimart: veo3.1-fast
default_seconds: "8"
default_size: "16:9"
---
```

**Tuzi (legacy)**:
```yaml
---
version: 1
default_provider: tuzi
default_model:
  tuzi: veo3.1
default_seconds: "8"
default_size: "1280x720"
---
```

**Multi-provider**:
```yaml
---
version: 1
default_model:
  tuzi: veo3.1
  apimart: doubao-seedance-1-0-pro-fast
---
```
