/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['lunar-javascript'],
  // 允许局域网设备（手机）访问 dev 资源：不配的话 Next 16 会把来源为 192.168.2.100 的
  // /_next/* 请求判为跨域并返回 403，手机端页面能显示但 JS 加载不全、按钮点不动。
  allowedDevOrigins: ['192.168.2.100', '192.168.2.*', 'localhost', '127.0.0.1'],
};

module.exports = nextConfig;
