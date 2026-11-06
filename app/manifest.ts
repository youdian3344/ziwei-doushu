import type { MetadataRoute } from 'next';

/**
 * PWA Web App Manifest。
 *
 * 由 Next.js App Router 自动暴露为 /manifest.webmanifest，并在页面 head 中
 * 注入 <link rel="manifest">，无需在 layout 中手动声明。
 *
 * 作用：iOS Safari「添加到主屏幕」后以无地址栏的独立窗口（standalone）启动，
 * 并为主屏图标、启动画面底色、浏览器主题色提供声明。
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: '紫微命盘 · 倪海厦正宗紫微斗数',
    short_name: '紫微命盘',
    description:
      '基于倪海厦正宗紫微斗数体系，AI深度解读您的命盘格局、大限流年、感情事业财富健康全方位解析',
    lang: 'zh-CN',
    dir: 'ltr',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    // 命盘/合盘为宽表结构，允许横竖屏切换，不做方向锁定
    orientation: 'any',
    background_color: '#020810',
    theme_color: '#020810',
    categories: ['lifestyle', 'education'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/apple-touch-icon-180.png', sizes: '180x180', type: 'image/png', purpose: 'any' },
    ],
  };
}