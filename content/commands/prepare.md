---
description: "准备文章发布文件：从 draft 生成 content 发布稿，上传图片到 CDN 并回填地址"
argument-hint: "[draft-dir]"
allowed-tools: Read,Edit,Write,Bash(picgo:*)
disable-model-invocation: true
---

使用 `$1` 作为 draft 文章目录参数。

用法示例：
- `/prepare draft/07_2026多Agent已经分叉`
- `/prepare @draft/07_2026多Agent已经分叉`

执行规则：
1. 先读取 `$1`。如果没有提供参数，先提示正确用法，不要自行猜测目录。
2. 如果 `$1` 以 `@` 开头，先去掉 `@`，再按目录路径处理。
3. 识别 draft 目录名，例如 `draft/07_2026多Agent已经分叉` 的目录名是 `07_2026多Agent已经分叉`，发布文件名固定为 `content/<目录名>.md`。
4. 优先读取 `<draft-dir>/index.md` 作为正文来源；如果不存在，立即停止并说明缺少正文文件。
5. 如果 `content/<目录名>.md` 不存在，就用 draft 正文创建它；如果已存在，就在该文件基础上继续更新图片链接，不重复生成多个同名文件。
6. 读取 `content/<目录名>.md`，找出正文里实际引用的本地图片路径。只处理正文真正使用、且位于 `<draft-dir>/assets/` 下的图片；未被正文引用的图片不要上传。
7. 优先使用 `laoli-picgo` skill 处理上传；上传时必须逐张串行执行，一张完成后再上传下一张，不要并行。
8. 如果需要执行命令，使用 `picgo upload` 逐张上传，并记录每张图片返回的最终 CDN URL。
9. 每上传完一张图，就把 `content/<目录名>.md` 中对应的本地图片地址替换为该图片的 CDN URL。
10. 如果正文引用的某张图片在 `<draft-dir>/assets/` 中不存在，立即停止，并明确指出缺失文件。
11. 全部完成后做最终检查：
    - `content` 中的文件名是否与 draft 目录名一致
    - Markdown 中是否还残留 `./assets/`、`../assets/` 或其他本地图片路径
    - 图片链接数量是否与正文实际引用数量一致
12. 最后输出简洁摘要：
    - 发布文件路径
    - 上传了哪些图片
    - 每张图片对应的 CDN 地址
    - 是否还有未替换的本地图片引用

边界要求：
- 不要改动 draft 正文内容本身，除非用户明确要求
- 整个流程只做发布准备，不额外改写文章
- 目标是得到一个可直接发布的 `content/<目录名>.md`
