---
name: laoli-bgm
version: 1.0.0
description: BGM 背景音乐生成 - 基于 MiniMax Music API 生成纯音乐
argument-hint: "[prompt] [output-directory]"
triggers:
  - 生成BGM
  - 背景音乐
  - BGM
  - 音乐生成
  - 配乐
---

# BGM 背景音乐生成

根据用户描述的风格和情绪，生成纯音乐 BGM 并返回音频文件路径。

## Step 0: 查找配置 EXTEND.md

按以下优先级查找配置（首个匹配的文件生效）：

| 路径 | 范围 | 说明 |
|------|------|------|
| `.laoli-recipe/laoli-bgm/EXTEND.md` | 项目级 | 项目专属配置（优先） |
| `~/.laoli-recipe/laoli-bgm/EXTEND.md` | 用户级 | 用户全局配置（推荐存储位置） |

**找到配置** → 读取 `default_provider`，进入 Step 1

**未找到配置** → 进入首次配置引导流程：
1. 逐个询问用户偏好选项
2. 将选择结果写入 `~/.laoli-recipe/laoli-bgm/EXTEND.md`
3. 确认保存路径后，进入 Step 1

### 首次配置引导

当 `.laoli-recipe/laoli-bgm/EXTEND.md` 和 `~/.laoli-recipe/laoli-bgm/EXTEND.md` 均不存在时，执行以下流程：

逐项询问以下偏好（保存一项问下一项）：

**偏好 1：默认 Provider**
```yaml
header: "Provider"
question: "默认 BGM 提供商？"
options:
  - label: "MiniMax（推荐）"
    description: "音乐质量好，默认使用"
```

**偏好 2：默认模型**
```yaml
header: "Model"
question: "默认使用哪个模型？"
options:
  - label: "music-2.6（推荐）"
    description: "质量最佳，需 Token Plan 或付费用户"
  - label: "music-2.6-free"
    description: "限免版本，所有用户可用，有较低 RPM 限制"
```

**偏好 3：音频格式**
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

**偏好 4：默认音乐风格（可选）**
```
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

**保存配置到**：`~/.laoli-recipe/laoli-bgm/EXTEND.md`
```yaml
---
version: 1
default_provider: minimax
default_model: music-2.6
default_format: mp3
default_style: # 用户选择的风格，如 电子 / 古风，留空则不设置
---
```

**确认信息**：向用户确认 "配置已保存到 ~/.laoli-recipe/laoli-bgm/EXTEND.md，可通过 `~/.laoli-recipe/laoli-bgm/EXTEND.md` 随时修改偏好"

> 完整的首次配置流程和说明见 `references/config/first-time-setup.md`。配置字段 schema 见 `references/config/preferences-schema.md`。

## Step 1: 读取 Provider 参考文档

根据 `default_provider` 读取对应实现：

| Provider | 参考文档 |
|----------|----------|
| minimax | `references/providers/minimax.md` |

## Step 2: 执行调用

1. 解析 provider 文档中的**所有参数**
2. 将 `[prompt]` 和 `[output-directory]` 映射到对应参数
3. **所有未在用户输入中指定的参数，必须使用文档中定义的值**
4. 执行对应 Provider 的 TypeScript 脚本：

```bash
cd <skill-root-directory>
npx -y bun scripts/main.ts \
  --prompt "[prompt]" \
  --output "[output-directory]" \
  [以及其他参数，从 provider 文档获取]
```

**提示**：脚本支持 `--provider` 参数指定提供商，同时也自动读取 EXTEND.md 中的配置。若未指定参数，会从 EXTEND.md 合并默认值，再由 provider 内部填充最终默认值。

脚本输出为生成的 BGM 音频文件路径。

## 参数

| 参数 | 必填 | 说明 |
|------|------|------|
| `[prompt]` | 是 | 音乐风格描述，如"电子, 轻快, 适合作为游戏BGM" |
| `[output-directory]` | 是 | 输出目录绝对路径 |

## Provider 参考

| Provider | 状态 | 参考文档 |
|----------|------|----------|
| minimax | ✅ 已实现 | `references/providers/minimax.md` |

## References

| File | Content |
|------|---------|
| `references/config/first-time-setup.md` | 首次配置完整引导流程 |
| `references/config/preferences-schema.md` | EXTEND.md schema（配置字段参考） |
| `references/providers/minimax.md` | MiniMax BGM 参数文档 |

## 注意事项

- **必须严格遵循 provider 文档中的参数值**
- **output_directory 必须使用用户指定的路径**
- **API Key 通过环境变量 `MINIMAX_API_KEY` 配置**（或写入 `~/.laoli-recipe/.env` / 项目 `.laoli-recipe/.env`）
- **BGM 生成耗时约 10-30 秒**，属于正常范围
- **`music-2.6` 模型需付费用户使用**，免费用户可在 provider 文档中切换为 `music-2.6-free`（限流较低）
- **每次调用生成一首 BGM**，如需多个版本请多次调用
