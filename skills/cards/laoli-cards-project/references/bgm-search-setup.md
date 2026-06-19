# BGM 搜索配置

## Cookie 来源

`laoli-music-search` 脚本需要微信 cookie 才能调用视频号 BGM API。

**现在 cookie 自动从 `.rest` 文件读取：**
- 微信视频号：`.output/weixin.rest` 中的 `@cookie` 变量
- 剪映：`.output/jianying.rest` 中的 `@cookie` 变量

**使用方式：**
```bash
# 直接使用，cookie 自动从 weixin.rest 读取
bun scripts/main.ts --provider weixin -q "悬疑" -i

# 也可以通过 --cookie 参数直接传入
bun scripts/main.ts --provider weixin -q "悬疑" -i -c "cookie字符串"
```

## Cookie 更新

cookie 有时效性，过期后需要重新获取：
1. 在浏览器登录 video.weixin.qq.com
2. 打开开发者工具 → Network → 找到任意请求的 Cookie
3. 复制完整 cookie 字符串，更新到 `.output/weixin.rest` 文件中的 `@cookie` 变量

**更新方法：**
```bash
# 编辑 weixin.rest 文件，替换 @cookie 变量的值
@cookie = 新的cookie字符串
```

## 搜索关键词建议

根据内容情绪选择关键词：

| 内容情绪 | 推荐关键词 | 说明 |
|----------|-----------|------|
| 紧张/悬疑 | `悬疑`、`紧张`、`惊悚` | 适合危机/决策类故事 |
| 深沉/反思 | `深沉`、`纪录片`、`历史` | 适合人物/结局类故事 |
| 温暖/感动 | `温馨`、`感动`、`治愈` | 适合正面/团圆类故事 |
| 荒诞/离谱 | `悬疑`、`黑色幽默` | 适合反差/讽刺类故事 |

**搜索参数：** 用 `-i` 过滤纯音乐（无人声），图文帖子不要人声 BGM。
