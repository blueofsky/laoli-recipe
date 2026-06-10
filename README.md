# 📜 laoli-recipe | 老李的食谱

[![CI](https://github.com/blueofsky/laoli-recipe/actions/workflows/ci.yml/badge.svg)](https://github.com/blueofsky/laoli-recipe/actions/workflows/ci.yml)

> **AI Agent 的"烹饪"配方。把复杂的逻辑拆解为可复用的 Skill。**

存放着各种 Agent Skill、Prompt 模板以及自动化工作流的配置文件。

## 📂 项目结构

```
laoli-recipe/
├── config/                      # 统一配置 Schema
│   ├── recipe.schema.json       #   所有 Skill 的配置字段定义
│   └── recipe.example.json      #   配置示例
├── skills/                      # 17 个通用 Skill
│   ├── article/                 # 文章处理
│   │   ├── laoli-article-illustrator/   # 文章插图生成
│   │   ├── laoli-cover-image/           # 文章封面图生成
│   │   └── laoli-url-to-markdown/       # URL 转 Markdown
│   ├── cards/                   # 卡片与漫画创作
│   │   ├── laoli-comic/                 # 知识漫画生成
│   │   └── laoli-image-cards/           # 图片卡片系列生成
│   ├── chart/                   # 图表创作
│   │   ├── laoli-diagram/               # SVG 图表生成
│   │   └── laoli-infographic/           # 信息图生成
│   ├── tools/                   # 效率工具
│   │   ├── laoli-compress-image/        # 图片压缩
│   │   ├── laoli-gc/                    # Git 提交
│   │   ├── laoli-picgo/                 # 图床上传
│   │   └── laoli-sync/                  # 多平台发布
│   └── media/                   # 媒体生成后端
│       ├── laoli-asr/                   # 语音转文字
│       ├── laoli-image/                 # AI 图片生成
│       ├── laoli-music/                 # 音乐生成
│       ├── laoli-tts/                   # 文本转语音
│       ├── laoli-video/                 # AI 视频生成
│       └── laoli-vision/                # 图片视频理解
├── .claude/                     # Claude Code 平台适配
│   ├── skills/laoli-lens/       #   平台绑定的 subagent Skill
│   └── marketplace.json
├── .hermes/                     # Hermes 平台适配
│   └── skills/laoli-lens/       #   平台绑定的 subagent Skill
├── src/types/                   # TypeScript 类型声明
├── package.json                 # 统一依赖管理（Bun 运行时）
├── tsconfig.json
└── README.md
```

## 📋 Skill 配置管理

所有 Skill 的配置通过 `laoli recipe` CLI 管理：

```bash
# 查看配置
laoli recipe get --skill <skill-name>

# 设置配置
laoli recipe set --skill <skill-name> --key <key> --value <value>

# 查看配置 Schema
laoli recipe schema --skill <skill-name>
```

首次使用时会自动提示配置，配置保存在 `~/.laoli/recipes.json` 中。

## 🛠 技术栈

- **TypeScript** 脚本使用 [Bun](https://bun.sh) 运行
- 依赖：`@mozilla/readability`、`turndown`、`jsdom`、`pdf-lib`、`sharp`

---

*代码是食材，逻辑是火候，这个食谱能帮你做出聪明的 Agent。*
