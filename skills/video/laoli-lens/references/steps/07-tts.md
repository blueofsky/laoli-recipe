# 第7步：生成配音

对每个分镜，根据其「配音模式」决定是否调用 TTS。

---

### 7a. 遍历分镜

读取上一轮产出的分镜脚本，对每个分镜：

**情况一：配音模式 = 无配音**
- 跳过，不调用 laoli-tts
- 在视频剪辑时（第8步）按「目标时长」处理
- 输出占位记录：`scene0x_描述.mp3 → 无配音（目标时长: N秒）`

**情况二：配音模式 = 有配音**
- 读取该分镜的「配音指令」块（speed, emotion, intensity）
- 读取该分镜的「台词」纯文本
- 去除 `★` 符号本身，但保留其后的金句文本
- 台词中的 `(breath)` `(sighs)` `(inhale)` `(exhale)` 等 MiniMax 行内标签**原样保留**传给 `--text`

### 7b. 调用 laoli-tts

**调用**：`laoli-tts` skill

**参数映射**：

| 分镜脚本字段 | laoli-tts 参数 | 说明 |
|-------------|----------------|------|
| 台词文本 | `--text` | 保留 (breath)(sighs)(inhale)(exhale) 等行内标签 |
| speed | `--speed` | 从配音指令读取 |
| emotion | `--emotion` | 从配音指令读取 |
| intensity | `--intensity` | 从配音指令读取，为 0 时可省略 |
| — | `--output` | `素材/配音/` 的绝对路径 |
| — | `--voice` | （可选）沿用方案默认音色 |

**调用示例**：
```bash
npx -y bun scripts/main.ts \
  --text "他回到柏林(breath)。继续在外交部上班。表面上一(zhe)切(qie)如常——但他在等一个机会。" \
  --speed 0.9 \
  --emotion calm \
  --intensity -10 \
  --output "d:/项目/叛徒执笔/素材/配音"
```

**输出**：`素材/配音/scene0x_描述.mp3`

---

## ✅ 本步完成条件

配音文件生成完毕后（无配音分镜也需有记录），必须通过 Task tool 调用 `laoli-lens-reviewer` 进行评审（将触发 L3 深度验证：配音参数合规、时长匹配）。仅当评审返回 **✅ 通过** 后，方可告知 Owner 本步完成、进入下一步。**未完成评审 = 本步未完成。**
