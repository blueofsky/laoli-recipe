---
description: "从网页提取 prompt 列表，保存为多个md文件"
argument-hint: "[url] [output-dir]"
allowed-tools: WebFetch,Read,Write,execute_command
---

使用 `$1` 作为网页 URL，`$2` 作为输出目录。

用法示例：
- `/wpr https://example.com/prompts ./prompts`
- `/wpr https://example.com/prompts /absolute/path/to/output`

执行规则：
1. 先检查 `$1` 和 `$2` 是否都提供。如果没有，提示正确用法。
2. 使用 web_fetch 工具获取 `$1` 的完整内容。
3. 解析页面中的 prompt 内容，支持：Markdown 列表、代码块、HTML 结构、JSON 数组等格式。
4. 如果 `$2` 目录不存在，先创建。
5. 每个 prompt 保存为独立文件：
   - 文件名格式：`序号-关键词.md`（如 `01-cherry-blossom.md`）
   - 关键词由 AI 根据 prompt 内容提取，优先使用英文，3-5 个单词，用连字符分隔
   - 内容格式：
     ```markdown
     ---
     title: 关键词
     source: $1
     extracted_at: [当前时间,精确到秒]
     ---

     [prompt 内容]
     ```
6. 提取完成后输出汇总：成功数量、文件列表、失败情况（如有）。
