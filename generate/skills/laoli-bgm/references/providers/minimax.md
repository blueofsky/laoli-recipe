---
name: minimax-music
description: MiniMax Music Generation provider (HTTP API 直调)
---

# MiniMax BGM 生成

调用 `scripts/main.ts` 执行 MiniMax 音乐生成 HTTP API 直接调用。

## 环境要求

```bash
# 在 ~/.laoli-recipe/.env 或项目 .laoli-recipe/.env 中配置
MINIMAX_API_KEY=your_api_key_here
MINIMAX_BASE_URL=https://api.minimaxi.com   # 可选，默认 https://api.minimaxi.com
```

API Key 可在 [MiniMax 账户管理 > 接口密钥](https://platform.minimaxi.com/user-center/basic-information/interface-key) 获取。

## 调用示例

```bash
cd <skill-root-directory>
npx -y bun scripts/main.ts \
  --prompt "独立民谣, 忧郁, 咖啡馆, 适合独自漫步的夜晚" \
  --output "d:/output/path"
```

所有参数均可省略（`--prompt` 除外），使用内置默认值：

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `--model` | `music-2.6` | 模型 ID（付费） |
| `--style` | EXTEND.md `default_style` | 风格基调，自动拼接到 prompt 前 |
| `--format` | `mp3` | 音频格式 (mp3/wav/pcm) |
| `--sample-rate` | `44100` | 采样率: 16000, 24000, 32000, 44100 |
| `--bitrate` | `256000` | 比特率: 32000, 64000, 128000, 256000 |
| `--aigc-watermark` | *(不添加)* | 添加 AIGC 水印 |

## 参数映射

| CLI 参数 | 值来源 | 说明 |
|----------|--------|------|
| `--prompt` | 用户 `[prompt]` | 音乐风格描述（可通过 prompt 暗示时长，见下方说明） |
| `--style` | EXTEND.md `default_style` 或 CLI `--style` | 风格基调前缀，自动组合为 `{style}, {prompt}` |
| `--output` | 用户 `[output-directory]` | 输出目录 |
| `--provider` | 自动检测 或 EXTEND.md | 提供商名称 |
| `--model` | EXTEND.md `default_model` 或 **固定值**: `music-2.6` | 模型 ID |
| `--format` | EXTEND.md `default_format` 或 **固定值**: `mp3` | 音频格式 |
| `--sample-rate` | **固定值**: `44100` | 采样率 |
| `--bitrate` | **固定值**: `256000` | 比特率 |

## API 说明

调用 MiniMax 音乐生成 HTTP API：

- **接口**: `POST <MINIMAX_BASE_URL>/v1/music_generation`
- **认证**: Bearer Token（`MINIMAX_API_KEY`）
- **模式**: 非流式（`stream: false`）
- **类型**: 纯音乐（`is_instrumental: true`）
- **输出**: 返回 hex 编码的音频数据，解码后保存为本地文件
- **BGM 固定参数**: `is_instrumental: true`, `lyrics_optimizer: false`
- **BASE_URL**: 通过 `MINIMAX_BASE_URL` 环境变量配置（默认 `https://api.minimaxi.com`）

## 时长控制

MiniMax API 没有独立的 `duration` 参数，时长通过 **prompt 描述暗示**来控制，但**效果不可靠**。可以在 prompt 中尝试写明时长要求：

```text
# 短循环
"生成一段30秒的循环背景音乐，适合短视频"

# 标准
"一首3分钟左右的民谣风格纯音乐，适合咖啡馆"

# 完整曲目
"创作一首4分钟的完整纯音乐，有前奏-主歌-副歌-尾奏结构"
```

> **注意**：prompt 暗示时长是**软控制**，实际生成时长由模型自主决定，偏差可能很大（实测写 10 秒生成了 113 秒）。如需精确时长，建议生成后自行裁剪。

## 注意事项

1. **`music-2.6` 模型需要 Token Plan 或付费用户**，免费用户可使用 `music-2.6-free`（RPM 较低）
2. **生成耗时约 10-30 秒**，请耐心等待
3. **output_directory 必须为完整绝对路径**，确保脚本能正确写入文件
4. **API Key 优先读取环境变量 `MINIMAX_API_KEY`**，其次从 `.env` 文件中加载
5. **`MINIMAX_BASE_URL` 支持带 `/v1` 后缀**，会自动去重拼接
