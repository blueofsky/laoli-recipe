# Google Flow 视频生成工作流

> 本文件记录使用 Google Flow (labs.google/fx/tools/flow) 进行视频生成的完整工作流。
> 当用户拥有 Google AI Pro 会员时，优先使用 Flow 而非 API 生成视频。

## Flow 核心能力

| 能力 | 模型 | 说明 |
|------|------|------|
| 图片生成 | Nano Banana 2 Pro | 免费（Pro会员），快速迭代分镜图 |
| 视频生成 | Gemini Omni Flash / Veo 3.1 | 支持4s/6s/8s/10s多时长，1080p |
| Agent模式 | Gemini驱动 | 帮助优化提示词、调整画面 |
| 场景拼接 | 内置 | 多段视频直接拼成完整场景 |
| 在线剪辑 | 内置 | 裁剪、调整时长 |

## 工作流

### 1. 图片阶段（分镜确认）
- 用 Nano Banana 生成每个场景的关键帧
- 确认构图、色调、人物外貌都对了再上视频
- 图片免费无限生成，不满意就重来

### 2. 视频阶段
- 用确认的图片作为参考（Ingredients模式）
- 选择时长（4s/6s/8s/10s）
- 写视频运动提示词（描述8秒内的运动）
- 生成后下载720p版本供分析

### 3. 分析与迭代
- 下载视频到本地，用MiMo视频分析检查效果
- 不满意的改提示词重新生成
- 满意的进入下一个场景

## 从Flow共享链接提取视频URL

当用户分享 `labs.google/fx/tools/flow/shared/video/xxx` 链接时，可通过浏览器JS提取视频URL：

```javascript
document.querySelector('video')?.src || document.querySelector('video')?.currentSrc
```

提取到的URL格式：`https://flow-content.google/video/xxx?Expires=xxx&Signature=xxx`
可直接用于 `video_analyze` 工具分析。

## 视频提示词要点

- **运动要克制**：以缓慢的推、拉、摇为主，模仿"凝视"与"审视"
- **不要写镜头语言**：不写"镜头推进"，写"camera slowly pushes in"
- **描述物理运动**：写"轮胎在旋转""烟雾在升腾"，不写"紧张感在增加"
- **匹配纪录片节奏**：AI历史视频的运镜应沉稳、缓慢，不要快节奏闪烁

## 时长选择指南

| 时长 | 适用场景 | 说明 |
|------|---------|------|
| 4s | 冲击瞬间、快速切换 | 如"轮胎碾过碎片"——越短越狠 |
| 6s | 静态凝视、结尾定格 | 如"博物馆机头特写"——句号感 |
| 8s | 标准叙事 | 大多数场景的默认选择 |
| 10s | 需要沉浸感 | 如"机舱乘客"——让观众"认识"这些人 |

**核心原则**：根据场景的戏剧功能选时长，不默认用最长的。静止画面用短时长（6s），动作场景用中等（8s），需要情绪铺垫的用长（10s）。

## Agnes API 备选方案

如果没有Google Flow会员，可用agnes API生成视频：
- 免费但生成慢（~3min）
- 固定704px宽度（非标准9:16）
- RPM限制20次/分钟
- 火焰/爆炸效果不稳定
