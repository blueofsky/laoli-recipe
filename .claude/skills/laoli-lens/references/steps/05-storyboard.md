# 第5步：生成分镜图

使用分镜脚本中的 IMAGE PROMPT 生成每段分镜图。

**调用**：`laoli-image` skill

- **输入**：分镜脚本中的 IMAGE PROMPT
- **角色参考图**：按每个分镜的「角色参考图」字段列表，传入对应的 `素材/定妆/ref_角色ID.jpg`（定妆照步骤生成），提升角色一致性
- **输出**：`素材/图片/scene0x_描述.jpg`，按命名规范生成

**批量生成**：
- 优先使用逐个生成模式（`laoli image generate`）
- 若使用batch模式，详见 `laoli-image` skill 的 batch.json 格式说明
- batch.json中的路径是相对于batch.json所在目录的

**图片分析**（生成完成后）：
- 使用 `laoli vision --input <图片路径> --prompt "描述图片内容，检查是否与分镜Prompt匹配"` 分析关键分镜图
- 检查项：内容与Prompt匹配、角色外貌与定妆照一致、构图合理、无明显瑕疵

---
## ✅ 本步完成条件

所有分镜图生成完毕后，必须通过 Task tool 调用 `laoli-lens-reviewer` 进行评审（默认 L2：视觉产出抽样+全量统计）。仅当评审返回 **✅ 通过** 后，方可告知 Owner 本步完成、进入下一步。**未完成评审 = 本步未完成。**