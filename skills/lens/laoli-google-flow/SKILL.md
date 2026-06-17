---
name: laoli-google-flow
description: >
  Google Flow使用经验与最佳实践。
  当用户使用Google Flow生成图片或视频时触发，提供提示词写法、参数选择、工作流建议。
---

# Google Flow 使用经验 Skill

## 定位

经验层技能，记录 Google Flow（labs.google/fx/tools/flow）的使用经验和最佳实践。不替代 API 工具，而是提供手动迭代场景下的操作指南。

## 工具选择速查

| 任务 | 推荐工具 | 理由 |
|------|---------|------|
| 图片创意迭代 | Flow (Nano Banana Pro) | 实时调整，免费 |
| 图片批量变体 | Flow Agent（一次4张） | 快速对比不同视觉方向 |
| 图片批量生成 | API (agnes/tuzi) | 全自动化，可编程 |
| 视频多素材融合/迭代编辑 | Flow (Omni Flash) | 对话式编辑，角色一致 |
| 视频最高画质关键镜头 | Flow (Veo 3.1) | 4K级画质 |
| 视频批量/自定义时长 | API (agnes) | 3-15秒可调，免费 |

## 图片生成（Nano Banana Pro）

### 提示词结构

```
[主体：具体外貌/类型特征]. [动作/状态]. [环境/背景]. [光线/氛围]. [风格后缀]. no text, no watermarks.
```

### 关键技巧

1. **具体特征前置**：AI 可能不认识特定型号，需要把外形特征写死
   - ❌ `"A supersonic aircraft"`
   - ✅ `"A supersonic aircraft with needle-like fuselage, delta wings, droop nose"`

2. **风格后缀统一**：同一项目的所有图片使用相同风格后缀，确保视觉一致性

3. **负向排除**：默认加 `"no text, no watermarks"`

4. **在 Flow 中调整**：生成后不满意，直接在图片下方输入框输入调整指令，不用重新生成

5. **先出图片确认，再出视频**：图片生成快、改起来也快，相当于"分镜确认"。确认构图、色调、人物外貌都对了，再用图片作为 reference 生成视频

### 工作流经验

1. **逐场景确认，不批量生成**：每个场景生成 1-3 张图，确认后再做下一个。不要一次性出完再回头改
2. **用户判断比 AI 评审快 10 倍**：图片好不好，人眼看一眼就知道
3. **参考图复用**：前期场景的参考图可以留给后续场景，保持视觉一致性
4. **3:4 封面图留文字空间**：构图要留出顶部 25% + 底部 15% 的空白，方便后期加文字

### 常见问题

| 问题 | 原因 | 解决 |
|------|------|------|
| 生成的物体/型号不对 | AI 不认识特定型号 | 把外形特征写死在 prompt 里 |
| 构图不理想 | prompt 不够具体 | 用调整指令微调 |

## 视频生成

### 模型选择：Omni Flash vs Veo 3.1

| 维度 | Omni Flash | Veo 3.1 |
|------|-----------|---------|
| **定位** | 多模态导演（输入融合+迭代编辑） | 写实视频生成器（单镜头高品质） |
| **输入** | 文本+图片+音频+视频（任意组合） | 文本+图片 |
| **输出** | 视频（10s上限） | 视频（8s固定） |
| **对话式编辑** | ✅ 多轮迭代，每轮在上轮基础上修改 | ❌ |
| **角色一致性** | ✅ 面孔/服装/声音跨镜头保持 | 一般 |
| **物理真实感** | ✅ 重力/碰撞/流体遵循真实物理 | 高画质 |
| **语音参考** | ✅ 丢入语音样本，整段保持该声音 | ❌ |
| **画质** | 中高 | 最高（4K级） |
| **适用场景** | 多素材融合、需要迭代编辑、角色一致性 | 单镜头最高画质需求 |

**选择原则：** 默认用 Omni Flash（灵活+迭代）；只有关键镜头需要极致画质时才用 Veo 3.1。

### Omni Flash 使用指南

#### 核心能力

**Any-to-Any 输入融合：** 同一个 prompt 中可以混搭多种输入，模型综合推理后输出视频
- 参考图 + 文字描述 + 音频节奏 → 生成视频
- 动作视频 + 角色图 → 角色执行该动作
- 示例：`"Based on the character in image_0.png, apply the motion from video_0.mp4, synchronized to the beat of audio_0.wav"`

