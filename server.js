// server.js —— 服务入口
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');

const app = express();

// 如果部署在 Nginx / 云负载均衡（如阿里云 SLB、Cloudflare）之后，
// 必须开启 trust proxy，否则拿到的 IP 会是反向代理服务器的 IP 而不是用户真实 IP。
app.set('trust proxy', true);

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// 兜底错误处理
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: '服务器内部错误' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`服务已启动: http://localhost:${PORT}`);
  console.log(`后台管理入口: http://localhost:${PORT}/admin.html`);
});
