---
name: first-time-setup
description: laoli-shorts 首次使用时的偏好设置引导流程
---

# First-Time Setup

当 `EXTEND.md` 不存在时，按以下步骤引导用户完成偏好设置。

## Step 1: 选择默认方案配置

列出 `references/profiles/` 下所有 `.md` 文件，让用户选择默认方案。

### Question: 选择默认方案

```yaml
header: "Profile"
question: "选择默认方案配置？"
options:
  - label: "history-oil"
    description: "历史油画风格"
  - label: "history_outsider"
    description: "历史局外人风格"
```

- 默认值：如果只有 `history-oil.md`，直接设为默认
- 结果写入：`default_profile`

---

## Step 2: 保存 EXTEND.md

将收集到的偏好写入 EXTEND.md，保存路径优先级：
1. 项目级：`<workspace>/.laoli-recipe/laoli-shorts/EXTEND.md`
2. 用户级：`$HOME/.laoli-recipe/laoli-shorts/EXTEND.md`

**优先保存到项目级**，这样不同项目可以用不同的偏好设置。

## 模板

```yaml
---
version: 1
default_profile: "<Step 1 结果>"
---
```

## 完成后

保存 EXTEND.md 后，向用户展示配置摘要，确认无误后进入管线第1步。
