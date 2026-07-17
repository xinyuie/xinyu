// utils/getClientIp.js —— 获取客户端真实 IP
// 若部署在 Nginx / 云负载均衡之后，需要在 server.js 中设置 app.set('trust proxy', 1)
// 这样 req.ip 才会正确解析 X-Forwarded-For 头部
function getClientIp(req) {
  // 优先使用 Express 在 trust proxy 开启后解析好的 req.ip
  let ip = req.ip || req.connection?.remoteAddress || '';

  // 兼容 IPv4-mapped IPv6 地址，例如 ::ffff:127.0.0.1
  if (ip && ip.startsWith('::ffff:')) {
    ip = ip.substring(7);
  }
  return ip || 'unknown';
}

module.exports = getClientIp;
