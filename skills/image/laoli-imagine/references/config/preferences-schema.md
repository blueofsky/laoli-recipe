---
name: preferences-schema
description: EXTEND.md YAML schema for laoli-imagine user preferences
---

# Preferences Schema

> 此文件描述 EXTEND.md 的 YAML 结构。如需创建配置文件，请参考此 schema 手动创建。

## Full Schema

```yaml
---
version: 1

default_provider: null      # tuzi|apimart|null (null = auto-detect)

default_quality: null       # normal|2k|null (null = use default: 2k)

default_aspect_ratio: null  # "16:9"|"1:1"|"4:3"|"3:4"|"2.35:1"|null

default_image_size: null    # 1K|2K|4K|null (overrides quality)

default_model:
  tuzi: null                # e.g., "gpt-image-2"
  apimart: null             # e.g., "gpt-image-2", "gpt-image-2-official"

batch:
  max_workers: 10
  provider_limits:
    tuzi:
      concurrency: 3
      start_interval_ms: 1100
    apimart:
      concurrency: 3
      start_interval_ms: 1100
---
```

## Field Reference

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `version` | int | 1 | Schema version |
| `default_provider` | string\|null | null | Default provider (null = auto-detect) |
| `default_quality` | string\|null | null | Default quality (null = 2k) |
| `default_aspect_ratio` | string\|null | null | Default aspect ratio |
| `default_image_size` | string\|null | null | Image size (overrides quality) |
| `default_model.tuzi` | string\|null | null | Tuzi default model |
| `default_model.apimart` | string\|null | null | APIMart default model |
| `batch.max_workers` | int\|null | 10 | Batch worker cap |
| `batch.provider_limits.<provider>.concurrency` | int\|null | provider default | Max simultaneous requests per provider |
| `batch.provider_limits.<provider>.start_interval_ms` | int\|null | provider default | Minimum gap between request starts per provider |

## Examples

**Minimal**:
```yaml
---
version: 1
default_provider: apimart
default_quality: 2k
---
```

**Full**:
```yaml
---
version: 1
default_provider: apimart
default_quality: 2k
default_aspect_ratio: "16:9"
default_image_size: 2K
default_model:
  tuzi: "gpt-image-2"
  apimart: "gpt-image-2"
batch:
  max_workers: 10
  provider_limits:
    tuzi:
      concurrency: 3
      start_interval_ms: 1100
    apimart:
      concurrency: 3
      start_interval_ms: 1100
---
```
