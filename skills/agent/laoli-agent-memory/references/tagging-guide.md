# AgentMemory 标签规范详解

## 标签体系

AgentMemory 使用 `concepts` 字段进行标签化分类。标签是逗号分隔的字符串。

## 来源标签（必须）

每个记忆条目必须包含来源标签，用于区分是哪个 Agent 写入的。

### hermes

**用途**：Hermes 写入的记忆

**示例**：
```
concepts: "hermes,运维,Docker部署"
concepts: "hermes,配置,环境变量"
concepts: "hermes,bug,Desktop崩溃"
```

### workbuddy

**用途**：WorkBuddy 写入的记忆

**示例**：
```
concepts: "workbuddy,配置,MCP服务器"
concepts: "workbuddy,工作流,代码审查"
concepts: "workbuddy,决策,技术选型"
```

### shared

**用途**：双方共享的知识，或需要双方都知道的信息

**示例**：
```
concepts: "shared,项目约定,命名规范"
concepts: "shared,架构,系统设计"
concepts: "shared,流程,部署流程"
```

## 类别标签（可选）

在来源标签之后，可以添加类别标签用于更细粒度的分类。

### 常用类别标签

| 标签 | 含义 | 使用场景 |
|------|------|---------|
| `运维` | 运维相关 | 部署、监控、日志 |
| `配置` | 配置管理 | 环境变量、配置文件 |
| `工作流` | 工作流程 | 操作步骤、最佳实践 |
| `决策` | 决策记录 | 架构选择、技术方案 |
| `bug` | 问题记录 | bug 现象、解决方案 |
| `模式` | 设计模式 | 代码模式、架构模式 |
| `工具` | 工具使用 | 工具配置、使用技巧 |
| `项目` | 项目相关 | 项目结构、项目约定 |

### 标签组合示例

```
# 运维经验
concepts: "hermes,运维,Docker部署"

# 配置决策
concepts: "shared,配置,数据库选型"

# bug 解决方案
concepts: "workbuddy,bug,连接超时"

# 工作流程
concepts: "hermes,工作流,代码审查"
```

## 标签命名规范

### 命名规则

1. **全小写**：`docker` 而不是 `Docker`
2. **英文**：用英文命名，便于搜索
3. **简洁**：2-4 个单词
4. **一致**：同一概念用同一个标签

### 标签映射表

| 中文 | 英文标签 |
|------|---------|
| 运维 | ops |
| 配置 | config |
| 工作流 | workflow |
| 决策 | decision |
| 问题 | bug |
| 模式 | pattern |
| 工具 | tool |
| 项目 | project |
| 架构 | architecture |
| 部署 | deploy |
| 监控 | monitor |
| 日志 | log |

## 标签搜索

### 按来源搜索

```
# 搜索 Hermes 写入的所有记忆
memory_search(query="hermes")

# 搜索 WorkBuddy 写入的所有记忆
memory_search(query="workbuddy")

# 搜索共享记忆
memory_search(query="shared")
```

### 按类别搜索

```
# 搜索所有运维相关
memory_search(query="ops")

# 搜索所有 bug 记录
memory_search(query="bug")
```

### 组合搜索

```
# 搜索 Hermes 的运维经验
memory_search(query="hermes ops")

# 搜索共享的配置信息
memory_search(query="shared config")
```

## 标签维护

### 添加新标签

1. 检查是否已有类似标签
2. 如果有，复用现有标签
3. 如果没有，添加新标签并记录

### 合并标签

如果发现多个标签表示同一概念：
1. 选择最常用的标签
2. 更新所有使用旧标签的记忆
3. 在文档中记录标签变更

### 清理标签

定期检查：
1. 是否有未使用的标签
2. 是否有重复标签
3. 是否有命名不一致的标签
