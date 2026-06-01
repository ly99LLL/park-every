// 心流花园 - Mock笔记播种脚本
// 生成30条有温度的日记，覆盖冷暖得失的情绪光谱

const http = require('http');

// ==== 30条模拟日记 ====
// 设计思路：像真人两周内的碎碎念，有起有落，有暖有冷
const diaryEntries = [
  // ---- 第一周：总体偏暖，有一些小情绪 ----
  "今天早上阳光特别好，透过窗帘照在脸上，暖洋洋的。很久没有这种被自然叫醒的感觉了，想记住这一刻。",
  "在咖啡馆看到一个老爷爷给老奶奶系围巾，动作很慢很认真。鼻子突然一酸，这才是爱情的样子吧。",
  "工作上的一个项目终于落地了，三个月的努力没有白费。给妈妈打了个电话，她比我还高兴。",
  "下雨天，哪也不想去。窝在沙发上看了一下午的书，雨声是最好的背景音乐。",
  "今天有点烦。跟朋友约好的事又被放鸽子，这种事发生太多次了。不是生气，是失望。",
  "突然很想念大学时光。那时候觉得未来无限可能，现在好像被框住了很多。但也可能是我想多了。",
  "晚上跑步的时候看到一颗流星，赶紧许了个愿。虽然知道是流星雨的季节，但还是觉得是特别的事。",
  "做了一个很奇怪的梦，梦见自己在飞，下面是一片金色的麦田。醒来后心情意外地好。",
  "最近总感觉少了点什么。说不出是什么，就是一种隐隐的空。可能只是累了。",
  "在超市买到了一直想吃的零食，虽然是小事，但足够让我开心了一整个下午。快乐有时候真的很简单。",
  "深夜睡不着，翻到去年今天的照片。那时候好年轻啊，虽然只过了一年。时间真是一个让人猝不及防的东西。",
  "今天跟一个陌生人聊了很久，在地铁上。她跟我分享了她养的那只猫的故事。陌生人的善意总是特别温暖。",
  "爸爸发来一条很长的微信，说了很多平时不会说的话。我看了三遍。有些爱是沉默的，但它一直在。",
  "突然很想哭，但没有理由。也许不是没有理由，而是理由太多了，不知道从哪个开始。",

  // ---- 第二周：情绪波动更大，有深度反思 ----
  "今天做了一个决定，虽然很难，但我知道是对的。长大的标志大概就是能够做对的事，而不是容易的事。",
  "朋友跟我说她失恋了，我去陪她。看着她哭，我想起自己曾经也是这样。时间真的能治愈一切吗？好像不能，但它能让你学会带着伤痕继续走。",
  "一个人去了海边。冬天的海很安静，有一种说不出的肃穆。对着大海喊了几声，好多了。",
  "今天工作效率特别高，连续四个小时进入心流状态。这种感觉太棒了，感觉自己什么都能做到。",
  "妈妈问我过年回不回家，我说再看看。挂了电话就后悔了。为什么要说再看看呢？明明很想回去的。",
  "读了一本关于宇宙的书。在137亿年的时间尺度和930亿光年的空间尺度面前，我的烦恼似乎变得轻盈了一些。但也更加珍贵了。",
  "下雨的傍晚，路边有人在弹吉他唱民谣。驻足听了五分钟，被一句歌词击中：'我们都在阴沟里，但仍有人仰望星空。'",
  "终于鼓起勇气跟一个人说了对不起。那些话憋了很久，说出来的一瞬间，整个人都轻了。道歉不是软弱，是勇敢。",
  "今天什么都没做成，但也没有责怪自己。允许自己有时候就是什么都不做，这也是一种成长吧。",
  "参加了一个老同学的婚礼。看到她幸福的样子，真心为她高兴。同时也忍不住问自己：我的幸福在哪儿？",
  "早晨起来看到窗台上的植物冒出了新芽。一个小小的绿色生命，在冬天努力生长。我想我也应该这样。",
  "今天心情很复杂。有开心的事也有遗憾的事，它们搅在一起，像一杯说不清味道的饮料。生活大概就是这样？",
  "打扫了房间，扔掉了很久不用的东西。物理空间的清理好像也清理了一部分内心。轻盈多了。",
  "晚上看了一部老电影，哭得稀里哗啦。不是因为电影有多悲伤，而是它让我想起了某个夏天，某个人。",
  "今天下了第一场雪。站在窗前看了好久，雪花落下的方式有一种奇特的宁静。世界被白色覆盖的时候，好像一切都可以重新开始。",
  "这一年快结束了。回头看，有收获也有遗憾，有欢笑也有眼泪。最重要的可能是：我还在往前走。",
];

