// 心流花园 - DeepSeek AI 情绪分析引擎
// 用大语言模型替代简单关键词匹配，精准理解文字中的情感

const https = require('https');

const DEEPSEEK_CONFIG = {
  // 从环境变量读取 API Key，未设置时使用内置关键词分析
  apiKey: process.env.DEEPSEEK_API_KEY || '',
  model: 'deepseek-chat',   // DeepSeek V3 最新模型
  endpoint: 'api.deepseek.com',
  path: '/v1/chat/completions',
  maxTokens: 200,
  temperature: 0.6,
};

// 情绪色彩映射（AI可以返回这些情绪之外的更细腻标签）
const EMOTION_COLORS = {
  // 暖色系 — 积极、温暖、有力量
  '喜悦': '#f5c842',
  '感激': '#e8b87a',
  '希望': '#7ec8a0',
  '爱': '#e8917a',
  '温柔': '#f0b8a0',
  '感动': '#e8a868',
  '温暖': '#f4c090',
  '欣慰': '#d8c878',
  '满足': '#c8d898',
  '骄傲': '#e0c060',
  '勇气': '#90b898',
  '坚定': '#8bb8a0',
  '惊喜': '#f0d878',
  '灵感': '#f0d080',
  '创造': '#e8c870',
  '安宁': '#c0d8b8',

  // 冷色系 — 忧郁、内省、敏感
  '悲伤': '#7b9ec7',
  '忧郁': '#8899cc',
  '恐惧': '#b8a0d8',
  '焦虑': '#c0a0d0',
  '愤怒': '#d4786e',
  '沮丧': '#c08888',
  '失望': '#b0a0b8',
  '孤独': '#8899bb',
  '迷惘': '#b0b8c8',
  '困惑': '#c0c0d0',
  '怀念': '#a0b0c8',
  '怅惘': '#a8a8c0',
  '遗憾': '#a8a0b8',
  '愧疚': '#b898a8',
  '思念': '#b0a8c8',

  // 中性/过渡 — 沉思、释然、平静
  '思考': '#9bb0d0',
  '好奇': '#c8b080',
  '惊奇': '#d4a574',
  '释然': '#b8c8b8',
  '宁静': '#b0d0c8',
  '平和': '#a8c8c0',
  '平静': '#b0c8c0',
};

/**
 * 调用 DeepSeek API 分析文本情绪
 * @param {string} text - 用户输入的文字
 * @returns {Object} { emotion, color, tags, depth }
 */
async function analyzeEmotion(text) {
  // 如果没有配置 API Key，直接使用本地关键词分析
  if (!DEEPSEEK_CONFIG.apiKey) {
    console.log('  ℹ️  未配置 DEEPSEEK_API_KEY，使用本地关键词分析');
    return fallbackAnalyze(text);
  }

  const systemPrompt = `你是一位深谙人类情感的哲学家和心理学家。你的任务是用一个词捕捉文字的核心情感，并提供深度解读。

规则：
1. 情绪标签必须是一个中文词（如：喜悦、悲伤、迷惘、希望、孤独、温柔、释然、焦虑…）
2. 不要机械匹配关键词，而是理解文字背后的情感基调
3. 如果文字中有多层情绪，选择最核心的那一个
4. 同时提供1-3个副情绪标签（tags）
5. 用一句话（深度）解读这段文字的情感质地

请直接返回JSON格式：
{
  "emotion": "核心情绪（一个中文词）",
  "tags": ["副情绪1", "副情绪2"],
  "depth": "一句话深度解读（30字以内）",
  "reflection": "一个引导更深思考的问题"
}`;

  const userPrompt = `请分析以下文字的情感：\n\n"${text}"`;

  try {
    const response = await callDeepSeek(systemPrompt, userPrompt);
    const parsed = parseAIResponse(response, text);
    return parsed;
  } catch (err) {
    console.error('DeepSeek API 调用失败，回退到关键词分析:', err.message);
    return fallbackAnalyze(text);
  }
}

