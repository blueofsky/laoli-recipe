# 变更日志

## [1.0.0] - 2026-05-10

### 新增

- 首个版本发布，laoli-shorts 短视频创作管线专用评审子 skill
- SKILL.md：纯执行骨架（~100 行），遵循技能三级披露机制设计
  - 详情（输出模板、状态机、异常处理等）下沉到 references/ 按需加载
- references/review-protocol.md：评审协议（角色定义、分级映射、状态机、权限矩阵、需决策触发条件、评审记录模板、输出规范）
- references/checklists.md：按产出类型（文案/图片/视频/音频）和分级（L1/L2/L3）的检查项参考，含交叉验证矩阵和边界值参考表
- 源自 [laoli-lens/文档/评审](https://github.com/laoli/laoli-lens) 的设计提炼与适配