// 延迟函数
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// 提交单条笔记
function submitThought(content) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ content });
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/thoughts',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
      timeout: 30000,
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const data = JSON.parse(body);
          resolve(data);
        } catch (e) {
          reject(new Error(`Parse error: ${body.substring(0, 100)}`));
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    req.write(postData);
    req.end();
  });
}

// 主流程
async function seedGarden() {
  console.log('🌱 开始播种心流花园...\n');
  console.log(`📝 共 ${diaryEntries.length} 条日记等待AI标注\n`);

  let success = 0;
  let fail = 0;
  const emotions = {};

  for (let i = 0; i < diaryEntries.length; i++) {
    const content = diaryEntries[i];
    const preview = content.substring(0, 25);

    try {
      const result = await submitThought(content);

      if (result.success) {
        success++;
        emotions[result.emotion] = (emotions[result.emotion] || 0) + 1;
        const tags = result.tags?.length ? ` [${result.tags.join(', ')}]` : '';
        const icon = getEmotionIcon(result.emotion);
        console.log(`  ${icon} #${String(i+1).padStart(2,'0')} [${result.emotion}]${tags} "${preview}..."`);
      } else {
        fail++;
        console.log(`  ❌ #${i+1} 失败: ${result.error || '未知错误'}`);
      }
    } catch (err) {
      fail++;
      console.log(`  ❌ #${i+1} 网络错误: ${err.message}`);
    }

    // 间隔200ms，不给API太大压力
    await delay(200);
  }

  console.log('\n' + '='.repeat(55));
  console.log(`✅ 播种完成！成功: ${success}, 失败: ${fail}`);
  console.log('\n🎨 情绪分布:');
  const sorted = Object.entries(emotions).sort((a, b) => b[1] - a[1]);
  sorted.forEach(([emotion, count]) => {
    const bar = '█'.repeat(Math.max(1, Math.round(count / 2)));
    console.log(`  ${emotion.padEnd(6, ' ')} ${bar} ${count}`);
  });

  // 冷暖分析
  const warmEmotions = ['喜悦', '感激', '希望', '爱', '温柔', '勇气', '骄傲', '满足', '灵感'];
  const coolEmotions = ['悲伤', '忧郁', '恐惧', '焦虑', '愤怒', '孤独', '怀念', '迷惘', '遗憾'];
  let warm = 0, cool = 0, neutral = 0;
  sorted.forEach(([emotion, count]) => {
    if (warmEmotions.includes(emotion)) warm += count;
    else if (coolEmotions.includes(emotion)) cool += count;
    else neutral += count;
  });
  console.log(`\n🌡️  冷暖分析:`);
  console.log(`  🔥 暖色系: ${warm} 条 (${(warm/success*100).toFixed(0)}%)`);
  console.log(`  ❄️  冷色系: ${cool} 条 (${(cool/success*100).toFixed(0)}%)`);
  console.log(`  🌫️  中性: ${neutral} 条 (${(neutral/success*100).toFixed(0)}%)`);

  process.exit(0);
}

function getEmotionIcon(emotion) {
  const icons = {
    '喜悦': '😊', '感激': '🙏', '希望': '🌟', '爱': '💕', '温柔': '🌸',
    '悲伤': '💧', '忧郁': '🌧️', '恐惧': '😰', '焦虑': '💫',
    '愤怒': '🔥', '迷惘': '🌫️', '孤独': '🌙', '怀念': '📷',
    '惊奇': '✨', '勇气': '💪', '思考': '🤔', '灵感': '💡',
    '宁静': '🍃', '释然': '🕊️', '骄傲': '🏆', '满足': '😌',
    '遗憾': '🍂', '愧疚': '😔',
  };
  return icons[emotion] || '💬';
}

seedGarden();
