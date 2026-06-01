---
name: first-time-setup
description: laoli-bgm 首次配置引导
---

# 首次配置

首次使用 laoli-bgm 时，需要配置 BGM 偏好并保存配置。

## 配置路径

| 路径 | 范围 |
|------|------|
| `.laoli-recipe/laoli-bgm/EXTEND.md` | 项目级 |
| `~/.laoli-recipe/laoli-bgm/EXTEND.md` | 用户级（推荐） |

## 完整设置流程

```
No EXTEND.md found
        │
        ▼
┌──────────────────────────┐
│ AskUserQuestion          │
│ (Provider 选择)          │
└──────────────────────────┘
        │
        ▼
┌──────────────────────────┐
│ AskUserQuestion          │
│ (模型选择)               │
└──────────────────────────┘
        │
        ▼
┌──────────────────────────┐
│ AskUserQuestion          │
│ (音频格式)               │
└──────────────────────────┘
        │
        ▼
┌──────────────────────────┐
│ AskUserQuestion          │
│ (默认风格，可选)         │
└──────────────────────────┘
        │
        ▼
┌──────────────────────────┐
│ Create EXTEND.md         │
└──────────────────────────┘
        │
        ▼
    Continue
```

### Question 1: 选择 Provider

```yaml
header: "Provider"
question: "默认 BGM 提供商？"
options:
  - label: "MiniMax（推荐）"
    description: "音乐质量好，默认使用"
```
- 默认值：如果只有一个选项，直接设为默认
- 结果写入：`default_provider`

### Question 2: 选择模型

```yaml
header: "Model"
question: "默认使用哪个模型？"
options:
  - label: "music-2.6（推荐）"
    description: "质量最佳，需 Token Plan 或付费用户"
  - label: "music-2.6-free"
    description: "限免版本，所有用户可用，有较低 RPM 限制"
```
- 默认值：`music-2.6`
- 结果写入：`default_model`

### Question 3: 选择音频格式

```yaml
header: "Format"
question: "默认音频格式？"
options:
  - label: "mp3（推荐）"
    description: "通用格式，文件较小"
  - label: "wav"
    description: "无损格式，文件较大"
  - label: "pcm"
    description: "原始 PCM 数据"
```
- 默认值：`mp3`
- 结果写入：`default_format`

### Question 4: 默认音乐风格（可选）

```yaml
header: "Default Style"
question: "你通常生成什么风格的音乐？可后续每次调用时覆盖。留空则跳过。"
options:
  - label: "不设置默认风格"
    description: "每次调用时手动输入完整描述"
  - label: "古风"
    description: "古筝、笛子、中国风"
  - label: "电子"
    description: "合成器、节奏感强、现代感"
  - label: "古典/管弦"
    description: "钢琴、弦乐、恢弘"
  - label: "民谣/原声"
    description: "吉他、温暖、自然"
  - label: "氛围/环境"
    description: "空灵、舒缓、背景化"
  - label: "爵士/蓝调"
    description: "萨克斯、钢琴、慵懒"
```
- 默认值：不设置（留空）
- 结果写入：`default_style`

### EXTEND.md 模板

```yaml
---
version: 1
default_provider: minimax
default_model: music-2.6
default_format: mp3
default_style: # 如 电子 / 古风，留空则不设置
---
```

## 保存后

1. 确认："配置已保存到 [path]，可通过 EXTEND.md 随时修改偏好"
2. 继续执行 BGM 生成
