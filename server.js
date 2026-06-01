// 心流花园 - 服务器
// 一个宁静的数字空间，让思想生长

const express = require('express');
const path = require('path');
const { initDB, saveThought, getAllThoughts, getThoughtById, getGardenState, saveReflection, getRandomThought } = require('./src/db');
const { getRandomPrompt, getDailyPrompt } = require('./src/prompts');
const { analyzeEmotion } = require('./src/ai');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ===== API 路由 =====

// 提交一个新的想法（使用 DeepSeek AI 分析情绪）
app.post('/api/thoughts', async (req, res) => {
  const { content } = req.body;

  if (!content || content.trim().length === 0) {
    return res.status(400).json({ error: '请写下些什么...哪怕只是一个字。' });
  }

  // 使用 DeepSeek AI 进行情绪分析（失败时自动回退到关键词）
  const aiResult = await analyzeEmotion(content.trim());

  const { emotion, color, tags, depth, reflection: aiReflection, source } = aiResult;

  // 在三维空间中随机但均匀地分布
  const radius = 3 + Math.random() * 5;
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.random() * Math.PI * 0.6 + Math.PI * 0.2;

  const posX = radius * Math.sin(phi) * Math.cos(theta);
  const posY = radius * Math.cos(phi) + 1;
  const posZ = radius * Math.sin(phi) * Math.sin(theta);

  const id = saveThought(content.trim(), emotion, color, posX, posY, posZ);
  const thought = getThoughtById(id);

  // 如果AI提供了反思问题，存下来
  if (aiReflection) {
    saveReflection(id, 'AI生成的反思', aiReflection);
  }

  res.json({
    success: true,
    thought,
    emotion,
    color,
    tags,
    depth,
    reflection: aiReflection || getRandomPrompt('deep'),
    source,
  });
});

// 获取所有想法（花园数据）
app.get('/api/thoughts', (req, res) => {
  const thoughts = getAllThoughts();
  const garden = getGardenState();
  res.json({ thoughts, garden });
});

// 获取花园状态
app.get('/api/garden', (req, res) => {
  const garden = getGardenState();
  const thoughts = getAllThoughts();
  res.json({
    ...garden,
    thoughts_count: thoughts.length,
    thoughts
  });
});

// 提交反思
app.post('/api/reflect', (req, res) => {
  const { thoughtId, prompt, response } = req.body;
  if (!response || response.trim().length === 0) {
    return res.status(400).json({ error: '你的反思是无声的...试着写下来吧。' });
  }
  saveReflection(thoughtId, prompt, response.trim());
  res.json({ success: true });
});

// 获取随机提示
app.get('/api/prompt', (req, res) => {
  const { category } = req.query;
  const prompt = getRandomPrompt(category || 'daily');
  const daily = getDailyPrompt();
  res.json({ prompt, daily });
});

// 获取随机回忆
app.get('/api/memory', (req, res) => {
  const thought = getRandomThought();
  res.json({ thought: thought || null });
});

// DeepSeek API 健康检查
app.get('/api/ai-status', async (req, res) => {
  try {
    const result = await analyzeEmotion('测试连接');
    res.json({ connected: true, source: result.source });
  } catch (e) {
    res.json({ connected: false, error: e.message });
  }
});

// 404 处理
app.use((req, res) => {
  if (req.accepts('html')) {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  } else {
    res.status(404).json({ error: '这片花园里没有你要找的东西...' });
  }
});

// 初始化数据库后启动服务器
async function start() {
  await initDB();

  app.listen(PORT, () => {
    console.log(`\n  🌱  心流花园已开启...`);
    console.log(`  ✨  访问 http://localhost:${PORT}\n`);
    console.log(`  🧠  DeepSeek AI 情绪引擎已就绪`);
    console.log(`  ┌─────────────────────────────────────────┐`);
    console.log(`  │  写下你的思考，种下你的心念            │`);
    console.log(`  │  每一次落笔，都在星空里点亮一颗星      │`);
    console.log(`  └─────────────────────────────────────────┘\n`);
  });
}

start();
