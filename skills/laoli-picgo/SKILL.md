---
name: laoli-picgo
description: >
  图片上传到 GitHub 图床。使用 laoli picgo 命令上传图片并获取 URL。
  当用户需要上传图片到图床、获取图片链接、托管图片或配置图床时触发。
license: MIT
metadata:
  version: "1.0.0"
  category: utility
triggers:
  - 上传图片
  - 图床
  - 图片链接
  - 图片托管
  - 配置图床
  - upload image
  - image hosting
  - image URL
  - picgo
sources:
  - laoli picgo upload --help
  - laoli picgo config --help
dependencies:
  cli:
    name: laoli
    version: ">=1.0.0"
---

# 图片上传 Skill（PicGo）

## 前置条件

- 安装 CLI：`npm install -g laoli-creative`
- 准备 GitHub 公开仓库和 Personal Access Token（权限：repo）

## 命令

### 配置

```bash
laoli picgo config --repo <owner/repo> --token <token> [options]
```

| 选项 | 说明 |
|------|------|
| `--repo <repo>` | GitHub 仓库（如 `username/image-host`） |
| `--token <token>` | GitHub Personal Access Token |
| `--path <path>` | 仓库内路径（默认 `img/`） |
| `--branch <branch>` | 分支（默认 `main`） |
| `--custom-url <url>` | 自定义 CDN 域名（可选） |
| `--show` | 查看当前配置（无需其他参数） |

### 上传

```bash
laoli picgo upload --input <path> [options]
```

| 选项 | 说明 |
|------|------|
| `--input <path>` | 图片文件路径或目录（必填） |
| `--batch` | 批量上传（input 为目录时必需） |
| `--json` | JSON 输出 |

## 工作流程

1. **首次使用**：创建 GitHub 公开仓库 → 生成 Personal Access Token
2. **配置**：`laoli picgo config --repo user/repo --token ghp_xxx`
3. **上传**：`laoli picgo upload --input image.png`
4. **获取 URL**：返回可直接访问的图片链接

## CDN 加速配置

```bash
laoli picgo config \
  --repo user/repo \
  --token ghp_xxxxx \
  --path img/ \
  --branch main \
  --custom-url "https://cdn.jsdmirror.com/gh/user/repo@main"
```

## 示例

```bash
# 配置
laoli picgo config --repo blueofsky/laolihub --token ghp_xxxxx

# 查看配置
laoli picgo config --show

# 单张上传
laoli picgo upload --input image.png

# 批量上传
laoli picgo upload --input ./images/ --batch
```

## 注意事项

- 图片自动重命名为时间戳格式
- 支持格式：PNG、JPG、GIF、WebP
- Token 保存在 `~/.laoli/.env`，不写入配置文件
- 日志文件位于 `~/.laoli/logs/`
- 所有命令支持 `--help` 查看最新参数
