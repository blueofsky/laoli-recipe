---
description: "同步文章到多个平台：读取 md 文件并发布到指定平台"
argument-hint: "<article-file> [platforms...]"
allowed-tools: Read, execute_command, use_skill
disable-model-invocation: true
---

# 同步文章到多平台

读取文章 `$1`，同步到指定平台 `$ARGUMENTS`（除第一个参数外的所有参数）。

## 执行步骤

1. **读取文章** → 确认文件存在并读取内容
2. **调用 laoli-sync 技能** → 执行同步任务
3. **返回结果** → 显示每个平台的发布状态

## 平台列表

可用平台：
- `juejin` - 掘金
- `zhihu` - 知乎
- `csdn` - CSDN
- `weixin` - 微信公众号
- `xiaohongshu` - 小红书
- `bilibili` - B站
- `jianshu` - 简书
- `toutiao` - 头条
- `oschina` - 开源中国

## 示例

```
/sync article.md juejin,zhihu
/sync content/07_微服务深入理解.md juejin
```

## 输出格式

```
## 同步结果

| 平台 | 状态 | 草稿链接 |
|------|------|----------|
| juejin | ✅ | https://juejin.cn/... |
| zhihu | ✅ | https://zhuanlan.zhihu.com/... |

> 文章以草稿形式发布，请登录平台审核后发布。
```
