---
name: laoli-tts
version: 2.1.0
description: TTS 配音生成 - 支持多种 TTS 提供商
argument-hint: "[text] [output-directory]"
triggers:
  - 生成配音
  - TTS
  - 文字转语音
  - 配音
---

# TTS 配音生成

生成配音音频并返回文件路径。

## Step 0: 查找配置 EXTEND.md

按以下优先级查找配置：

| 路径 | 范围 | 说明 |
|------|------|------|
| `~/.laoli-recipe/laoli-tts/EXTEND.md` | 用户级 | 用户全局配置（推荐） |
| `.laoli-recipe/laoli-tts/EXTEND.md` | 项目级 | 项目专属配置 |

**找到配置** → 读取 `default_provider`，进入 Step 1

**未找到配置** → 进入首次配置引导流程：
1. 询问用户选择 TTS 提供商
2. 将选择结果写入 `~/.laoli-recipe/laoli-tts/EXTEND.md`
3. 确认保存路径后，进入 Step 1

### 首次配置引导

当 `.laoli-recipe/laoli-tts/EXTEND.md` 和 `~/.laoli-recipe/laoli-tts/EXTEND.md` 均不存在时，执行以下流程：

**询问用户**：
```yaml
header: "Provider"
question: "默认 TTS 提供商？"
options:
  - label: "MiniMax（推荐）"
    description: "语音质量好，默认使用"
```

**保存配置到**：`~/.laoli-recipe/laoli-tts/EXTEND.md`
```yaml
---
version: 1
default_provider: minimax
---
```

**确认信息**：向用户确认 "配置已保存到 ~/.laoli-recipe/laoli-tts/EXTEND.md"

## Step 1: 读取 Provider 参考文档

根据 `default_provider` 读取对应实现：

| Provider | 参考文档 |
|----------|----------|
| minimax | `references/providers/minimax.md` |

## Step 2: 执行调用

1. 解析 provider 文档中的**所有参数**
2. 将 `[text]` 和 `[output-directory]` 映射到对应参数
3. **所有未在用户输入中指定的参数，必须使用文档中定义的值**
4. 调用对应的 MCP 工具

## 参数

| 参数 | 必填 | 说明 |
|------|------|------|
| `[text]` | 是 | 纯台词文本 |
| `[output-directory]` | 是 | 输出目录绝对路径 |

## Provider 参考

| Provider | 状态 | 参考文档 |
|----------|------|----------|
| minimax | ✅ 已实现 | `references/providers/minimax.md` |

## 注意事项

- **禁止使用 MCP 工具的默认值**：必须严格遵循 provider 文档中的参数值
- **output_directory 必须使用用户指定的路径**，不得使用工具的桌面默认路径
