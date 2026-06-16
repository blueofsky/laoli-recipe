# MiMo 音频分析技术

> 用 MiMo 的音频理解 API 分析 TTS 配音质量，替代人工听审。

## API 端点

```
POST https://token-plan-cn.xiaomimimo.com/v1/chat/completions
Model: mimo-v2.5
```

## 认证

API Key 从 `D:\Dev\hermes\profiles\creative\.env` 读取 `XIAOMI_API_KEY`。

## 调用方式

```python
from openai import OpenAI
import base64

# 读取API配置
with open(r'D:\Dev\hermes\profiles\creative\.env') as f:
    for line in f:
        line = line.strip()
        if line.startswith('XIAOMI_API_KEY='):
            api_key = line.split('=', 1)[1]
        if line.startswith('XIAOMI_BASE_URL='):
            base_url = line.split('=', 1)[1]

# 读取音频文件并编码为base64
with open(audio_path, 'rb') as f:
    audio_b64 = base64.b64encode(f.read()).decode()

# 调用API
client = OpenAI(api_key=api_key, base_url=base_url)
resp = client.chat.completions.create(
    model='mimo-v2.5',
    messages=[{
        'role': 'user',
        'content': [
            {'type': 'input_audio', 'input_audio': {'data': f'data:audio/mpeg;base64,{audio_b64}'}},
            {'type': 'text', 'text': '分析提示词'}
        ]
    }],
    max_tokens=1024
)
print(resp.choices[0].message.content)
```

## 分析提示词模板

针对配音质量检查，使用以下提示词（根据场景调整）：

```
请分析这段中文配音台词是"[台词内容]"：
1)台词内容是否准确念出
2)语速是否[目标语速描述]
3)情绪是否[目标情绪描述]
4)停顿是否自然
5)有没有发音错误
6)整体感觉像不像[目标风格]吗
用中文回答。
```

## 分析维度

| 维度 | 检查内容 |
|------|---------|
| 内容准确性 | 台词是否完整念出，有无漏字错字 |
| 语速 | 是否匹配目标速度（偏慢/适中/偏快） |
| 情绪 | 是否匹配场景需求（平静/紧张/沉重） |
| 停顿 | 是否自然，有无过长或过短的停顿 |
| 发音 | 普通话是否标准，专有名词是否正确 |
| 风格适配 | 是否适合目标场景（纪录片旁白/新闻播报等） |

## 注意事项

- 音频文件需小于100MB（URL方式）或50MB（Base64方式）
- MP3格式兼容性最好
- 分析结果是AI判断，不能替代人耳听审，但可作为初筛
- .env文件中的NO_PROXY行可能导致bash source报错，用Python直接读取绕过
