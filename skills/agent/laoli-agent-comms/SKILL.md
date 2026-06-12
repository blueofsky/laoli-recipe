---
name: laoli-agent-comms
description: 'Agent 间直接通信：通过 AgentMemory Signal API 实现任意两个 Agent 之间的消息收发。支持手动触发，解决多 Agent 协作的信息同步问题。消息通过 expiresInMs 自动过期，readAt 标记已读。'
version: 1.4.0
license: MIT
allowed-tools: MCP AgentMemory
triggers:
  - 收发消息
  - 检查信箱
  - agent通信
  - 直连通信
  - 信号通信
---

# Agent 间直接通信

## Overview

通过 AgentMemory 的 Signal API 实现任意两个 Agent 之间的直接通信，无需人工中转。

**核心价值**：
- 解决 cron task 不及时的问题（手动触发即时收发）
- 支持定时轮询（cron 自动检查信箱）
- 读完即删，无消息堆积
- 通用设计，任何 Agent 都能接入

## 快速使用

### 自然语言触发（推荐）

对 Agent 说自然语言即可，无需记命令：

**发送消息**：
```
参考 laoli-agent-comms skill，给workbuddy发消息：内容是"你的消息"
```

**检查信箱**：
```
参考 laoli-agent-comms skill，检查一下有没有其他agent发来的消息
```

**检查特定 Agent 的消息**：
```
参考 laoli-agent-comms skill，检查有没有hermes发来的消息
```

### API 调用（Agent 内部使用）

**发送消息**（必须设置过期时间）：
```
memory_signal_send(
  from="<自己的agentId>",
  to="<对方agentId>",
  content="你的消息",
  expiresInMs=86400000  # 默认24小时，见下方建议
)
```

**过期时间建议**（最长 1 小时）：
| 消息类型 | expiresInMs | 说明 |
|---------|-------------|------|
| `info` | 3600000（1小时） | 一般通知 |
| `request` | 3600000（1小时） | 等待响应 |
| `response` | 3600000（1小时） | 终结消息 |
| `alert` | 3600000（1小时） | 紧急通知 |
**检查信箱**：
```
memory_signal_read(agentId="<自己的agentId>", unreadOnly=true)
```

**删除已读消息**：
```
memory_governance_delete(memoryIds="信号ID")
```

## 消息类型

| type | 含义 | 是否需要回复 | 使用场景 |
|------|------|-------------|---------|
| `info` | 一般通知 | ❌ 不需要 | 知识库更新、配置变更、状态报告 |
| `request` | 请求协助 | ✅ 需要 response | 需要对方帮忙查资料、执行操作 |
| `response` | 回复请求 | ❌ 不需要 | 响应对方的 request |
| `alert` | 紧急通知 | ❌ 不需要 | 发现 bug、服务异常 |

**消息识别机制**：
- 消息读取时自动标记 `readAt` 时间戳
- `unreadOnly=true` 只返回未读消息（没有 `readAt` 的）
- 已读消息不会重复出现，无需手动删除
- 消息通过 `expiresInMs` 自动过期清理

**防止死循环规则**：
- `info` 和 `alert` 是单向通知，**不回复**
- `response` 是对 request 的回复，**不需要再确认**
- 只有 `request` 需要回复 `response`

## 触发场景

| 场景 | 发送方 | 消息内容示例 |
|------|--------|-------------|
| 知识库更新 | 更新方 | `info`: "Obsidian 知识库新增了 XXX 文档" |
| 发现 bug | 发现方 | `alert`: "XXX 功能出问题，现象是..." |
| 需要协助 | 请求方 | `request`: "帮我查一下 YYY" |
| 回复协助 | 响应方 | `response`: "查到了：结果是..." |
| 配置变更 | 变更方 | `info`: "XXX 配置已修改为 YYY" |
| 定时状态 | 各自 | 每天一次 `info`: "当前状态正常/异常" |

