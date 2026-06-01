// 心流花园 - 数据库层 (sql.js 纯JS实现，零原生依赖)
// 每个想法都是一颗种子，在这里生根发芽

const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

// 数据库路径：优先使用环境变量，否则使用相对路径
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'garden.db');

let db = null;

// 初始化数据库（必须在服务器启动时调用）
async function initDB() {
  const SQL = await initSqlJs();

  // 确保 data 目录存在
  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // 尝试从文件加载
  try {
    if (fs.existsSync(DB_PATH)) {
      const fileBuffer = fs.readFileSync(DB_PATH);
      db = new SQL.Database(fileBuffer);
    } else {
      db = new SQL.Database();
    }
  } catch (e) {
    console.error('数据库加载失败，创建新数据库:', e.message);
    db = new SQL.Database();
  }

  db.run('PRAGMA foreign_keys = ON');

  // 创建表结构
  db.run(`
    CREATE TABLE IF NOT EXISTS thoughts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content TEXT NOT NULL,
      emotion TEXT DEFAULT 'calm',
      color TEXT DEFAULT '#d4a574',
      position_x REAL DEFAULT 0,
      position_y REAL DEFAULT 0,
      position_z REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS reflections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      thought_id INTEGER,
      prompt TEXT NOT NULL,
      response TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (thought_id) REFERENCES thoughts(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS garden_state (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      total_thoughts INTEGER DEFAULT 0,
      last_visit DATETIME DEFAULT CURRENT_TIMESTAMP,
      garden_age_days INTEGER DEFAULT 1
    )
  `);

  const state = db.exec('SELECT id FROM garden_state WHERE id = 1');
  if (!state.length || !state[0].values.length) {
    db.run('INSERT INTO garden_state (id) VALUES (1)');
  }

  saveToFile();
  console.log('  💾 数据库已就绪');
  return db;
}

function saveToFile() {
  try {
    const data = db.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
  } catch (e) {
    console.error('保存数据库失败:', e.message);
  }
}

function queryAll(sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

function queryOne(sql, params = []) {
  const results = queryAll(sql, params);
  return results[0] || null;
}

function run(sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);
  stmt.step();
  stmt.free();
  saveToFile();
}

function saveThought(content, emotion, color, posX, posY, posZ) {
  run(
    'INSERT INTO thoughts (content, emotion, color, position_x, position_y, position_z) VALUES (?, ?, ?, ?, ?, ?)',
    [content, emotion, color, posX, posY, posZ]
  );

  run('UPDATE garden_state SET total_thoughts = total_thoughts + 1, last_visit = CURRENT_TIMESTAMP');

  const result = db.exec('SELECT last_insert_rowid() as id');
  return result[0].values[0][0];
}

function getAllThoughts() {
  return queryAll('SELECT * FROM thoughts ORDER BY created_at DESC');
}

function getThoughtById(id) {
  return queryOne('SELECT * FROM thoughts WHERE id = ?', [id]);
}

function getGardenState() {
  const state = queryOne('SELECT * FROM garden_state WHERE id = 1');
  if (!state) {
    return { total_thoughts: 0, last_visit: new Date().toISOString(), garden_age_days: 1 };
  }

  const firstThought = queryOne('SELECT created_at FROM thoughts ORDER BY created_at ASC LIMIT 1');
  if (firstThought && firstThought.created_at) {
    const first = new Date(firstThought.created_at + 'Z');
    const now = new Date();
    state.garden_age_days = Math.max(1, Math.floor((now - first) / (1000 * 60 * 60 * 24)));
  } else {
    state.garden_age_days = 1;
  }

  return state;
}

function saveReflection(thoughtId, prompt, response) {
  run('INSERT INTO reflections (thought_id, prompt, response) VALUES (?, ?, ?)',
    [thoughtId, prompt, response]);
  return true;
}

function getRandomThought() {
  return queryOne('SELECT * FROM thoughts ORDER BY RANDOM() LIMIT 1');
}

module.exports = {
  initDB,
  saveThought,
  getAllThoughts,
  getThoughtById,
  getGardenState,
  saveReflection,
  getRandomThought,
};
