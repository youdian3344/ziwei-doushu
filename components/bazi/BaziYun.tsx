'use client';
import { GAN_WUXING, ZHI_WUXING, WUXING_LIST } from '@/lib/bazi';
import type { BaziChart, DaYunInfo } from '@/lib/bazi';
import { useTheme } from '@/components/ThemeProvider';
import { cardStyle, blockLabelStyle, wuxingColor } from './theme';

function DaYunCard({ daYun }: { daYun: DaYunInfo }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  if (!daYun.ganZhi) {
    return (
      <div style={{
        minWidth: '96px', padding: '12px 10px', borderRadius: 'var(--r-md)',
        border: '1px dashed var(--bdr-med)', textAlign: 'center',
      }}>
        <div style={{ fontSize: '11px', color: 'var(--tx-3)' }}>起运前</div>
        <div style={{ fontSize: '12px', color: 'var(--tx-2)', marginTop: '6px' }}>
          {daYun.startAge}–{daYun.endAge} 岁
        </div>
        <div style={{ fontSize: '11px', color: 'var(--tx-3)', marginTop: '2px' }}>
          {daYun.startYear}–{daYun.endYear}
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minWidth: '96px', padding: '12px 10px', borderRadius: 'var(--r-md)', textAlign: 'center',
      border: `1px solid ${daYun.isCurrent ? 'var(--ac-bdr)' : 'var(--bdr)'}`,
      background: daYun.isCurrent ? 'var(--ac-bg)' : 'transparent',
    }}>
      <div style={{ fontSize: '11px', color: 'var(--tx-3)' }}>
        {daYun.isCurrent ? <span style={{ color: 'var(--ac)' }}>当前</span> : `${daYun.startAge}–${daYun.endAge} 岁`}
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: '2px', margin: '6px 0 4px' }}>
        {daYun.gan && <span style={{ fontSize: '20px', fontWeight: 600, color: wuxingColor(GAN_WUXING[daYun.gan], isDark) }}>{daYun.gan}</span>}
        {daYun.zhi && <span style={{ fontSize: '20px', fontWeight: 600, color: wuxingColor(ZHI_WUXING[daYun.zhi], isDark) }}>{daYun.zhi}</span>}
      </div>
      <div style={{ fontSize: '11px', color: 'var(--tx-2)' }}>{daYun.ganShiShen ?? ''}</div>
      <div style={{ fontSize: '11px', color: 'var(--tx-3)', marginTop: '2px' }}>
        {daYun.startYear}–{daYun.endYear}
      </div>
      <div style={{ fontSize: '11px', color: 'var(--tx-3)' }}>{daYun.startAge}–{daYun.endAge} 岁</div>
    </div>
  );
}

export default function BaziYun({ chart }: { chart: BaziChart }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const current = chart.currentDaYunIndex !== undefined ? chart.yun.daYun[chart.currentDaYunIndex] : undefined;

  return (
    <div style={cardStyle(isDark)}>
      <div style={blockLabelStyle}>
        <span style={{ color: 'var(--ac)', opacity: 0.6 }}>◎</span>
        大运 · 流年 · DA YUN
      </div>

      {/* 起运 */}
      <div style={{ fontSize: '12px', color: 'var(--tx-2)', marginBottom: '14px', lineHeight: 1.8 }}>
        <span style={{ color: 'var(--tx-3)', marginRight: '8px' }}>起运</span>
        {chart.yun.forward ? '顺行（阳男阴女）' : '逆行（阴男阳女）'} · {chart.yun.startText}
        {chart.yun.startSolar && <>（公历 {chart.yun.startSolar}）</>}
        <span style={{ color: 'var(--tx-3)', marginLeft: '12px' }}>
          一步大运 10 年，起运前先用小运
        </span>
      </div>

      {/* 大运序列 */}
      <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '6px' }}>
        {chart.yun.daYun.map((d) => <DaYunCard key={d.index} daYun={d} />)}
      </div>

      {/* 当前流年 */}
      {chart.currentLiuNian && (
        <div style={{
          marginTop: '16px', paddingTop: '14px', borderTop: '1px solid var(--bdr)',
          display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '8px 16px', fontSize: '12px', color: 'var(--tx-2)',
        }}>
          <span>
            <span style={{ color: 'var(--tx-3)', marginRight: '8px' }}>{chart.currentYear} 流年</span>
            <span style={{ color: wuxingColor(GAN_WUXING[chart.currentLiuNian.gan], isDark), fontWeight: 600 }}>{chart.currentLiuNian.gan}</span>
            <span style={{ color: wuxingColor(ZHI_WUXING[chart.currentLiuNian.zhi], isDark), fontWeight: 600 }}>{chart.currentLiuNian.zhi}</span>
            <span style={{ marginLeft: '8px' }}>{chart.currentLiuNian.ganShiShen}</span>
          </span>
          <span><span style={{ color: 'var(--tx-3)', marginRight: '8px' }}>虚岁</span>{chart.currentAge}</span>
          {current && (
            <span>
              <span style={{ color: 'var(--tx-3)', marginRight: '8px' }}>所在大运</span>
              {current.ganZhi}（{current.startAge}–{current.endAge} 岁）
            </span>
          )}
        </div>
      )}

      {/* 当前大运的十年流年 */}
      {current && current.liuNian.length > 0 && (
        <div style={{ marginTop: '14px' }}>
          <div style={{ fontSize: '11px', letterSpacing: '0.2em', color: 'var(--ac)', opacity: 0.8, marginBottom: '8px' }}>
            当前大运流年（{current.liuNian[0].year}–{current.liuNian[current.liuNian.length - 1].year}）
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {current.liuNian.map((ln) => (
              <span key={ln.year} style={{
                fontSize: '11px', padding: '4px 10px', borderRadius: 'var(--r-sm)',
                border: `1px solid ${ln.year === chart.currentYear ? 'var(--ac-bdr)' : 'var(--bdr)'}`,
                background: ln.year === chart.currentYear ? 'var(--ac-bg)' : 'transparent',
                color: 'var(--tx-2)',
              }}>
                {ln.year} {ln.ganZhi} · {ln.ganShiShen} · {ln.age}岁
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 起运前小运 */}
      {chart.xiaoYun.length > 0 && (
        <div style={{ marginTop: '16px' }}>
          <div style={{ fontSize: '11px', letterSpacing: '0.2em', color: 'var(--ac)', opacity: 0.8, marginBottom: '8px' }}>
            起运前小运（{chart.xiaoYun[0].year}–{chart.xiaoYun[chart.xiaoYun.length - 1].year}）
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {chart.xiaoYun.map((xy) => (
              <span key={xy.year} style={{
                fontSize: '11px', padding: '4px 10px', borderRadius: 'var(--r-sm)',
                border: '1px solid var(--bdr)', color: 'var(--tx-2)',
              }}>
                {xy.year} {xy.ganZhi}{xy.ganShiShen ? ` · ${xy.ganShiShen}` : ''} · {xy.age}岁
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 五行图例（大运/流年干支配色） */}
      <div style={{ marginTop: '16px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        {WUXING_LIST.map((w) => (
          <span key={w} style={{ fontSize: '11px', color: 'var(--tx-3)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: wuxingColor(w, isDark) }} />
            {w}
          </span>
        ))}
      </div>
    </div>
  );
}