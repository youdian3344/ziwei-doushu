/**
 * 八字页面共用样式 —— 与站内既有页面（app/heming/page.tsx 等）保持同一视觉语言：
 * 卡片使用半透明底 + 细边框 + 圆角，颜色全部取自 app/globals.css 的 CSS 变量。
 */
import type { CSSProperties } from 'react';
import type { WuXing } from '@/lib/bazi';

export function cardStyle(isDark: boolean): CSSProperties {
  return {
    background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.9)',
    border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(200,160,60,0.2)'}`,
    borderRadius: '16px',
    padding: '24px',
  };
}

/** 区块小标（如「五行统计 · WU XING」） */
export const blockLabelStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  marginBottom: '16px',
  fontSize: '11px',
  letterSpacing: '0.3em',
  color: 'var(--tx-3)',
};

/** 五行配色：暗色下提亮，浅色下用传统正色 */
const WUXING_COLOR_DARK: Record<WuXing, string> = {
  木: '#4CAF7D', 火: '#E06A5A', 土: '#C9A227', 金: '#E3C468', 水: '#5A8FD8',
};
const WUXING_COLOR_LIGHT: Record<WuXing, string> = {
  木: '#2D7A4A', 火: '#A83228', 土: '#8A7018', 金: '#A9852F', 水: '#1A56A8',
};

export function wuxingColor(wx: WuXing, isDark: boolean): string {
  return (isDark ? WUXING_COLOR_DARK : WUXING_COLOR_LIGHT)[wx];
}