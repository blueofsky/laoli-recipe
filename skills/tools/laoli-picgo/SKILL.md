---
name: laoli-picgo
description: "Upload images to GitHub repository as an image hosting service using picgo-core. Use when user mentions uploading images to GitHub, needs to host images externally, or asks for image URL generation from GitHub. This skill handles the complete workflow of configuring picgo-core with GitHub settings and uploading images with automatic timestamp-based filename renaming and URL retrieval. CRITICAL - Before asking user to configure PicGo, always check if the configuration file exists at ~/.picgo/config.json and contains valid GitHub settings. If configuration exists and is valid, use it directly without asking user to reconfigure."
version: 1.56.1
dependencies:
  runtime:
    - name: node
      version: ">=18.0.0"
      optional: false
      reason: "picgo 运行时要求"
  external:
    - name: picgo
      version: ">=1.6.0"
      install: "npm install -g picgo"
      reason: "图片上传核心工具"
    - name: picgo-plugin-rename-image
      version: "latest"
      install: "picgo install picgo-plugin-rename-image"
      reason: "可选的时间戳重命名插件"
---

# Laoli PicGo GitHub Upload

## Overview

This skill enables uploading images to GitHub repositories to create a reliable, permanent image hosting solution. It provides the complete workflow for configuring picgo-core with GitHub credentials and uploading images while retrieving their public URLs for use in documents, websites, or applications.

## Prerequisites

### Required Configuration

This skill uses picgo-core for uploading images. Before using:

1. Install picgo-core: `npm install -g picgo`
2. Configure picgo with GitHub credentials: `picgo set github`
3. The configuration file is stored at `~/.picgo/config.json`

**IMPORTANT: Before asking user for configuration, always check if the configuration file exists at `~/.picgo/config.json`. If it exists and contains valid GitHub configuration, use it directly. DO NOT ask user to reconfigure if they already have a valid configuration.**

### PicGo Configuration Format

The skill requires picgo-core to be configured with GitHub settings. The configuration file should contain:

```bash
picgo set uploader github
picgo set github.repo <owner>/<repo>
picgo set github.token <personal-access-token>
picgo set github.path <path-in-repo>  # e.g., "assets/images"
picgo set github.customUrl <custom-domain>  # optional
picgo set github.branch <branch>  # defaults to "main"
```

**Optional: Install rename plugin for automatic timestamp renaming:**
```bash
picgo install picgo-plugin-rename-image
picgo set rename-image.format {Y}{m}{d}{H}{M}{S}{ms}
picgo set rename-image.disable false
```

Alternative configuration method: create a `picgo.config.json` file:

```json
{
  "picBed": {
    "uploader": "github",
    "github": {
      "repo": "owner/repo",
      "token": "your-personal-access-token",
      "path": "assets/images",
      "branch": "main",
      "customUrl": "https://cdn.jsdmirror.com/gh/owner/repo@main"
    }
  },
  "picgoPlugins": {
    "picgo-plugin-rename-image": {
      "format": "{Y}{m}{d}{H}{M}{S}{ms}",
      "disable": false
    }
  }
}
```

**📌 推荐使用 jsdMirror CDN 作为自定义域名（国内访问更稳定）：**
```
https://cdn.jsdmirror.com/gh/<owner>/<repo>@<branch>/
```
国内用户推荐使用 jsdMirror 镜像，访问速度更快更稳定。

**🌍 国际用户可以使用 jsDelivr CDN：**
```
https://cdn.jsdelivr.net/gh/<owner>/<repo>@<branch>/
```
这样可以获得更快的访问速度和更好的 CDN 加速效果。

## Core Capabilities

### 1. Verify PicGo Configuration

Check if picgo-core is properly configured before attempting uploads:

```bash
picgo set uploader
picgo config
```

Expected output shows:
- Current uploader: `github`
- GitHub configuration parameters (repo, token, path, branch)

If not configured, prompt the user for:
- GitHub repository owner and name
- Personal access token
- Target path within the repository
- Branch name (optional, defaults to `main`)
- **Custom domain URL (optional, but highly recommended for performance)**

### 2. Upload Single Image with Timestamp Renaming

Upload a single image file to GitHub with automatic timestamp-based filename. The file will be renamed to avoid conflicts.

**IMPORTANT: Use picgo-plugin-rename-image plugin for automatic timestamp renaming. This is the default method.**

**Default method (automatic renaming with plugin):**

First, ensure the rename plugin is installed and configured:
```bash
# Install rename plugin (if not already installed)
picgo install picgo-plugin-rename-image

# Configure the plugin with millisecond timestamp format
picgo set rename-image.format {Y}{m}{d}{H}{M}{S}{ms}
picgo set rename-image.disable false
```

Then upload the image normally (plugin will automatically add timestamp):
```bash
picgo upload <image-file-path>
```

Expected output format:
```
[PicGo SUCCESS]:
https://raw.githubusercontent.com/<owner>/<repo>/<branch>/<path>/<timestamped-filename>
```

Process:
1. Check if picgo-plugin-rename-image is installed, if not, install it
2. Verify plugin configuration (timestamp format: `{Y}{m}{d}{H}{M}{S}{ms}`)
3. Verify the image file exists
4. Check picgo-core GitHub configuration
5. Execute upload command (plugin automatically renames file with millisecond timestamp)
6. Parse output to extract the URL
7. Return the URL to the user

Error handling:
- If configuration is missing: guide user through setup
- If token has expired: prompt for new token
- If upload fails: display error message and suggest solutions

### 3. Upload Multiple Images with Timestamp Renaming

Upload multiple images at once using glob patterns or explicit paths. Each file will be renamed with a unique timestamp.

