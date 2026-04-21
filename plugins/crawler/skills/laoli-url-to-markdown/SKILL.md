---
name: laoli-url-to-markdown
description: 通过 Chrome CDP 抓取任意 URL 并转换为 Markdown。优先提取微信公众号正文区域（#js_content），自动下载图片到 assets/ 目录，输出格式为自定义头部（标题+来源+链接）。当用户要求将网页保存为 Markdown 时使用。
---

# URL to Markdown

通过 Chrome CDP 抓取任意 URL 并转换为 Markdown。

## Script Directory

**Important**: All scripts are located in the `scripts/` subdirectory of this skill.

**Agent Execution Instructions**:
1. Determine this SKILL.md file's directory path as `SKILL_DIR`
2. Script path = `${SKILL_DIR}/scripts/<script-name>.ts`
3. Replace all `${SKILL_DIR}` in this document with the actual path

**Script Reference**:
| Script | Purpose |
|--------|---------|
| `scripts/main.ts` | CLI entry point for URL fetching |

## Preferences (EXTEND.md)

Use Bash to check EXTEND.md existence (priority order):

```bash
# Check project-level first
test -f .laoli-recipe/laoli-url-to-markdown/EXTEND.md && echo "project"

# Then user-level (cross-platform: $HOME works on macOS/Linux/WSL)
test -f "$HOME/.laoli-recipe/laoli-url-to-markdown/EXTEND.md" && echo "user"
```

┌────────────────────────────────────────────────────────┬───────────────────┐
│                          Path                          │     Location      │
├────────────────────────────────────────────────────────┼───────────────────┤
│ .laoli-recipe/laoli-url-to-markdown/EXTEND.md     │ Project directory │
├────────────────────────────────────────────────────────┼───────────────────┤
│ $HOME/.laoli-recipe/laoli-url-to-markdown/EXTEND.md │ User home         │
└────────────────────────────────────────────────────────┴───────────────────┘

┌───────────┬───────────────────────────────────────────────────────────────────────────┐
│  Result   │                                  Action                                   │
├───────────┼───────────────────────────────────────────────────────────────────────────┤
│ Found     │ Read, parse, apply settings                                               │
├───────────┼───────────────────────────────────────────────────────────────────────────┤
│ Not found │ **MUST** use `AskUserQuestion` to ask the user for their preferences before creating EXTEND.md. **NEVER** create EXTEND.md with defaults without asking. This is a **BLOCKING** operation — do NOT proceed with any conversion until setup is complete. │
└───────────┴───────────────────────────────────────────────────────────────────────────┘

**EXTEND.md Supports**: Download media by default | Default output directory | Default capture mode | Timeout settings

### First-Time Setup (BLOCKING)

**CRITICAL**: When EXTEND.md is not found, you **MUST use `AskUserQuestion`** to ask the user for their preferences before creating EXTEND.md. **NEVER** create EXTEND.md with defaults without asking. This is a **BLOCKING** operation — do NOT proceed with any conversion until setup is complete.

Use `AskUserQuestion` with ALL questions in ONE call:

**Question 1** — header: "Media", question: "How to handle images and videos in pages?"
- "Ask each time (Recommended)" — After saving markdown, ask whether to download media
- "Always download" — Always download media to local assets/ and videos/ directories
- "Never download" — Keep original remote URLs in markdown

**Question 2** — header: "Output", question: "Default output directory?"
- "common/reference (Recommended)" — Save to ./common/reference/{slug}/
- (User may choose "Other" to type a custom path)

**Question 3** — header: "Save", question: "Where to save preferences?"
- "User (Recommended)" — ~/.laoli-recipe/ (all projects)
- "Project" — .laoli-recipe/ (this project only)

After user answers, create EXTEND.md at the chosen location, confirm "Preferences saved to [path]", then continue.

Full reference: [references/config/first-time-setup.md](references/config/first-time-setup.md)

### Supported Keys

| Key | Default | Values | Description |
|-----|---------|--------|-------------|
| `download_media` | `ask` | `ask` / `1` / `0` | `ask` = prompt each time, `1` = always download, `0` = never |
| `default_output_dir` | empty | path or empty | Default output directory (empty = `./url-to-markdown/`) |

