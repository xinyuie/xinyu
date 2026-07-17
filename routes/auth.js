// routes/auth.js —— 普通用户：注册 / 登录 / 获取个人信息
const express = require('express');
const bcrypt = require('bcryptjs');
const store = require('../store');
const getClientIp = require('../utils/getClientIp');
const { sign, authUser } = require('../middleware/auth');

const router = express.Router();

// 注册
router.post('/register', (req, res) => {
  const { username, password, email } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ error: '用户名和密码不能为空' });
  }
  if (username.length < 3 || username.length > 32) {
    return res.status(400).json({ error: '用户名长度需在 3-32 个字符之间' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: '密码长度至少 6 位' });
  }

  if (store.findUserByUsername(username)) {
    return res.status(409).json({ error: '用户名已被注册' });
  }

  const ip = getClientIp(req);
  const passwordHash = bcrypt.hashSync(password, 10);

  const user = store.createUser({
    username,
    email: email || null,
    password_hash: passwordHash,
    register_ip: ip
  });

  return res.status(201).json({
    message: '注册成功',
    user: { id: user.id, username: user.username }
  });
});

// 登录
router.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: '用户名和密码不能为空' });
  }

  const user = store.findUserByUsername(username);
  const ip = getClientIp(req);
  const userAgent = req.headers['user-agent'] || '';

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    if (user) {
      store.addLoginLog({ user_id: user.id, ip, user_agent: userAgent, success: false });
    }
    return res.status(401).json({ error: '用户名或密码错误' });
  }

  if (user.is_banned) {
    return res.status(403).json({ error: '该账号已被封禁，请联系管理员' });
  }

  store.recordLogin(user.id, ip);
  store.addLoginLog({ user_id: user.id, ip, user_agent: userAgent, success: true });

  const token = sign({ id: user.id, username: user.username, role: 'user' });

  return res.json({
    message: '登录成功',
    token,
    user: { id: user.id, username: user.username, email: user.email }
  });
});

// 获取当前登录用户信息
router.get('/me', authUser, (req, res) => {
  const user = store.findUserById(req.user.id);
  if (!user) return res.status(404).json({ error: '用户不存在' });
  res.json({ user: store.stripPassword(user) });
});

module.exports = router;
