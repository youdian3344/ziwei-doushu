'use client';
import { useState } from 'react';
import type { BaziChart } from '@/lib/bazi';
import { WUXING_LIST } from '@/lib/bazi';
import { useTheme } from '@/components/ThemeProvider';
import { cardStyle, blockLabelStyle, wuxingColor } from './theme';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ paddingTop: '16px', marginTop: '16px', borderTop: '1px solid var(--bdr)' }}>
      <div style={{ fontSize: '11px', letterSpacing: '0.2em', color: 'var(--ac)', opacity: 0.8, marginBottom: '10px' }}>
        {title}
      </div>
      {children}
    </div>
  );
}

export default function BaziStats({ chart }: { chart: BaziChart }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [showDetails, setShowDetails] = useState(false);

  const { wuXing, wangShuai, geJu, tiaoHou } = chart;
  const maxSurface = Math.max(1, ...WUXING_LIST.map((w) => wuXing.surface[w]));

  return (
    <div style={cardStyle(isDark)}>
      <div style={blockLabelStyle}>
        <span style={{ color: 'var(--ac)', opacity: 0.6 }}>◉</span>
        五行 · 旺衰 · 格局 · WU XING
      </div>

      {/* ── 五行统计 ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {WUXING_LIST.map((w) => (
          <div key={w} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px' }}>
            <span style={{ width: '16px', color: wuxingColor(w, isDark), fontWeight: 600 }}>{w}</span>
            <span style={{ flex: 1, minWidth: '80px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span
                style={{
                  height: '6px',
                  width: `${(wuXing.surface[w] / maxSurface) * 100}%`,
                  minWidth: wuXing.surface[w] > 0 ? '6px' : '0',
                  background: wuxingColor(w, isDark),
                  opacity: 0.5,
                  borderRadius: '3px',
                }}
              />
            </span>
            <span style={{ width: '58px', color: 'var(--tx-2)', textAlign: 'right' }}>{wuXing.surface[w]} 字</span>
            <span style={{ width: '62px', color: 'var(--tx-3)', textAlign: 'right' }}>加权 {wuXing.withCangGan[w]}</span>
            <span style={{ width: '98px', color: 'var(--tx-3)', textAlign: 'right' }}>
              {wuXing.monthStatus[w]} · {wuXing.shiShenGroups[w]}
            </span>
          </div>
        ))}
        <div style={{ fontSize: '11px', color: 'var(--tx-3)', lineHeight: 1.7, marginTop: '2px' }}>
          字面为四干四支本身；加权计入藏干（本气 1、中气 0.5、余气 0.3）。月令栏为该五行在月支的旺相休囚死，
          末项为该五行相对日主的十神大类。
          {wuXing.missing.length > 0 && <>　缺失：{wuXing.missing.join('、')}。</>}
          {wuXing.strongest.length > 0 && <>　最旺：{wuXing.strongest.join('、')}。</>}
        </div>
      </div>

      {/* ── 旺衰 ── */}
      <Section title="旺衰（得令 + 长生 + 得地 + 得势）">
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '10px' }}>
          <span style={{ fontSize: '16px', fontWeight: 600, color: 'var(--tx-0)' }}>{wangShuai.verdict}</span>
          <span style={{ fontSize: '12px', color: 'var(--tx-2)' }}>综合分 {wangShuai.score}</span>
          <span style={{ fontSize: '11px', color: 'var(--tx-3)' }}>置信度 {wangShuai.confidence}</span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {([
            ['得令', wangShuai.breakdown.deLing],
            ['长生', wangShuai.breakdown.changSheng],
            ['得地', wangShuai.breakdown.deDi],
            ['得势', wangShuai.breakdown.deShi],
          ] as const).map(([k, v]) => (
            <span key={k} style={{
              fontSize: '11px', padding: '3px 10px', borderRadius: 'var(--r-pill)',
              border: '1px solid var(--bdr-med)', color: 'var(--tx-2)',
            }}>
              {k} {v >= 0 ? '+' : ''}{v}
            </span>
          ))}
          <button
            type="button"
            onClick={() => setShowDetails((s) => !s)}
            style={{
              fontSize: '11px', padding: '3px 10px', borderRadius: 'var(--r-pill)',
              border: '1px solid var(--bdr-med)', background: 'transparent',
              color: 'var(--tx-3)', cursor: 'pointer',
            }}
          >
            {showDetails ? '收起分项' : '分项明细'}
          </button>
        </div>
        {showDetails && (
          <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {wangShuai.breakdown.details.map((d, i) => (
              <div key={i} style={{ fontSize: '11px', color: 'var(--tx-3)', lineHeight: 1.7 }}>· {d}</div>
            ))}
          </div>
        )}
      </Section>

      {/* ── 格局 ── */}
      <Section title="格局（《子平真诠》以月令为纲）">
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '6px' }}>
          <span style={{ fontSize: '16px', fontWeight: 600, color: 'var(--tx-0)' }}>{geJu.primary}</span>
          <span style={{ fontSize: '11px', color: 'var(--tx-3)' }}>置信度 {geJu.confidence}</span>
        </div>
        <div style={{ fontSize: '12px', color: 'var(--tx-2)', lineHeight: 1.8 }}>{geJu.basis}</div>
        {geJu.touGan.length > 0 && (
          <div style={{ fontSize: '11px', color: 'var(--tx-3)', marginTop: '4px' }}>
            月支藏干透干：{geJu.touGan.join('、')}
          </div>
        )}
        {geJu.notes.map((n, i) => (
          <div key={i} style={{ fontSize: '11px', color: 'var(--tx-3)', marginTop: '4px', lineHeight: 1.7 }}>· {n}</div>
        ))}
      </Section>

      {/* ── 调候 ── */}
      <Section title="调候用神（《穷通宝鉴》）">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
          {tiaoHou.yongShen.map((g, i) => (
            <span key={g + i} style={{
              fontSize: '12px', padding: '4px 12px', borderRadius: 'var(--r-pill)',
              border: `1px solid ${i === 0 ? 'var(--ac-bdr)' : 'var(--bdr-med)'}`,
              background: i === 0 ? 'var(--ac-bg)' : 'transparent',
              color: i === 0 ? 'var(--ac)' : 'var(--tx-2)',
            }}>
              {g}{i === 0 ? '（主）' : ''}
            </span>
          ))}
        </div>
        <div style={{ fontSize: '11px', color: 'var(--tx-3)', marginTop: '8px', lineHeight: 1.7 }}>{tiaoHou.note}</div>
      </Section>

      {/* ── 干支关系 ── */}
      <Section title="干支关系">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {chart.ganRelations.length === 0 && chart.zhiRelations.length === 0 && (
            <span style={{ fontSize: '12px', color: 'var(--tx-3)' }}>无明显合冲刑害（仅按四柱原位干支对判定）</span>
          )}
          {chart.ganRelations.map((r, i) => (
            <div key={`g${i}`} style={{ fontSize: '12px', color: 'var(--tx-2)' }}>
              <span style={{ color: 'var(--ac)', opacity: 0.8, marginRight: '8px' }}>{r.type}</span>
              {r.gans.join('')}（{r.pillars.join('')}柱）
            </div>
          ))}
          {chart.zhiRelations.map((r, i) => (
            <div key={`z${i}`} style={{ fontSize: '12px', color: 'var(--tx-2)' }}>
              <span style={{ color: 'var(--ac)', opacity: 0.8, marginRight: '8px' }}>{r.type}</span>
              {r.zhi.join('')}（{r.pillars.join('')}柱）{r.detail ? `　${r.detail}` : ''}
            </div>
          ))}
        </div>
      </Section>

      {/* ── 整柱盖头截脚 ── */}
      <Section title="整柱（盖头 / 截脚）">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {chart.pillarVerdicts.map((p) => (
            <span key={p.pillar} style={{
              fontSize: '11px', padding: '4px 10px', borderRadius: 'var(--r-sm)',
              border: '1px solid var(--bdr)', color: 'var(--tx-2)',
            }}>
              {p.pillar}柱 {p.gan}{p.zhi} · {p.verdict}
            </span>
          ))}
        </div>
      </Section>
    </div>
  );
}