# 📜 laoli-recipe | 老李的食谱

[![CI](https://github.com/blueofsky/laoli-recipe/actions/workflows/ci.yml/badge.svg)](https://github.com/blueofsky/laoli-recipe/actions/workflows/ci.yml)

> **AI Agent 的"烹饪"配方。把复杂的逻辑拆解为可复用的 Skill。**

存放着各种 Agent Skill、Prompt 模板以及自动化工作流的配置文件。

## 📂 项目结构

```
laoli-recipe/
├── skills/                      # 16 个通用 Skill
│   ├── article/                 # 文章相关
│   │   ├── laoli-article-illustrator/
│   │   └── laoli-url-to-markdown/
│   ├── cards/                   # 卡片生成
│   │   ├── laoli-card-base/
│   │   ├── laoli-card-meal/
│   │   └── laoli-card-travel/
│   ├── chart/                   # 图表生成
│   │   └── laoli-chart/
│   ├── devops/                  # 运维工具
│   │   ├── laoli-compress-image/
│   │   ├── laoli-fetch-url/
│   │   ├── laoli-md-to-pdf/
│   │   ├── laoli-pdf-merge/
│   │   └── laoli-qrcode/
│   └── media/                   # 媒体处理（CLI 包装）
│       ├── laoli-image/
│       ├── laoli-music/
│       ├── laoli-tts/
│       ├── laoli-video/
│       └── laoli-vision/
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

## 🛠 技术栈

- **TypeScript** 脚本使用 [Bun](https://bun.sh) 运行
- 依赖：`defuddle`、`jsdom`、`pdf-lib`、`sharp`

---
*代码是食材，逻辑是火候，这个食谱能帮你做出聪明的 Agent。*