# Agent 间通信方案对比

## 方案概览

| 方案 | 推送支持 | 消息持久化 | 依赖 | 延迟 | 适用场景 |
|------|---------|-----------|------|------|---------|
| AgentMemory Signal | ❌ 轮询 | ✅ 持久 | AgentMemory | 秒级 | 低频协作 |
| HTTP localhost | ✅ 推送 | ❌ 无 | 无（Python 自带）| 毫秒级 | 本地实时 |
| Redis Pub/Sub | ✅ 推送 | ❌ 不持久 | Redis | 毫秒级 | 本地实时 |
| ZeroMQ | ✅ 推送 | ❌ 无 | pyzmq | 微秒级 | 高性能 IPC |
| A2A 协议 | ✅ 推送 | ✅ 可选 | HTTP + JSON-RPC | 毫秒级 | 跨平台协作 |

## 方案详解

### 1. AgentMemory Signal（当前方案）

**优点**：
- 已有基础设施（AgentMemory 已部署）
- 消息持久化
- 语义搜索能力

**缺点**：
- 需要轮询（无推送）
- 需要 ack 机制（补偿设计）
- 需要手动清理

**适用**：低频通信，不想引入额外服务

### 2. HTTP localhost（推荐的简单方案）

**原理**：每个 Agent 跑一个小型 HTTP 服务器，通过 REST API 通信。

**实现**：
```python
# Agent A (Hermes) - localhost:8001
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route("/message", methods=["POST"])
def receive():
    msg = request.json
    # 处理消息...
    return jsonify({"status": "received"})

# Agent B (WorkBuddy) - localhost:8002
import requests

requests.post("http://localhost:8001/message", json={
    "from": "workbuddy",
    "type": "request",
    "content": "帮我查一下..."
})
```

**优点**：
- 零依赖（Python 自带 HTTP 库）
- 真正的推送（无轮询）
- HTTP 状态码天然支持送达确认
- 没有死循环风险（请求-响应模型）

**缺点**：
- 消息不持久（需要自己实现）
- 需要两个 Agent 都在线

**适用**：本地两个 Agent 的实时通信

### 3. Redis Pub/Sub

**原理**：发布/订阅模式，消息实时推送到所有订阅者。

**实现**：
```python
import redis

r = redis.Redis()

# 订阅
pubsub = r.pubsub()
pubsub.subscribe("hermes")
for message in pubsub.listen():
    print(message["data"])

# 发布
r.publish("workbuddy", "Hello!")
```

**优点**：
- 真正的推送
- 简单易用
- 你熟悉 MQ 概念

**缺点**：
- 需要安装 Redis
- 消息不持久（订阅者离线会丢）
- 需要维护 Redis 服务

**适用**：本地实时通信，已有 Redis

### 4. ZeroMQ

**原理**：嵌入式消息库，无 broker，支持多种模式（PUB/SUB、PUSH/PULL、REQ/REP）。

**实现**：
```python
import zmq

# 服务端
context = zmq.Context()
socket = context.socket(zmq.REP)
socket.bind("tcp://*:5555")

# 客户端
context = zmq.Context()
socket = context.socket(zmq.REQ)
socket.connect("tcp://localhost:5555")
```

**优点**：
- 无需安装服务（pip install pyzmq）
- 微秒级延迟
- 多种通信模式

**缺点**：
- Windows 上 IPC 支持有限（用 TCP 代替）
- 需要自己管理连接

**适用**：高性能本地通信

### 5. A2A 协议（Google）

**原理**：Agent-to-Agent Protocol，行业标准，支持 Agent 发现、任务管理、认证。

**核心概念**：
- Agent Card：描述 Agent 能力，用于发现
- Task：结构化任务，有生命周期状态
- Message：消息传递，支持多种类型

**优点**：
- 行业标准，50+ 合作伙伴
- 企业级安全（OAuth 2.0、mTLS）
- 跨平台、跨组织

**缺点**：
- 实现复杂
- 对于本地两个 Agent 太重

**适用**：跨平台、跨组织的 Agent 协作

## 选择指南

```
需要 Agent 间通信
    │
    ├─→ 是本地通信吗？
    │       │
    │       ├─→ 是 → 需要实时吗？
    │       │       │
    │       │       ├─→ 是 → HTTP localhost（零依赖）
    │       │       │
    │       │       └─→ 否 → AgentMemory Signal（已有）
    │       │
    │       └─→ 否 → A2A 协议（跨平台）
    │
    └─→ 需要高吞吐量？
            │
            ├─→ 是 → Redis Pub/Sub 或 ZeroMQ
            │
            └─→ 否 → HTTP localhost
```

## 总结

对于 Hermes + WorkBuddy 这种本地两个 Agent 的场景：

| 阶段 | 推荐方案 |
|------|---------|
| **现阶段** | AgentMemory Signal（已有基础设施，够用） |
| **如果需要实时** | HTTP localhost（零依赖，最快实现） |
| **未来扩展** | 考虑 A2A 协议（如果需要跨平台） |