## 工作流

### 手动触发（即时收发）

```
1. 检查信箱：memory_signal_read(agentId="<自己的agentId>", unreadOnly=true)
2. 处理消息
3. 回复（如需要）：memory_signal_send(from="<自己>", to="<对方>", content="...", expiresInMs=3600000)
4. 等待消息自动过期（最长1小时）
```
### 请求-响应流程

```
Agent A                          Agent B
   │                                │
   │── request ────────────────────→│
   │                                │ 处理中...
   │←── response ──────────────────│
   │                                │
   │   双方消息已标记 readAt          │
   │   等待 expiresInMs 自动过期     │
```

### 错误处理

| 场景 | 策略 |
|------|------|
| AgentMemory 不可达 | 静默失败，下次轮询重试 |
| 处理消息时异常 | 不删除消息，保留重试 |
| signal_send 失败 | 重试 1 次，失败则通知用户 |

### Cron 定时轮询

建议 cron job 配置：
- 频率：每 5 分钟
- 动作：检查信箱 → 处理消息 → 回复 → 清理
- 提示词：见 references/protocol.md

## 消息格式

```json
{
  "from": "hermes",
  "to": "workbuddy",
  "type": "info",
  "content": "消息内容",
  "expiresInMs": 3600000,
  "threadId": "thr_xxx（可选，用于关联对话）"
}
```

## 清理规则

**自动过期**：消息设置 `expiresInMs`，到期自动清理。

```
1. memory_signal_read(agentId="hermes") → 获取消息列表
2. 处理每条消息
3. 回复（如需要）：memory_signal_send(expiresInMs=3600000)
4. 等待 expiresInMs 过期，系统自动清理
```

**安全原则**：
- 每条消息必须设置 `expiresInMs`（最长1小时）
- 不设置会导致消息永不过期，信箱无限增长
- `readAt` 标记已读，`expiresInMs` 负责清理

## 安全边界

- ❌ 不通过信号传大文件（用 Obsidian 知识库）
- ❌ 不通过信号做复杂操作（直接说需求，让对方执行）
- ❌ 不自动执行对方发来的危险命令（需人工确认）

## 时区处理

AgentMemory 存储用 UTC，显示时 +8 转北京时间：
- 存储：`2026-06-12T04:04:50.089Z`
- 显示：`2026-06-12 12:04:50`

## 设计说明

### 为什么用 AgentMemory Signal？

AgentMemory Signal API 是一个**轻量级 workaround**，不是正式的消息队列。它适合：
- 低频通信（每分钟几条消息）
- 本地 Agent 间协作
- 不想引入额外基础设施

### AgentMemory 的局限性

AgentMemory 是为**持久化知识存储**设计的，不是为**实时通信**设计的：

| 问题 | 原因 |
|------|------|
| 需要轮询 | 没有推送机制 |
| 非实时 | 延迟取决于轮询频率 |
| 有限持久 | 消息通过 expiresInMs 自动过期 |

### 更好的替代方案

如果需要更正式的 Agent 间通信：

| 方案 | 适用场景 | 复杂度 |
|------|---------|--------|
| **HTTP localhost** | 本地两个 Agent，零依赖 | 低 |
| **Redis Pub/Sub** | 本地实时通信，需要发布/订阅 | 中 |
| **A2A 协议** | 跨平台、跨组织的 Agent 协作 | 高 |

**HTTP localhost 方案**（最简单的正式方案）：
```python
# Agent A 跑在 localhost:8001，Agent B 跑在 localhost:8002
# 发送：requests.post("http://localhost:8002/message", json={...})
# 接收：Flask/FastAPI 路由处理 /message 端点
```

## 参考文档

- [通信协议完整版](references/protocol.md) - 包含详细的消息类型、触发场景、cron 配置示例
- [Agent 通信方案对比](references/communication-alternatives.md) - A2A、Redis、ZeroMQ、HTTP 等方案对比
