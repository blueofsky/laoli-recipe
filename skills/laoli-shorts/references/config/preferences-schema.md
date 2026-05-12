---
name: preferences-schema
description: EXTEND.md YAML schema for laoli-shorts user preferences
---

# Preferences Schema

## Full Schema

```yaml
---
version: 1

# 默认使用的方案配置（references/profiles/ 下的文件名）
default_profile: history-oil.md
---
```

## Field Reference

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `version` | int | 1 | Schema version |
| `default_profile` | string | `history-oil.md` | 方案配置文件名，位于 `references/profiles/` |

## Examples

**默认配置**：
```yaml
---
version: 1
default_profile: history-oil.md
---
```
