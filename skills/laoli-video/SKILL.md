---
name: laoli-video
description: >
  AI 视频生成，支持文生视频和图生视频。使用 laoli video 命令生成和管理视频。
  当用户需要生成视频、创建动画、视频素材、图生视频或批量生成视频时触发。
license: MIT
metadata:
  version: "1.0.0"
  category: creative
triggers:
  - 生成视频
  - 文生视频
  - 图生视频
  - 视频创作
  - 动画生成
  - 批量视频
  - text to video
  - image to video
  - generate video
  - video creation
sources:
  - laoli video generate --help
  - laoli video batch --help
dependencies:
  cli:
    name: laoli
    version: ">=1.0.0"
---

# 视频生成 Skill

## 前置条件

- 安装 CLI：`npm install -g laoli-creative`
- 配置至少一个视频 Provider 的 API Key：
  ```bash
  laoli auth login --api-key sk-xxxxx --provider agnes
  ```

## 命令

### 生成视频

```bash
laoli video generate --prompt "<描述>" --output <path> [options]
```

| 选项 | 说明 |
|------|------|
| `--prompt <text>` | 视频描述（必填） |
| `--output <path>` | 输出视频文件路径（必填） |
| `--provider <name>` | Provider：`agnes`（默认，免费）、`apimart`、`tuzi` |
| `--model <id>` | 模型 ID（默认 agnes-video-v2.0） |
| `--seconds <n>` | 视频时长秒数（默认 5） |
| `--size <WxH>` | 尺寸（如 `9:16`、`1280x720`，可选） |
| `--resolution <p>` | 分辨率：480p、720p、1080p、4k（默认 1080p） |
| `--ref <path>` | 参考图片路径或 URL（图生视频） |
| `--async` | 只提交不等待，返回 taskId |
| `--poll-interval <ms>` | 轮询间隔（默认 5000） |
| `--timeout <ms>` | 单任务超时毫秒（默认 600000，即 10 分钟） |
| `--json` | JSON 输出 |

### 批量生成

```bash
laoli video batch --batchfile <path>
```

batchfile JSON 格式：
```json
[
  { "prompt": "a cat", "output": "cat.mp4" },
  { "prompt": "a dog", "output": "dog.mp4", "provider": "tuzi" }
]
```

| 选项 | 说明 |
|------|------|
| `--batchfile <path>` | JSON 批处理文件路径（必填） |
| `--async` | 仅提交，不等待下载 |
| `--jobs <count>` | 并发数（默认 2） |

### 其他管理命令

```bash
laoli video list                         # 查看队列
laoli video query --task-id <id>         # 查询任务状态
laoli video download --task-id <id>      # 下载视频
laoli video history                      # 历史记录
```

## Provider 对比

| Provider | 费用 | 提交速度 | 生成速度 | 适用场景 |
|----------|:----:|:--------:|:--------:|---------|
| **agnes** | 免费 | 慢（~60s） | ~3min | 日常主力，不限量 |
| **tuzi** veo3.1 | $0.7/次 | 快（~3s） | ~2min | 加急 |
| **apimart** | $0.05/次 | 快 | - | 需充值 |

## 工作流程

1. **确认需求**：文生视频还是图生视频？是否批量？
2. **选择 Provider**：免费用 agnes，加急用 tuzi
3. **构建 prompt**：清晰描述画面、动作、氛围
4. **生成**：`laoli video generate --prompt "..." --output video.mp4`
5. **获取结果**：等待完成或 `--async` 后回头下载
6. **输出命名**：文生视频 `{描述}-{provider}.mp4`，图生视频 `{描述}-ref-{provider}.mp4`

## 示例

```bash
# 文生视频
laoli video generate --prompt "a cute cat" --output cat.mp4

# 图生视频
laoli video generate --prompt "cat watching sunset" --ref photo.png --output cat-sunset.mp4

# 9:16 竖屏
laoli video generate --prompt "dancing" --size 9:16 --output dance.mp4

# 异步提交
laoli video generate --prompt "city" --async --output city.mp4
laoli video download --task-id xxx-xxx

# 批量
laoli video batch --batchfile tasks.json
```

## 注意事项

- agnes 免费但生成慢，建议 `--poll-interval 8000` 避免限流
- 参考图片本地文件自动通过 picgo 上传图床
- 日志文件位于 `~/.laoli/logs/`
- 所有命令支持 `--help` 查看最新参数
