# 生产工具参考

> 实际项目中使用的工具链，替代默认的agnes API方案。

## Google Flow（图片+视频生成）

**入口**：https://labs.google/fx/tools/flow

**模型**：
- 图片：Nano Banana 2 Pro（免费，Pro会员）
- 视频：Gemini Omni Flash（消耗credits，支持4s/6s/8s/10s）

**工作流**：
1. 用Nano Banana生成图片 → 确认构图/色调
2. 用确认的图片作为reference生成视频（Veo 3.1或Omni Flash）
3. 在线剪辑（裁掉不需要的片段、调整时长）
4. 共享链接 → 用浏览器JS提取CDN URL → video_analyze分析

**从Flow共享链接提取视频URL**：
```javascript
// 浏览器console中执行
document.querySelector('video')?.src || document.querySelector('video')?.currentSrc
```

**视频时长选择**（按戏剧功能）：
| 时长 | 功能 | 场景 |
|------|------|------|
| 4s | 冲击瞬间 | 轮胎碾过碎片、爆炸 |
| 6s | 句号感 | 博物馆、最后一眼 |
| 8s | 标准叙事 | 滑行、飞行 |
| 10s | 沉浸感 | 机舱内景、大场景 |

## MiniMax在线TTS（配音生成）

**入口**：MiniMax开放平台在线版

**配置**：
- 模型：speech-2.8-hd
- 音色：沉稳高管（低沉厚实，磁性中年男声）
- 语速：1（默认，全片不变）
- 声调：0（全片不变）
- 音量：2-3（微调）

**关键规则**：
- 声调/语速全片一致——情绪变化靠文本和停顿标签，不靠参数
- 停顿标签`<#N#>`少用——只在关键转折点，其余让TTS自然处理
- 配音文本量：8秒视频约20-30字，留空白给画面

**配音文件保存**：`项目目录/素材/配音/场景XX.mp3`

**MiMo音频分析**（检查配音质量）：
```python
from openai import OpenAI
client = OpenAI(api_key=API_KEY, base_url='https://token-plan-cn.xiaomimimo.com/v1')
resp = client.chat.completions.create(
    model='mimo-v2.5',
    messages=[{
        'role': 'user',
        'content': [
            {'type': 'input_audio', 'input_audio': {'data': f'data:audio/mpeg;base64,{audio_b64}'}},
            {'type': 'text', 'text': '分析这段配音：清晰度、语速、情绪、发音准确性'}
        ]
    }]
)
```

## 剪映剪辑

**字幕文稿格式**：纯文本（.txt），每段空行分隔，无配音场景跳过
**保存位置**：`项目目录/文案/字幕文稿.txt`

**封面设计**：3:4竖版，三层文字结构（主标题+副标题+底部标语），文字不压主体

**BGM建议**：视频自带环境音+配音，不需要传统BGM。如片段间有断裂感，用交叉淡化转场+低音量环境音铺底。
