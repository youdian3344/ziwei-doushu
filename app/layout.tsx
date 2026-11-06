import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/ThemeProvider';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { SITE_URL } from '@/lib/site';

const SITE_TITLE = '紫微命盘 · 倪海厦正宗紫微斗数';
const SITE_DESCRIPTION =
  '基于倪海厦正宗紫微斗数体系，AI深度解读您的命盘格局、大限流年、感情事业财富健康全方位解析';

export const metadata: Metadata = {
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  keywords: '紫微斗数, 倪海厦, 紫微斗数全集, 紫微斗数全书, 骨髓赋, 命盘, 命理, 14主星, 12宫位',
  metadataBase: new URL(SITE_URL),
  alternates: {
    canonical: '/',
  },
  // ─── PWA / iOS「添加到主屏幕」───────────────────────────
  // capable → <meta name="apple-mobile-web-app-capable" content="yes">
  //   配合 manifest 的 display: standalone，实现无地址栏的独立全屏窗口
  // title  → <meta name="apple-mobile-web-app-title">：主屏图标下的名称
  // statusBarStyle → <meta name="apple-mobile-web-app-status-bar-style">：
  //   站点默认暗色主题，取 black（白字黑底），避免默认样式在暗色页面上突兀
  appleWebApp: {
    capable: true,
    title: '紫微命盘',
    statusBarStyle: 'black',
  },
  // 浏览器标签页图标与 iOS 主屏图标（manifest 只负责 Android/桌面安装入口）
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-touch-icon-180.png', sizes: '180x180', type: 'image/png' }],
  },
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    siteName: '紫微研究',
    locale: 'zh_CN',
    type: 'website',
  },
  // 站长平台验证（拿到 verification code 后填入对应字段，重新部署即可）
  verification: {
    // Google Search Console: 在 https://search.google.com/search-console 添加站点后获取
    google: process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION || undefined,
    // Bing Webmaster Tools: 在 https://www.bing.com/webmasters 添加站点后获取
    other: {
      'msvalidate.01': process.env.NEXT_PUBLIC_BING_VERIFICATION || '808FFC6023A2C359B375DD860FEDA856',
      // 百度站长（等执照下来后）
      'baidu-site-verification': process.env.NEXT_PUBLIC_BAIDU_VERIFICATION || '',
      // 360 站长（等执照下来后）
      '360-site-verification': process.env.NEXT_PUBLIC_360_VERIFICATION || '',
    },
  },
};

// ─── 视口与浏览器主题色 ───────────────────────────────────
// themeColor 取站点实际默认外观（暗色 #020810）；站点主题由 localStorage 控制、
// 不跟随系统，故不按 prefers-color-scheme 分档，避免与页面实际底色不一致。
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#020810',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        {/* iOS Safari 全屏启动依赖 apple- 前缀的这条声明；Next 的 appleWebApp.capable
            只输出 mobile-web-app-capable，故手动补齐，两者并存以覆盖新旧 iOS。 */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('ziwei-theme');if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t);else document.documentElement.setAttribute('data-theme','dark');}catch(e){}})();` }} />
      </head>
      <body className="min-h-screen">
        <ThemeProvider>
          {children}
        </ThemeProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}