// middleware/auth.js —— JWT 鉴权中间件
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'please_change_this_to_a_long_random_secret';

function sign(payload, expiresIn = '7d') {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

function getTokenFromHeader(req) {
  const header = req.headers['authorization'] || '';
  const parts = header.split(' ');
  if (parts.length === 2 && parts[0] === 'Bearer') {
    return parts[1];
  }
  return null;
}

// 普通用户鉴权：要求 token 中 role === 'user'
function authUser(req, res, next) {
  const token = getTokenFromHeader(req);
  if (!token) return res.status(401).json({ error: '未登录或登录已过期' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload.role !== 'user') return res.status(403).json({ error: '无权限' });
    req.user = payload;
    next();
  } catch (e) {
    return res.status(401).json({ error: '登录状态无效，请重新登录' });
  }
}

// 管理员鉴权：要求 token 中 role === 'admin'
function authAdmin(req, res, next) {
  const token = getTokenFromHeader(req);
  if (!token) return res.status(401).json({ error: '未登录或登录已过期' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload.role !== 'admin') return res.status(403).json({ error: '无权限' });
    req.admin = payload;
    next();
  } catch (e) {
    return res.status(401).json({ error: '登录状态无效，请重新登录' });
  }
}

module.exports = { sign, authUser, authAdmin };
