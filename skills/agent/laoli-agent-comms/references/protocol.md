# Agent 间通信协议 v1.1

## 基本规则

| 项目 | 规则 |
|------|------|
| **发送** | `memory_signal_send(from="<自己的agentId>", to="<对方agentId>", content="...")` |
| **接收** | `memory_signal_read(agentId="<自己的agentId>")` |
| **显示时间** | UTC 存储，显示时 +8 转北京时间 |
| **清理策略** | 读完即删，信箱只保留未读消息 |
| **轮询频率** | cron job 每 5 分钟检查一次（可配置） |

## 示例：Hermes ↔ WorkBuddy

```
# Hermes 发送
memory_signal_send(from="hermes", to="workbuddy", content="...")

# WorkBuddy 接收
memory_signal_read(agentId="workbuddy")

# WorkBuddy 回复
memory_signal_send(from="workbuddy", to="hermes", content="...")

# Hermes 接收
memory_signal_read(agentId="hermes")
```

## 消息类型

| type | 含义 | 优先级 | 举例 |
|------|------|--------|------|
| `info` | 一般通知 | 低 | "知识库已更新" |
| `request` | 请求对方协助 | 中 | "Desktop 挂了，帮我查回滚步骤" |
| `response` | 回复对方的请求 | 中 | "回滚步骤：git reset --hard ..." |
| `alert` | 紧急通知 | 高 | "Hermes 刚更新后挂了" |

## 触发场景

### 知识库更新

**触发条件**：Obsidian 知识库有新增或修改

**发送方**：更新方

**消息格式**：
```
type: info
content: "Obsidian 知识库已更新：[文档名称]，摘要：[简要说明]"
```

### 发现 Bug

**触发条件**：发现系统异常或功能故障

**发送方**：发现方

**消息格式**：
```
type: alert
content: "Bug 报告：[功能名称] 出问题，现象：[具体表现]，影响：[影响范围]"
```

### 需要协助

**触发条件**：需要对方帮忙查资料或执行操作

**发送方**：请求方

**消息格式**：
```
type: request
content: "请求协助：[具体需求]，背景：[相关上下文]"
```

### 回复协助

**触发条件**：收到对方的 request 消息

**发送方**：响应方

**消息格式**：
```
type: response
content: "回复：[结果或答案]，来源：[信息出处]"
```

### 配置变更

**触发条件**：修改了系统配置

**发送方**：变更方

**消息格式**：
```
type: info
content: "配置变更：[配置项] 从 [旧值] 改为 [新值]，原因：[变更原因]"
```

### 定时状态报告

**触发条件**：每天固定时间（如早上 9 点）

**发送方**：各自

**消息格式**：
```
type: info
content: "每日状态：[系统名称] 正常/异常，[关键指标]"
```

## Cron Job 配置示例

### 轮询 Job（通用模板）

```yaml
schedule: "*/5 * * * *"  # 每 5 分钟
prompt: |
  检查 AgentMemory 信箱是否有其他 Agent 发来的消息：
  1. 调用 memory_signal_read(agentId="<自己的agentId>", unreadOnly=true)
  2. 如果有消息，逐条处理：
     - type=info: 记录到知识库或通知用户
     - type=request: 执行请求并回复
     - type=alert: 立即通知用户
  3. 处理完后删除已读消息：memory_governance_delete(memoryIds="...")
  4. 如果没有消息，静默结束（不输出任何内容）
deliver: local
enabled_toolsets: ["mcp"]
```

### 使用示例

**Hermes 的轮询 Job**：
```yaml
prompt: |
  检查 AgentMemory 信箱是否有 WorkBuddy 发来的消息：
  1. 调用 memory_signal_read(agentId="hermes", unreadOnly=true)
  ...
```

**WorkBuddy 的轮询 Job**：
```yaml
prompt: |
  检查 AgentMemory 信箱是否有 Hermes 发来的消息：
  1. 调用 memory_signal_read(agentId="workbuddy", unreadOnly=true)
  ...
```

## 消息生命周期

```
发送 → 存储(UTC) → 读取(+8显示) → 处理 → 删除
  │                                    │
  │                                    └→ 已读消息立即清理
  │
  └→ 未读消息保留在信箱
```

## 安全边界

### 可以做的

- ✅ 传递简短文本消息
- ✅ 通知知识库更新
- ✅ 请求和回复信息
- ✅ 报告 bug 和状态

### 不可以做的

- ❌ 传递大文件（用 Obsidian 知识库）
- ❌ 执行复杂操作（直接说需求，让对方执行）
- ❌ 自动执行危险命令（需人工确认）
- ❌ 传递敏感信息（密码、密钥等）

## 时区处理

AgentMemory 存储用 UTC，显示时 +8 转北京时间：

```
存储时间：2026-06-12T04:04:50.089Z (UTC)
显示时间：2026-06-12 12:04:50 (北京时间)
```

## 故障排查

### 收不到消息

1. 检查 AgentMemory 服务是否运行：`curl http://localhost:3111/health`
2. 检查 agentId 是否正确：`memory_signal_read(agentId="hermes")`
3. 检查网络连接

### 消息堆积

1. 检查 cron job 是否正常运行
2. 手动清理：`memory_governance_delete(memoryIds="所有旧消息ID")`
3. 重建索引：重启 AgentMemory 服务

### 时区显示错误

1. 确认 UTC 时间正确
2. 手动 +8 转换
3. 检查系统时区设置

## 版本历史

| 版本 | 日期 | 变更 |
|------|------|------|
| v1.0 | 2026-06-12 | 初始版本，支持基本消息收发 |