**Default method (automatic renaming with plugin):**

First, ensure the rename plugin is installed and configured:
```bash
# Install rename plugin (if not already installed)
picgo install picgo-plugin-rename-image

# Configure the plugin with millisecond timestamp format
picgo set rename-image.format {Y}{m}{d}{H}{M}{S}{ms}
picgo set rename-image.disable false
```

Then upload multiple images normally (plugin will automatically rename each file):
```bash
# Upload multiple files
picgo upload image1.png image2.jpg image3.gif

# Or upload all PNG files in current directory
picgo upload *.png
```

Process:
1. Check if picgo-plugin-rename-image is installed, if not, install it
2. Verify plugin configuration (timestamp format: `{Y}{m}{d}{H}{M}{S}{ms}`)
3. Gather all image paths
4. Verify each file exists
5. Execute batch upload command (plugin automatically renames each file with millisecond timestamp)
6. Parse all URLs from output
7. Return list of URLs mapped to original filenames

### 4. Configure PicGo for GitHub

Guide users through setting up picgo-core with GitHub credentials:

**Interactive Setup Workflow:**
1. Ask for GitHub repository (format: `owner/repo`)
2. Ask for Personal Access Token
3. Ask for target path in repository (e.g., `assets/images`)
4. Ask for branch name (optional, default: `main`)
5. **Ask for custom domain URL (optional, for CDN) - IMPORTANT: This is highly recommended for better performance!**
6. Apply configuration using picgo set commands
7. Verify configuration

**Example configuration session:**
```
User: I want to upload images to my GitHub repo
Assistant: To configure picgo-core for GitHub, I need:
- Repository name (e.g., "username/image-host")
- Personal Access Token
- Target path in the repo (e.g., "images")
- Branch name (default: "main")

📌 **Important Recommendation:** 设置自定义域名以获得更好的访问速度！
   - 国内用户推荐使用 jsdMirror: https://cdn.jsdmirror.com/gh/<owner>/<repo>@<branch>/
   - 国际用户可以使用 jsDelivr: https://cdn.jsdelivr.net/gh/<owner>/<repo>@<branch>/
   - 这将显著提升图片加载速度，特别是在生产环境中。

Once configured, I can upload any image and provide you with the public URL.
```

### 5. Retrieve Image Information

After upload, the image URL follows this pattern:

**Default GitHub raw URL:**
```
https://raw.githubusercontent.com/<owner>/<repo>/<branch>/<path>/<filename>
```

**With custom domain (if configured):**
```
https://<custom-domain>/<path>/<filename>
```

The URL structure can be used to:
- Embed images in Markdown documents
- Reference images in HTML/JavaScript applications
- Share image links directly
- Use as CDN-hosted image resources

## Workflow Decision Tree

```
User request
├─ "Upload image to GitHub"
│  ├─ Is picgo configured?
│  │  ├─ Yes → Upload image and return URL
│  │  └─ No → Guide through configuration, then upload
│
├─ "Configure picgo for GitHub"
│  └─ Run interactive setup workflow
│
├─ "Upload multiple images"
│  └─ Batch upload and return URL list
│
└─ "Check picgo configuration"
   └─ Display current settings or guide setup
```

## Best Practices

### Security

- Never hardcode Personal Access Tokens in code
- Store tokens securely using `picgo set` command or environment variables
- Use minimal token scopes (`public_repo` for public repos, `repo` for private repos)
- Rotate tokens periodically
- Never commit `picgo.config.json` with tokens to version control

### Repository Organization

- Use a dedicated repository for image hosting
- Organize images in logical subdirectories (e.g., `blog/`, `assets/`, `screenshots/`)
- **Use timestamp-based filenames for automatic organization** (e.g., `20240328143025123.png`)
  - Milliseconds precision prevents even rare filename conflicts
  - Provides chronological ordering
  - Makes it easy to find images by upload time
  - Supports high-frequency uploads without collision
- Consider adding a `README.md` explaining the image organization

### Performance

- Use CDN (custom domain) for faster image loading in production
- Optimize images before upload (compress, appropriate format)

**国内用户推荐使用 jsdMirror CDN（访问更快更稳定）：**
```
https://cdn.jsdmirror.com/gh/<owner>/<repo>/<branch>/<path>/<filename>
```

**国际用户可以使用 jsDelivr CDN：**
```
https://cdn.jsdelivr.net/gh/<owner>/<repo>/<branch>/<path>/<filename>
```

## Troubleshooting

### Common Issues

**Issue:** "Authentication failed"
- Solution: Verify Personal Access Token is valid and has correct permissions
- Check token hasn't expired or been revoked

**Issue:** "Repository not found"
- Solution: Verify repo format is `owner/repo-name` (not URL)
- Ensure repository exists and user has access

**Issue:** "Upload timeout"
- Solution: Check network connectivity
- Reduce image size or file count
- Verify token has sufficient permissions

**Issue:** "picgo command not found"
- Solution: Install picgo-core globally:
  ```bash
  npm install -g picgo
  ```

## Resources

### External References

- [PicGo Documentation](https://picgo.github.io/PicGo/)
- [GitHub Personal Access Tokens](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token)
- [jsdMirror CDN for GitHub (国内推荐)](https://cdn.jsdmirror.com/)
- [jsDelivr CDN for GitHub](https://www.jsdelivr.com/features#gh)

### Related Tools

This skill integrates with:
- **picgo-core**: Core CLI tool for image uploading
- **GitHub API**: For repository operations
- **Git**: For repository management (optional)

---

This skill provides a complete solution for GitHub-based image hosting, from initial setup to daily image upload operations.
