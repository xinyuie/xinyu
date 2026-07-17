// store.js —— 纯 JS 的 JSON 文件数据存储（零原生依赖）
// 之所以不用 better-sqlite3 / sqlite3，是因为它们需要在安装时编译原生模块，
// 在 Termux（Android）等环境下经常因缺少 build-essential / python 而安装失败。
// 这里用最朴素的「读文件 -> 内存操作 -> 写回文件」方式实现，
// 数据量在几万用户级别以内完全够用，且在任何能跑 Node.js 的环境都能直接运行。

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'db.json');

function ensureFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DB_PATH)) {
    const initial = { users: [], loginLogs: [], nextUserId: 1, nextLogId: 1 };
    fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2));
  }
}

let cache = null;

function load() {
  if (cache) return cache;
  ensureFile();
  cache = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
  return cache;
}

// 同步写回磁盘。Node 是单线程执行 JS，只要不在这中间 await，就不会有并发写冲突。
function persist() {
  fs.writeFileSync(DB_PATH, JSON.stringify(cache, null, 2));
}

function pad(n) { return String(n).padStart(2, '0'); }

function nowDateTime() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function todayDate() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function stripPassword(u) {
  const { password_hash, ...rest } = u;
  return rest;
}

// ---------- 用户相关 ----------

function findUserByUsername(username) {
  return load().users.find(u => u.username === username) || null;
}

function findUserById(id) {
  return load().users.find(u => u.id === Number(id)) || null;
}

function createUser({ username, email, password_hash, register_ip }) {
  const db = load();
  const user = {
    id: db.nextUserId++,
    username,
    email: email || null,
    password_hash,
    register_ip: register_ip || null,
    last_login_ip: null,
    last_login_at: null,
    login_count: 0,
    is_banned: 0,
    created_at: nowDateTime()
  };
  db.users.push(user);
  persist();
  return user;
}

function recordLogin(userId, ip) {
  const db = load();
  const user = db.users.find(u => u.id === Number(userId));
  if (!user) return;
  user.last_login_ip = ip;
  user.last_login_at = nowDateTime();
  user.login_count = (user.login_count || 0) + 1;
  persist();
}

function setBanned(id, banned) {
  const db = load();
  const user = db.users.find(u => u.id === Number(id));
  if (!user) return false;
  user.is_banned = banned ? 1 : 0;
  persist();
  return true;
}

function deleteUser(id) {
  const db = load();
  const idx = db.users.findIndex(u => u.id === Number(id));
  if (idx === -1) return false;
  db.users.splice(idx, 1);
  db.loginLogs = db.loginLogs.filter(l => l.user_id !== Number(id));
  persist();
  return true;
}

// 列表查询：支持关键字（用户名 / 注册IP / 最近登录IP）与分页
function listUsers({ keyword = '', page = 1, pageSize = 20 } = {}) {
  const db = load();
  let list = db.users;

  if (keyword) {
    const kw = keyword.toLowerCase();
    list = list.filter(u =>
      (u.username || '').toLowerCase().includes(kw) ||
      (u.register_ip || '').includes(kw) ||
      (u.last_login_ip || '').includes(kw)
    );
  }

  list = list.slice().sort((a, b) => b.id - a.id);
  const total = list.length;
  const p = Math.max(1, parseInt(page) || 1);
  const size = Math.min(parseInt(pageSize) || 20, 100);
  const start = (p - 1) * size;
  const users = list.slice(start, start + size).map(stripPassword);

  return { total, page: p, pageSize: size, users };
}

function getStats() {
  const db = load();
  const totalUsers = db.users.length;
  const bannedUsers = db.users.filter(u => u.is_banned).length;
  const today = todayDate();
  const todayNew = db.users.filter(u => (u.created_at || '').startsWith(today)).length;

  const ips = new Set();
  db.users.forEach(u => {
    if (u.register_ip) ips.add(u.register_ip);
    if (u.last_login_ip) ips.add(u.last_login_ip);
  });

  return { totalUsers, bannedUsers, todayNew, uniqueIps: ips.size };
}

// ---------- 登录日志（IP 历史） ----------

function addLoginLog({ user_id, ip, user_agent, success }) {
  const db = load();
  db.loginLogs.push({
    id: db.nextLogId++,
    user_id: Number(user_id),
    ip: ip || null,
    user_agent: user_agent || '',
    success: success ? 1 : 0,
    created_at: nowDateTime()
  });
  persist();
}

function getLoginLogs(userId, limit = 50) {
  const db = load();
  return db.loginLogs
    .filter(l => l.user_id === Number(userId))
    .sort((a, b) => b.id - a.id)
    .slice(0, limit);
}

module.exports = {
  findUserByUsername,
  findUserById,
  createUser,
  recordLogin,
  setBanned,
  deleteUser,
  listUsers,
  getStats,
  addLoginLog,
  getLoginLogs,
  stripPassword
};
