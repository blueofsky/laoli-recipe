---
name: laoli-music
description: >
  音乐生成。使用 laoli music 命令生成音乐和配乐。
  当用户需要生成音乐、背景音乐、配乐、旋律、纯音乐或带歌词的歌曲时触发。
license: MIT
metadata:
  version: "1.0.0"
  category: creative
triggers:
  - 生成音乐
  - 背景音乐
  - 配乐
  - 作曲
  - 旋律
  - 纯音乐
  - 歌曲生成
  - generate music
  - background music
  - soundtrack
  - compose song
sources:
  - laoli music --help
dependencies:
  cli:
    name: laoli
    version: ">=1.0.0"
---

# 背景音乐生成 Skill

## 前置条件

- 安装 CLI：`npm install -g laoli-creative`
- 配置 minimax provider 的 API Key：
  ```bash
  laoli auth login --api-key sk-xxxxx --provider minimax
  ```

## 命令

```bash
laoli music --prompt "<描述>" --output <path> [options]
```

| 选项 | 说明 |
|------|------|
| `--prompt <text>` | 音乐描述（必填） |
| `--output <path>` | 输出音频文件路径（必填） |
| `--provider <name>` | Provider：`minimax` |
| `--model <id>` | 模型 ID（默认 `music-2.6`） |
| `--lyrics <text>` | 歌词文本（有歌词则转为歌曲） |
| `--instrumental` | 纯音乐模式（不传 --lyrics 时自动启用） |
| `--json` | JSON 输出 |

## 音乐风格参考

Pop、Rock、Jazz、Classical、Electronic、Hip Hop、R&B、Folk、Ambient、Cinematic

## 工作流程

1. **确认需求**：纯音乐还是带歌词的歌曲？
2. **构建 prompt**：描述风格、乐器、氛围（如 "calm piano with strings"）
3. **生成**：`laoli music --prompt "..." --output music.mp3`
4. **返回结果**：提供音频文件路径

## 示例

```bash
# 纯音乐
laoli music --prompt "A calm piano melody with gentle strings" --output calm.mp3

# 电影配乐
laoli music --prompt "Epic orchestral cinematic, dramatic build-up" --output epic.mp3

# 带歌词的歌曲
laoli music --prompt "Upbeat pop" --lyrics "[verse] La da dee..." --output song.mp3
```

## 注意事项

- 输出格式固定为 mp3
- 支持中英文歌词，歌词可用 `[verse]`、`[chorus]` 等标签分段
- 日志文件位于 `~/.laoli/logs/`
- 所有命令支持 `--help` 查看最新参数