**Value priority**:
1. CLI arguments (`--download-media`, `-o`)
2. EXTEND.md
3. Skill defaults

## Features

- Chrome CDP for full JavaScript rendering
- Two capture modes: auto or wait-for-user
- **优先提取微信公众号正文区域**（#js_content），避免页眉页脚干扰
- **自动下载图片到 `assets/` 目录**，链接替换为相对路径
- **自定义头部格式**：标题 H1 + 来源 + 作者（如有）+ 发布时间（如有）+ 原文链接
- 支持视频下载到 `videos/` 目录

## Usage

```bash
# Auto mode (default) - capture when page loads
npx -y bun ${SKILL_DIR}/scripts/main.ts <url>

# Wait mode - wait for user signal before capture
npx -y bun ${SKILL_DIR}/scripts/main.ts <url> --wait

# Save to specific file
npx -y bun ${SKILL_DIR}/scripts/main.ts <url> -o output.md

# Download images to local assets/ directory
npx -y bun ${SKILL_DIR}/scripts/main.ts <url> --download-media
```

## Options

| Option | Description |
|--------|-------------|
| `<url>` | URL to fetch |
| `-o <path>` | Output file path (default: auto-generated) |
| `--wait` | Wait for user signal before capturing |
| `--timeout <ms>` | Page load timeout (default: 30000) |
| `--download-media` | Download image/video assets to local `assets/` and `videos/`, and rewrite markdown links to local relative paths |

## Capture Modes

| Mode | Behavior | Use When |
|------|----------|----------|
| Auto (default) | Capture on network idle | Public pages, static content |
| Wait (`--wait`) | User signals when ready | Login-required, lazy loading, paywalls |

**Wait mode workflow**:
1. Run with `--wait` → script outputs "Press Enter when ready"
2. Ask user to confirm page is ready
3. Send newline to stdin to trigger capture

## Output Format

头部元信息（无 YAML frontmatter），后接 Markdown 正文：

```markdown
# 文章标题

**来源：** 微信公众号
**原文链接：** https://mp.weixin.qq.com/s/xxx
```

## Output Directory

```
common/reference/<slug>/
├── index.md
├── assets/
│   ├── img-001.webp
│   └── img-002.png
└── videos/      (如有)
```

- `<slug>`: From page title (kebab-case)
- Conflict resolution: Append timestamp `<slug>-YYYYMMDD-HHMMSS.md`

When `--download-media` is enabled:
- Images are saved to `assets/` next to the markdown file
- Videos are saved to `videos/` next to the markdown file
- Markdown image links are rewritten to local relative paths (`./assets/img-xxx`)

## Media Download Workflow

Based on `download_media` setting in EXTEND.md:

| Setting | Behavior |
|---------|----------|
| `1` (always) | Run script with `--download-media` flag |
| `0` (never) | Run script without `--download-media` flag |
| `ask` (default) | Follow the ask-each-time flow below |

### Ask-Each-Time Flow

1. Run script **without** `--download-media` → markdown saved
2. Check saved markdown for remote media URLs (`https://` in image/video links)
3. **If no remote media found** → done, no prompt needed
4. **If remote media found** → use `AskUserQuestion`:
   - header: "Media", question: "Download N images/videos to local files?"
   - "Yes" — Download to local directories
   - "No" — Keep remote URLs
5. If user confirms → run script **again** with `--download-media` (overwrites markdown with localized links)

## Environment Variables

| Variable | Description |
|----------|-------------|
| `URL_CHROME_PATH` | Custom Chrome executable path |
| `URL_DATA_DIR` | Custom data directory |
| `URL_CHROME_PROFILE_DIR` | Custom Chrome profile directory |

**Troubleshooting**: Chrome not found → set `URL_CHROME_PATH`. Timeout → increase `--timeout`. Complex pages → try `--wait` mode.

## Extension Support

Custom configurations via EXTEND.md. See **Preferences** section for paths and supported options.
