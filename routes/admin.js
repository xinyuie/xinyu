// routes/admin.js —— 后台管理：管理员登录 / 用户与 IP 数据管理
const express = require('express');
const store = require('../store');
const { sign, authAdmin } = require('../middleware/auth');

const router = express.Router();

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123456';

// 管理员登录（账号密码来自环境变量，避免写入数据文件被脱库泄露）
router.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: '管理员账号或密码错误' });
  }
  const token = sign({ username, role: 'admin' }, '12h');
  res.json({ message: '登录成功', token });
});

// 以下接口均需管理员登录
router.use(authAdmin);

// 用户列表（支持按用户名 / IP 搜索，分页）
router.get('/users', (req, res) => {
  const { keyword = '', page = 1, pageSize = 20 } = req.query;
  const result = store.listUsers({ keyword, page, pageSize });
  res.json(result);
});

// 单个用户详情 + 登录日志（IP 历史记录）
router.get('/users/:id', (req, res) => {
  const user = store.findUserById(req.params.id);
  if (!user) return res.status(404).json({ error: '用户不存在' });

  const logs = store.getLoginLogs(req.params.id, 50);
  res.json({ user: store.stripPassword(user), logs });
});

// 封禁 / 解封用户
router.patch('/users/:id/ban', (req, res) => {
  const { banned } = req.body || {};
  const ok = store.setBanned(req.params.id, !!banned);
  if (!ok) return res.status(404).json({ error: '用户不存在' });
  res.json({ message: banned ? '已封禁该用户' : '已解封该用户' });
});

// 删除用户
router.delete('/users/:id', (req, res) => {
  const ok = store.deleteUser(req.params.id);
  if (!ok) return res.status(404).json({ error: '用户不存在' });
  res.json({ message: '已删除该用户' });
});

// 概览统计：用户总数、今日新增、独立 IP 数、被封禁人数
router.get('/stats', (req, res) => {
  res.json(store.getStats());
});

module.exports = router;
