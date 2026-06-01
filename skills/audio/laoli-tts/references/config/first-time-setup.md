---
name: first-time-setup
description: laoli-tts 首次配置引导
---

# 首次配置

首次使用 laoli-tts 时，需要选择 TTS 提供商并保存配置。

## 配置路径

| 路径 | 范围 |
|------|------|
| `.laoli-recipe/laoli-tts/EXTEND.md` | 项目级 |
| `~/.laoli-recipe/laoli-tts/EXTEND.md` | 用户级（推荐） |

## 完整设置流程

```
No EXTEND.md found
        │
        ▼
┌─────────────────────┐
│ AskUserQuestion     │
│ (provider 选择)     │
└─────────────────────┘
        │
        ▼
┌─────────────────────┐
│ Create EXTEND.md    │
└─────────────────────┘
        │
        ▼
    Continue
```

### Question: 选择 Provider

```yaml
header: "Provider"
question: "默认 TTS 提供商？"
options:
  - label: "MiniMax（推荐）"
    description: "语音质量好，默认使用"
```

- 默认值：如果只有一个选项，直接设为默认
- 结果写入：`default_provider`

### EXTEND.md 模板

```yaml
---
version: 1
default_provider: minimax
---
```

## 保存后

1. 确认："配置已保存到 [path]"
2. 继续执行配音生成