/**
 * 调用 DeepSeek API
 */
function callDeepSeek(systemPrompt, userPrompt) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: DEEPSEEK_CONFIG.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: DEEPSEEK_CONFIG.maxTokens,
      temperature: DEEPSEEK_CONFIG.temperature,
      response_format: { type: 'json_object' }
    });

    const options = {
      hostname: DEEPSEEK_CONFIG.endpoint,
      path: DEEPSEEK_CONFIG.path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_CONFIG.apiKey}`,
        'Content-Length': Buffer.byteLength(body),
      },
      timeout: 15000,
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.error) {
            reject(new Error(json.error.message || 'API Error'));
          } else if (json.choices && json.choices[0]) {
            resolve(json.choices[0].message.content);
          } else {
            reject(new Error('Unexpected API response structure'));
          }
        } catch (e) {
          reject(new Error(`Failed to parse API response: ${data.substring(0, 200)}`));
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });
    req.write(body);
    req.end();
  });
}

/**
 * 解析 AI 返回的 JSON
 */
function parseAIResponse(response, originalText) {
  try {
    // 尝试直接解析
    let parsed = JSON.parse(response);

    // 清理可能的 markdown 包裹
    if (!parsed.emotion && typeof response === 'string') {
      const cleaned = response.replace(/```json\n?/g, '').replace(/```/g, '').trim();
      parsed = JSON.parse(cleaned);
    }

    const emotion = parsed.emotion || '思考';
    const color = EMOTION_COLORS[emotion] || generateColorFromEmotion(emotion);

    return {
      emotion,
      color,
      tags: parsed.tags || [],
      depth: parsed.depth || '',
      reflection: parsed.reflection || getDefaultReflection(emotion),
      source: 'deepseek-ai',
    };
  } catch (e) {
    console.error('AI 返回解析失败，尝试从文本中提取:', e.message);
    return fallbackAnalyze(originalText);
  }
}

/**
 * 为自定义情绪生成颜色
 */
function generateColorFromEmotion(emotion) {
  // 使用简单的哈希算法为任何情绪词生成一致的颜色
  let hash = 0;
  for (let i = 0; i < emotion.length; i++) {
    hash = emotion.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash) % 360;
  const s = 40 + (Math.abs(hash) % 30);
  const l = 55 + (Math.abs(hash >> 8) % 20);
  return `hsl(${h}, ${s}%, ${l}%)`;
}

/**
 * AI 不可用时的备用方案（改进后的关键词分析）
 */
function fallbackAnalyze(text) {
  const patterns = [
    { keys: ['快乐','开心','高兴','喜悦','幸福','美好','棒','太棒了','欢笑','喜'], emotion: '喜悦', color: '#f4c542' },
    { keys: ['感谢','感恩','谢谢','感激','庆幸','幸亏','珍贵'], emotion: '感激', color: '#e8b87a' },
    { keys: ['希望','期待','未来','梦想','相信','会好的','向前','光明'], emotion: '希望', color: '#7ec8a0' },
    { keys: ['爱','喜欢','温暖','心动','深爱','热爱','温情'], emotion: '爱', color: '#e8917a' },
    { keys: ['温柔','柔软','细腻','柔软','轻声'], emotion: '温柔', color: '#f0b8a0' },
    { keys: ['悲伤','难过','伤心','哭','痛苦','失去','遗憾','可惜','泪'], emotion: '悲伤', color: '#7b9ec7' },
    { keys: ['忧郁','低沉','阴郁','灰暗','沉闷'], emotion: '忧郁', color: '#8899cc' },
    { keys: ['害怕','恐惧','担心','焦虑','不安','紧张','慌','惊'], emotion: '焦虑', color: '#c0a0d0' },
    { keys: ['生气','愤怒','讨厌','烦','火大','受不了','气'], emotion: '愤怒', color: '#d4786e' },
    { keys: ['困惑','迷茫','不知道','为什么','搞不懂','不明白','无从'], emotion: '迷惘', color: '#b0b8c8' },
    { keys: ['孤独','寂寞','一个人','孤单','没人','独自'], emotion: '孤独', color: '#8899bb' },
    { keys: ['怀念','想念','回忆','从前','过去','记得','曾经'], emotion: '怀念', color: '#a0b0c8' },
    { keys: ['惊讶','神奇','不可思议','哇','天哪','惊奇','震撼'], emotion: '惊奇', color: '#d4a574' },
    { keys: ['坚持','努力','加油','一定','必须','坚定','勇敢'], emotion: '勇气', color: '#90b898' },
    { keys: ['想','思考','觉得','认为','也许','可能','反思'], emotion: '思考', color: '#9bb0d0' },
    { keys: ['灵感','创意','想法','点子','突然','闪现'], emotion: '灵感', color: '#f0d080' },
    { keys: ['安静','宁静','平和','舒适','放松','惬意','平静','安详'], emotion: '宁静', color: '#b0d0c8' },
    { keys: ['释然','放下','接受','接纳','算了','也罢'], emotion: '释然', color: '#b8c8b8' },
    { keys: ['骄傲','自豪','成就感','超越','做到'], emotion: '骄傲', color: '#e0c060' },
    { keys: ['满足','充实','圆满','完成','充实'], emotion: '满足', color: '#c8d898' },
  ];

  for (const p of patterns) {
    for (const key of p.keys) {
      if (text.includes(key)) {
        return {
          emotion: p.emotion,
          color: p.color,
          tags: [],
          depth: '',
          reflection: getDefaultReflection(p.emotion),
          source: 'keyword-fallback',
        };
      }
    }
  }

  return {
    emotion: '思考',
    color: '#9bb0d0',
    tags: [],
    depth: '文字中的情感像一层薄雾，需要更多时间来感受它的形状。',
    reflection: '你写这段文字时，心里最真实的感受是什么？',
    source: 'keyword-fallback',
  };
}

function getDefaultReflection(emotion) {
  const reflections = {
    '喜悦': '这份喜悦从何而来？它告诉你什么关于你自己的事？',
    '感激': '除了感恩，你有没有想过，你也可能是别人感恩的对象？',
    '希望': '希望是一种方向感。你正在朝什么方向走？',
    '爱': '爱有时是动词，有时是名词。此刻它对你来说是什么？',
    '悲伤': '悲伤是心灵在告诉你什么重要。它想告诉你什么？',
    '忧郁': '忧郁像一层薄雾，透过它，你看到了什么不一样的风景？',
    '恐惧': '恐惧守护着你的安全。它真正在保护的是什么？',
    '焦虑': '焦虑是内心在提醒你关心某件事。那是什么？',
    '愤怒': '愤怒往往掩盖了更深的情感。它下面是什么？',
    '迷惘': '迷惘不是迷路，而是站在岔路口。你看到了几条路？',
    '孤独': '孤独有时不是缺人陪伴，而是缺人理解。你希望被理解什么？',
    '怀念': '回忆之所以温暖，是因为它提醒我们曾经拥有。',
    '惊奇': '惊奇是心灵的窗户突然被打开。你看到了什么？',
    '勇气': '勇气不是没有恐惧，而是带着恐惧前行。你正在面对什么？',
    '思考': '思考是心灵与自己对话的方式。这场对话在说什么？',
    '灵感': '灵感是内心闪电的一瞬。它照亮了什么？',
    '宁静': '宁静不是没有声音，而是内心的和谐。此刻你与什么和谐？',
    '释然': '放下不是放弃，而是选择不再背负。你放下了什么？',
    '骄傲': '骄傲是你对自己的认可。这份认可来自什么？',
    '满足': '满足感像一杯温水。它来自哪里？',
  };
  return reflections[emotion] || '这段文字在对你诉说什么？试着更深入地倾听。';
}

module.exports = {
  analyzeEmotion,
  EMOTION_COLORS,
  fallbackAnalyze,
};
