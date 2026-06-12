---
name: laoli-agent-memory
description: 'AgentMemory 知识共享管理：Hermes 和 WorkBuddy 通过共享 AgentMemory 实例存储和检索知识。写入时必须打来源标签，搜索时不限来源。'
version: 1.0.0
license: MIT
allowed-tools: MCP AgentMemory
triggers:
  - 写入知识库
  - 搜索记忆
  - AgentMemory
  - 共享知识
---

# AgentMemory 知识共享管理

## Overview

Hermes 和 WorkBuddy 共享同一个 AgentMemory 实例（localhost:3111），用于存储和检索可复用的知识。

**核心价值**：
- 知识持久化：重要经验不会随会话结束丢失
- 跨 Agent 共享：Hermes 写入的知识，WorkBuddy 可以搜索到
- 语义搜索：基于向量嵌入的智能检索

## 快速使用

### 写入共享知识

```
memory_save(
  content="知识内容",
  type="workflow|fact|decision|bug|pattern",
  concepts="hermes,标签1,标签2"  # 必须包含来源标签
)
```

### 搜索知识

```
memory_search(query="搜索关键词", limit=5)
```

### 精确搜索

```
memory_recall(query="搜索关键词", limit=10)
```

## 标签规范（必须遵守）

### 来源标签规则

| 写入方 | concepts 必含 | 示例 |
|--------|--------------|------|
| Hermes | `hermes` | `"hermes,运维,Docker"` |
| WorkBuddy | `workbuddy` | `"workbuddy,配置,MCP"` |
| 共享知识 | `shared` | `"shared,项目约定,命名规范"` |

### 标签格式

```
concepts: "来源,类别1,类别2"
```

- 第一个标签必须是来源（hermes/workbuddy/shared）
- 后续标签按需添加
- 用英文逗号分隔
- 标签名用英文小写

## 记忆类型

| type | 含义 | 使用场景 |
|------|------|---------|
| `workflow` | 工作流程 | 操作步骤、最佳实践 |
| `fact` | 事实信息 | 环境配置、工具版本 |
| `decision` | 决策记录 | 架构选择、技术方案 |
| `bug` | 问题记录 | bug 现象、解决方案 |
| `pattern` | 设计模式 | 代码模式、架构模式 |

## 写入时机

### 应该写入

- ✅ 解决了一个复杂问题
- ✅ 发现了重要配置或技巧
- ✅ 做了技术决策
- ✅ 踩了坑并找到解决方案
- ✅ 用户明确说"记住这个"

### 不应该写入

- ❌ 临时调试信息
- ❌ 可以 web 搜索到的信息
- ❌ 敏感信息（密码、密钥）
- ❌ 过于简单的内容

## 搜索技巧

### 关键词搜索

```
memory_search(query="Docker 部署")
```

### 按类型搜索

```
memory_recall(query="bug Desktop", limit=5)
```

### 按来源搜索

```
memory_search(query="workbuddy 配置")
```

## 知识整理

### 定期整理

建议每周整理一次 AgentMemory：
1. 搜索所有记忆
2. 合并重复内容
3. 删除过时信息
4. 更新标签

### 整理命令

```
# 查看所有记忆
memory_search(query="", limit=50)

# 删除过时记忆
memory_governance_delete(memoryIds="mem_xxx")

# 更新记忆
memory_save(content="新内容", type="fact", concepts="hermes,更新")
```

## 与其他 Skill 的关系

| Skill | 职责 | 与本 skill 的关系 |
|-------|------|------------------|
| `laoli-agent-comms` | 实时通信（Signal API） | 互补：comms 管消息，memory 管知识 |
| `hermes-maintenance` | 系统维护 | memory 可存储维护经验 |

## 参考文档

- [标签规范详解](references/tagging-guide.md) - 完整的标签使用指南
- [知识分类标准](references/knowledge-types.md) - 什么内容用什么类型
