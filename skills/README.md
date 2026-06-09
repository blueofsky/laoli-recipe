# Laoli Skills

Laoli Creative 的 Skills 集合，为 AI 编码代理提供结构化的使用指南。

## Skills 列表

| Skill | 描述 | 状态 |
|-------|------|------|
| [laoli-imagine](laoli-imagine/) | 图片生成 | ✅ |
| [laoli-tts](laoli-tts/) | TTS 语音合成 | ✅ |
| [laoli-video](laoli-video/) | 视频生成 | ✅ |
| [laoli-music](laoli-music/) | 音乐生成 | ✅ |
| [laoli-picgo](laoli-picgo/) | 图片上传 | ✅ |

## 使用方法

Skills 随 `laoli-creative` CLI 一起安装，AI 编码代理会自动发现这些 Skills。

```bash
# 安装 CLI（包含 Skills）
npm install -g laoli-creative

# 使用 CLI
laoli imagine generate --prompt "A cat" --output cat.png
laoli tts speak --text "Hello" --output hello.mp3
```

## 开发

### 添加新 Skill

1. 在 `skills/` 目录下创建新目录
2. 创建 `SKILL.md` 文件
3. 遵循现有 Skill 的格式

### Skill 格式

参考现有 Skill，推荐包含以下 YAML 元数据：

```yaml
---
name: skill-name
description: > 触发条件描述
license: MIT
metadata:
  version: "1.0.0"
  category: creative | utility
triggers:
  - 触发关键词
  - trigger keywords
sources:
  - laoli xxx --help
  - 参考文档链接
dependencies:
  cli:
    name: laoli
    version: ">=1.0.0"
---
```

#### 正文建议内容

| 章节 | 说明 |
|------|------|
| `## 前置条件` | 安装、API Key 配置 |
| `## 命令` | 命令用法 + 参数表格（含默认值标注） |
| `## 工作流程` | Step 1→2→3 步骤 |
| `## 示例` | 典型使用场景 |
| `## 注意事项` | 文件格式、provider 限制等 |

## 许可证

MIT