**对话式迭代编辑：** 每轮 prompt 在上一轮基础上修改，不需要从头生成
1. 先生成基础镜头
2. `"Make the background a sunset beach"`
3. `"Now add rain and make the character wear a red jacket"`
4. `"Change camera angle to low shot"`

**角色一致性：** 面孔、服装、声音跨镜头、跨编辑自动保持一致。一次定义角色，后续场景复用，不需要每次重复描述外观。

**物理真实感：** 重力、碰撞、流体遵循真实物理规则，历史/文化场景保持细节准确。

**语音参考：** 丢入一段语音样本，整段视频保持该声音。（当前仅支持语音样本，完整音频输入后续开放）

**SynthID 水印：** 所有生成视频默认带不可见 SynthID 水印，抗重编码、抗裁剪。

**时长限制：** 当前上限 10 秒/段。图片输出、音频输出在路线图中。

#### 提示词要素

> 来源：https://deepmind.google/models/gemini-omni/prompt-guide/

**核心原则：细节越多，对输出的控制力越强。**

| 要素 | 控制什么 | 示例 |
|------|---------|------|
| **镜头构图 (Frame)** | 景别、机位、运镜 | Wide-angle / close-up / push in / dolly zoom |
| **情绪风格 (Mood)** | 视觉基调、写实度、光线 | Cinematic, warm sunlight, ethereal glow |
| **场景设定 (Scene)** | 环境、角色动作、文字叠加 | `"An alien landscape with clear azure water"` |

#### 与 Veo 的写法区别

> "With Veo, you need to share precise instructions... But with Gemini Omni, you don't have to be as prescriptive. Instead, tell Omni what you want to create – and watch the model's reasoning and world knowledge bring the details to life."

**实操含义：** Omni 不需要把每个细节写死。告诉它"想要什么"比"怎么做"更有效，模型会用自己的世界知识补全细节。

#### 运镜术语表

| 术语 | 含义 |
|------|------|
| `one continuous shot` / `oner` | 一镜到底 |
| `static` / `locked off` / `fixed` | 固定机位 |
| `close-up` / `medium shot` | 特写 / 中景 |
| `push in` / `punch in` | 推进 |
| `dolly zoom` | 希区柯克变焦 |
| `tilting up` / `widening` | 上摇 / 拉远 |
| `natural smartphone zoom` | 手机自然变焦风格 |
| `film camera` / `webcam style` | 电影感 / 摄像头风格 |

#### 迭代策略

先生成"够用"的基础版本，再通过对话式编辑逐步精修：

1. **第一轮（粗）：** 主体 + 动作 + 环境
2. **第二轮（细）：** 调整光线 / 氛围
3. **第三轮（精）：** 微调镜头角度 / 细节

每轮只改一个元素，不要试图在一个 prompt 里写完所有细节。

### Veo 3.1 使用指南

**适用场景：** 需要最高画质的关键镜头（4K 级、电影感）。

**与 Omni Flash 的分工：**
- Omni Flash 做大部分场景（灵活、可迭代、角色一致）
- Veo 3.1 只用在"这一帧必须完美"的关键镜头上

**注意：** Veo 3.1 固定 8 秒，不支持对话式编辑，不支持音频输入。

### 通用视频技巧

1. **时长选择原则**：
   - 4 秒：冲击瞬间、快速切换
   - 6 秒：中等张力、结尾定格
   - 8 秒：标准叙事、有明确起止
   - 10 秒：需要沉浸感、情绪铺垫
   - **根据场景的戏剧功能选择，不是默认值**

2. **不要过度描述**：视频 prompt 比图片 prompt 更简洁，聚焦"这段时间内发生什么运动"

3. **参考图很重要**：用已确认的图片作为 reference，保持视觉一致性

4. **先做简单场景**：动作简单的场景先做，成功率高。复杂场景（火焰、爆炸）最后做，需要多试

5. **沉默是叙事工具**：不是每个场景都需要旁白，让画面和音效自己说话

## 实用技巧

### Flow Agent 模式

