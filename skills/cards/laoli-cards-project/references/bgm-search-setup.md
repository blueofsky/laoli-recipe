# BGM 搜索配置

## Cookie 文件位置

`laoli-music-search` 脚本需要微信 cookie 才能调用视频号 BGM API。

**默认 cookie 路径：**
```
D:\AI\AIGC\laoli-kitchen\laoli-lens\.output\bgm_cookie.txt
```

**使用方式：**
```bash
# 方式1：用 --cookie 参数直接传入（读取文件内容）
bun scripts/main.ts -q "悬疑" -i -c "$(cat D:/AI/AIGC/laoli-kitchen/laoli-lens/.output/bgm_cookie.txt)"

# 方式2：先 cd 到脚本目录，cookie 文件放在 .output/ 下
cd laoli-recipe/skills/media/laoli-music-search
bun scripts/main.ts -q "悬疑" -i
```

## Cookie 更新

cookie 有时效性，过期后需要重新获取：
1. 在浏览器登录 video.weixin.qq.com
2. 打开开发者工具 → Network → 找到任意请求的 Cookie
3. 复制完整 cookie 字符串，覆盖到 `bgm_cookie.txt`

## 搜索关键词建议

根据内容情绪选择关键词：

| 内容情绪 | 推荐关键词 | 说明 |
|----------|-----------|------|
| 紧张/悬疑 | `悬疑`、`紧张`、`惊悚` | 适合危机/决策类故事 |
| 深沉/反思 | `深沉`、`纪录片`、`历史` | 适合人物/结局类故事 |
| 温暖/感动 | `温馨`、`感动`、`治愈` | 适合正面/团圆类故事 |
| 荒诞/离谱 | `悬疑`、`黑色幽默` | 适合反差/讽刺类故事 |

**搜索参数：** 用 `-i` 过滤纯音乐（无人声），图文帖子不要人声 BGM。
