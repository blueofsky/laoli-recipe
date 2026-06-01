---
name: minimax-tts
description: MiniMax TTS provider (HTTP API 直调)
---

# MiniMax TTS

调用 `scripts/main.ts` 执行 MiniMax TTS HTTP API 直接调用。

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
  --text "中华人民共和国万岁，世界人民大团结万岁！" \
  --output "d:/output/path"
```

所有参数均可省略，使用内置默认值：

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `--model` | `speech-2.8-hd` | 模型 ID |
| `--voice` | `ttv-voice-2026051917163326-rttkUOFO` | 音色 ID（男声）|
| `--speed` | `1.0` | 语速 (0.5~2) |
| `--vol` | `3` | 音量 (0~10) |
| `--pitch` | `0` | 语调 (-12~12) |
| `--format` | `mp3` | 音频格式 (mp3/pcm/flac/wav) |
| `--emotion` | *(不指定)* | happy, sad, angry, fearful, disgusted, surprised, calm, fluent, whisper |
| `--sample-rate` | `32000` | 8000, 16000, 22050, 24000, 32000, 44100 |
| `--bitrate` | `128000` | 32000, 64000, 128000, 256000 |
| `--channel` | `1` | 1, 2 |
| `--language-boost` | `Chinese` | 语言增强 |

## 参数映射

| CLI 参数 | 值来源 | 说明 |
|----------|--------|------|
| `--text` | 用户 `[text]` | 台词文本 |
| `--output` | 用户 `[output-directory]` | 输出目录 |
| `--provider` | 自动检测 或 EXTEND.md | 提供商名称（可省略，脚本自动检测）|
| `--model` | **固定值**: `speech-2.8-hd` | 模型 ID |
| `--voice` | **固定值**: `ttv-voice-2026051917163326-rttkUOFO` | 音色 ID（男声）|
| `--vol` | **固定值**: `3` | 音量 |
| `--speed` | **固定值**: `1.0` | 语速 |
| `--format` | **固定值**: `mp3` | 音频格式 |
| `--language-boost` | **固定值**: `Chinese` | 语言增强 |

## API 说明

调用 MiniMax 同步语音合成 HTTP API：

- **接口**: `POST <MINIMAX_BASE_URL>/v1/t2a_v2`
- **认证**: Bearer Token（`MINIMAX_API_KEY`）
- **模式**: 非流式（`stream: false`）
- **输出**: 返回 hex 编码的音频数据，解码后保存为本地文件
- **BASE_URL**: 通过 `MINIMAX_BASE_URL` 环境变量配置（默认 `https://api.minimaxi.com`）

## 注意事项

1. **voice_id 默认使用男声 `ttv-voice-2026051917163326-rttkUOFO`**，可通过 `--voice` 覆盖
2. **language_boost 必须设为 `Chinese`**：确保中文发音准确
3. **output_directory 必须为完整绝对路径**，确保脚本能正确写入文件
4. **API Key 优先读取环境变量 `MINIMAX_API_KEY`**，其次从 `.env` 文件中加载
5. **`MINIMAX_BASE_URL` 支持带 `/v1` 后缀**，会自动去重拼接
