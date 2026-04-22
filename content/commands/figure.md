---
description: 为文章配图：规划插图、生成封面、插入正文、审校重做。
argument-hint: "<article-file>"
allowed-tools: list_dir, read_file, replace_in_file, write_to_file, execute_command, use_skill
disable-model-invocation: true
---

# 文章配图

读取文章 `$1`，分析其结构并规划配图。

## 执行流程

1. **读取文章** → 分析标题、结构、论点分布
2. **规划配图** → 确定插图位置和类型（总览图/对比图/流程图/框架图）
3. **生成图片** → 调用技能：
   - 封面图 → `laoli-cover-image`
   - 正文插图 → `laoli-article-illustrator`
4. **审校回填** → 检查图片质量，插入正文

## 输出目录

```
$(dirname "$1")/
├── index.md                # 插入图片后的正文
└── assets/
    ├── illustration-plan.md    # 配图规划
    ├── prompts/                # 提示词
    └── *.png                   # 最终图片
```

## 汇报要点

- 保留/重做的图片列表
- 原因和建议
