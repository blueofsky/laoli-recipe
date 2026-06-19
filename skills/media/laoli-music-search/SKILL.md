---
name: laoli-music-search
description: BGM搜索推荐，Search and recommend BGM from WeChat Video Channel and Jianying. Use when user asks to "选BGM", "找背景音乐", "推荐配乐", or needs music for 图文, 视频, 短视频等.
version: 1.1.0
---

# BGM Search & Recommend

Searches BGM from WeChat Video Channel and Jianying backend APIs and presents options for user selection.

## Script Directory

Scripts in `scripts/` subdirectory. `{baseDir}` = this SKILL.md's directory path. Resolve `${BUN_X}` runtime: if `bun` installed → `bun`; if `npx` available → `npx -y bun`; else suggest installing bun. Replace `{baseDir}` and `${BUN_X}` with actual values.

| Script | Purpose |
|--------|---------|
| `scripts/main.ts` | BGM search CLI 入口 |
| `scripts/providers/weixin.ts` | 微信视频号 BGM provider |
| `scripts/providers/jianying.ts` | 剪映 BGM provider |
| `scripts/providers/index.ts` | Provider 注册中心 |

## Providers

支持两个 BGM 数据源：

| Provider | 域名 | 适用场景 | Cookie 来源 |
|----------|------|----------|-------------|
| `weixin` | channels.weixin.qq.com | 视频号图文、短视频 | `.output/weixin.rest` 中的 `@cookie` 变量 |
| `jianying` | www.jianying.com | 剪映视频编辑 | `.output/jianying.rest` 中的 `@cookie` 变量 |

### Provider 参数

通过 `--provider` 参数选择数据源：
- `weixin`（默认）：微信视频号 BGM
- `jianying`：剪映 BGM（可下载，适用于各种视频制作）

## Configuration

Cookie 自动从 `.output/<provider>.rest` 文件中的 `@cookie` 变量读取：

```bash
# weixin.rest 文件中定义 @cookie 变量
@cookie = yybClient-id=xxx; guid=web; ...

# jianying.rest 文件中定义 @cookie 变量
@cookie = passport_csrf_token=xxx; sid_tt=123; ...

# 也可以通过 --cookie 参数直接传入
${BUN_X} {baseDir}/scripts/main.ts --provider weixin --cookie "compass_token=xxx;wxuin=123" --query "悬疑"
${BUN_X} {baseDir}/scripts/main.ts --provider jianying --cookie "passport_csrf_token=xxx" --query "悬疑"
```

> ⚠️ **Cookie 会过期**：如果搜索返回空结果或错误，很可能是 cookie 过期。让用户在对应平台重新抓取 cookie 并更新 `.rest` 文件中的 `@cookie` 变量。

## Usage

```bash
${BUN_X} {baseDir}/scripts/main.ts [options]
```

## Options

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--provider <weixin/jianying>` | | BGM data source | weixin |
| `--query <text>` | `-q` | Search keyword (e.g. 悬疑, 温馨, 紧张) | 浏览推荐列表 |
| `--type <103/104>` | `-t` | 103=推荐浏览, 104=搜索 (仅 weixin) | 103 (有query时自动104) |
| `--page <n>` | `-p` | Page number | 1 |
| `--size <n>` | `-s` | Page size | 50 |
| `--cookie <text>` | `-c` | Cookie string | 从 `.output/<provider>.rest` 中的 `@cookie` 变量读取 |
| `--instrumental` | `-i` | Only show pure BGM (纯音乐, no vocals) | false |
| `--json` | | JSON output | false |
| `-h, --help` | | Show help | |

## Examples

```bash
# 微信视频号 BGM
${BUN_X} {baseDir}/scripts/main.ts --provider weixin
${BUN_X} {baseDir}/scripts/main.ts --provider weixin -q "悬疑"
${BUN_X} {baseDir}/scripts/main.ts -q "历史" -c "compass_token=xxx;wxuin=123"

# 剪映 BGM (可下载，适用于视频制作)
${BUN_X} {baseDir}/scripts/main.ts --provider jianying -q "悬疑"
${BUN_X} {baseDir}/scripts/main.ts --provider jianying -q "史诗" -c "passport_csrf_token=xxx;sid_tt=123"

# JSON output for programmatic use
${BUN_X} {baseDir}/scripts/main.ts -q "深沉" --json

# 只显示纯音乐
${BUN_X} {baseDir}/scripts/main.ts -q "紧张" -i
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
