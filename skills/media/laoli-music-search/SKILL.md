---
name: laoli-music-search
description: 视频号BGM搜索推荐，Search and recommend BGM from WeChat Video Channel for image card series. Use when user asks to "选BGM", "找背景音乐", "推荐配乐", or needs music for 视频号图文.
version: 1.0.0
---

# BGM Search & Recommend

Searches BGM from WeChat Video Channel backend API and presents options for user selection.

## Script Directory

Scripts in `scripts/` subdirectory. `{baseDir}` = this SKILL.md's directory path. Resolve `${BUN_X}` runtime: if `bun` installed → `bun`; if `npx` available → `npx -y bun`; else suggest installing bun. Replace `{baseDir}` and `${BUN_X}` with actual values.

| Script | Purpose |
|--------|---------|
| `scripts/main.ts` | BGM search CLI |

## Configuration

Cookie management via script args or `.output/bgm_cookie.txt`:

```bash
# Save cookie to file
echo "compass_token=xxx;wxuin=123;..." > .output/bgm_cookie.txt

# Or pass directly
${BUN_X} {baseDir}/scripts/main.ts --cookie "compass_token=xxx;wxuin=123" --query "悬疑"
```

## Usage

```bash
${BUN_X} {baseDir}/scripts/main.ts [options]
```

## Options

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--query <text>` | `-q` | Search keyword (e.g. 悬疑, 温馨, 紧张) | 浏览推荐列表 |
| `--type <103/104>` | `-t` | 103=推荐浏览, 104=搜索 | 103 (有query时自动104) |
| `--page <n>` | `-p` | Page number | 1 |
| `--size <n>` | `-s` | Page size | 50 |
| `--cookie <text>` | `-c` | WeChat cookie string | 读取 `.output/bgm_cookie.txt` |
| `--instrumental` | `-i` | Only show pure BGM (纯音乐, no vocals) | false |
| `--json` | | JSON output | false |
| `-h, --help` | | Show help | |

## Examples

```bash
# Browse recommended BGM
${BUN_X} {baseDir}/scripts/main.ts

# Search by keyword
${BUN_X} {baseDir}/scripts/main.ts -q "悬疑"

# Search with custom cookie
${BUN_X} {baseDir}/scripts/main.ts -q "历史" -c "compass_token=xxx;wxuin=123"

# JSON output for programmatic use
${BUN_X} {baseDir}/scripts/main.ts -q "深沉" --json
```

## Output

```
BGM 搜索结果 (query: 悬疑) — 共 19 首
──────────────────────────────────────────────────
  1. ♪ 悬疑    阿鲲   1:31
     play: http://wx.music.tc.qq.com/...
  2. ♪ 悬疑 (打击乐)    孟可   1:00
     play: http://wx.music.tc.qq.com/...
  3. 🎤 悬疑    冯一仔   2:16
     play: http://wx.music.tc.qq.com/...
```

**标记**: ♪ = 纯音乐，🎤 = 带人声

**JSON 输出字段** (`--json`):

| 字段 | 路径 | 说明 |
|------|------|------|
| 曲名 | `data.items[].listenItem.playableInfo.title` | BGM 标题 |
| 作者 | `data.items[].listenItem.playableInfo.author` | 创作者 |
| 封面 | `data.items[].listenItem.playableInfo.cover` | 封面图 URL |
| 时长 | `data.items[].listenItem.playableInfo.duration` | 毫秒 |
| 播放链接 | `data.items[].listenItem.url` | 音频直链（有时效） |
| 歌词 | `data.items[].listenItem.lyric` | 含"没有填词的纯音乐"=纯音乐 |
| 分页游标 | `data.lastBuffer` | 下一页传入 `lastBuffer` |
| 总数 | `data.totalCount` | 搜索结果总数 |