Flow 有两种输入模式：
- **Agent 模式（默认）：** 对话式，可以头脑风暴、优化 prompt、获取创意建议
- **标准模式：** 关闭 Agent 后回到传统 prompt 输入框

Agent 模式下可设置全局指令（Agent Instructions），保持整个项目的行为一致性。会话（Sessions）按项目保存，可重命名/删除。

**Agent Instructions 设置方法：** 展开 Agent 面板 → 点击设置图标 → 输入全局指令。示例：
- `"Always use cinematic lighting and 16:9 aspect ratio"`
- `"Keep character consistent across all scenes"`
- `"Generate in dark, moody tones with high contrast"`

#### Agent 批量生成能力

Agent 模式支持批量操作，不需要逐个 prompt：

| 能力 | 用法 | 示例 |
|------|------|------|
| **批量图片** | 一次生成 4 张变体 | `"Generate 4 variations of a futuristic cityscape"` |
| **场景变体** | 一个 prompt 生成 16 个场景变体 | `"Create 16 scene variations for this storyboard"` |
| **批量编辑** | 同时修改多个素材 | `"Apply warm color grade to all clips tagged DAYTIME"` |
| **批量整理** | 自动重命名/标签/归档 | `"Rename all clips with scene number prefix"` |
| **分镜生成** | 从脚本自动生成分镜网格 | `"Generate a visual storyboard grid from this script"` |

**⚠️ 注意事项：**
- 内容审核严格，敏感题材（暴力/儿童/政治）可能触发失败，失败仍扣 credits
- Agent 没有项目记忆，每次对话需要重新描述风格/偏好
- 批量生成变体不等于解决了"选哪个"的问题，筛选成本仍在

> 深度教程：[The Complete Guide to Flow Agent Mode](https://www.youtube.com/watch?v=YrIMD9KJC14) — 覆盖 brainstorming、storyboards、references、batch generation、batch edit、agent instructions

### Flow 界面操作

- **切换模型：** 视频生成界面顶部有模型选择器，可切换 Omni Flash / Veo 3.1
- **上传参考图：** 在输入框旁的附件按钮上传，支持图片/视频/音频
- **对话式编辑：** 生成视频后，直接在输入框输入修改指令即可，不需要重新开始
- **多选操作：** Shift + 点击 或 拖框选择多个生成物，可批量创建 Collection
- **错误提示：** 出现 "Pending" 或错误卡片时，看右上角系统通知

### 图片编辑功能

| 功能 | 说明 |
|------|------|
| **历史版本** | 编辑不丢失原图，History 面板可回溯所有版本和对应 prompt |
| **局部编辑** | 用 Nano Banana 模型选区编辑（框选区域 + 文字指令） |
| **保存版本** | 历史版本需手动保存到项目，才能在后续 prompt 中作为 @引用 |

### 视频编辑功能

**⚠️ Extend 限制：** 只能 Extend Veo 生成的视频，Omni Flash 生成的不能 Extend。规划时长时要注意这点。

| 功能 | 说明 |
|------|------|
| **Extend** | 在已有视频末尾追加片段 |
| **Scenebuilder** | 多个片段拼接成场景序列，可拖拽重排 |
| **保存帧** | 从视频中提取单帧保存为图片，可作为 ingredient/start/end frame |
| **Refine** | 用 Omni Flash 模型对已有视频做对话式精修（上传视频 → 输入修改指令） |

### @ 引用系统

Flow 的 `@` 语法是统一的引用入口：

```
@me                           → 引用自己（数字分身）
@CharacterName                → 引用已创建的角色
@Voice: Andrew                → 引用语音（需先上传 voice reference）
@image                        → 引用项目中的图片（拖入 prompt 或 @图片名）
```

**最佳实践：** 角色参考图用纯色/干净背景拍摄，效果最好。

### 从 Flow 共享链接提取视频 URL

1. 打开 Flow 共享链接
2. 浏览器控制台执行：`document.querySelector('video')?.src`
3. 获取到的 URL 可直接用于 video_analyze 分析

## 关联 Skill

| 技能 | 用途 |
|------|------|
| **laoli-tts** | 配音生成（MiniMax 网页版） |
| **laoli-image** | 图片生成（API 批量场景） |
| **laoli-video** | 视频生成（API 批量场景） |
