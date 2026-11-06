'use client';
import type { BaziChart, BaziPillar, PillarKey } from '@/lib/bazi';
import { useTheme } from '@/components/ThemeProvider';
import { cardStyle, blockLabelStyle, wuxingColor } from './theme';

const PILLAR_ORDER: PillarKey[] = ['year', 'month', 'day', 'hour'];

const ROLE_LABEL: Record<string, string> = { benqi: '本气', zhongqi: '中气', yuqi: '余气' };

/** 一柱：柱名 + 十神 / 天干 / 地支 / 藏干 / 纳音·星运·旬空 */
function PillarColumn({ pillar }: { pillar: BaziPillar }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const ganColor = wuxingColor(pillar.ganWuXing, isDark);
  const zhiColor = wuxingColor(pillar.zhiWuXing, isDark);

  const cellLabel: React.CSSProperties = {
    fontSize: '10px', letterSpacing: '0.16em', color: 'var(--tx-3)', marginBottom: '4px',
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        padding: '16px 12px',
        borderRadius: 'var(--r-md)',
        border: `1px solid ${pillar.isDayMaster ? 'var(--ac-bdr)' : 'var(--bdr)'}`,
        background: pillar.isDayMaster ? 'var(--ac-bg)' : 'transparent',
      }}
    >
      {/* 柱名 + 天干十神 */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '11px', letterSpacing: '0.2em', color: 'var(--tx-3)' }}>{pillar.label}</div>
        <div style={{ fontSize: '12px', color: pillar.isDayMaster ? 'var(--ac)' : 'var(--tx-2)', marginTop: '4px' }}>
          {pillar.ganShiShen}
        </div>
      </div>

      {/* 天干 / 地支 */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px' }}>
          <span style={{ fontSize: '30px', fontWeight: 600, lineHeight: 1.1, color: ganColor }}>{pillar.gan}</span>
          <span style={{ fontSize: '10px', color: 'var(--tx-3)' }}>{pillar.ganYinYang}{pillar.ganWuXing}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px' }}>
          <span style={{ fontSize: '30px', fontWeight: 600, lineHeight: 1.1, color: zhiColor }}>{pillar.zhi}</span>
          <span style={{ fontSize: '10px', color: 'var(--tx-3)' }}>{pillar.zhiWuXing}</span>
        </div>
      </div>

      {/* 藏干（含分量与十神） */}
      <div>
        <div style={{ ...cellLabel, textAlign: 'center' }}>藏干</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'center' }}>
          {pillar.hideGan.map((h, i) => (
            <span key={i} style={{ fontSize: '11px', color: 'var(--tx-2)', whiteSpace: 'nowrap' }}>
              <span style={{ color: wuxingColor(h.wuXing, isDark) }}>{h.gan}</span>
              <span style={{ color: 'var(--tx-3)' }}>
                {' '}{h.shiShen}·{ROLE_LABEL[h.role] ?? h.role}
              </span>
            </span>
          ))}
        </div>
      </div>

      {/* 纳音 / 星运 / 旬空 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {[
          ['纳音', pillar.naYin],
          ['星运', pillar.diShi],
          ['旬空', pillar.xunKong],
        ].map(([k, v]) => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: '6px', fontSize: '11px' }}>
            <span style={{ ...cellLabel, marginBottom: 0 }}>{k}</span>
            <span style={{ color: 'var(--tx-2)' }}>{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function BaziBoard({ chart }: { chart: BaziChart }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const info: Array<[string, string]> = [
    ['性别', chart.birthInfo.gender === 'male' ? '男' : '女'],
    ['公历（排盘用）', `${chart.solar.year}-${String(chart.solar.month).padStart(2, '0')}-${String(chart.solar.day).padStart(2, '0')} ${String(chart.solar.hour).padStart(2, '0')}:00`],
    ['农历', chart.lunar.text],
    ['日主', `${chart.dayMaster.gan}（${chart.dayMaster.yinYang}${chart.dayMaster.wuXing}）`],
  ];

  return (
    <div style={cardStyle(isDark)}>
      <div style={blockLabelStyle}>
        <span style={{ color: 'var(--ac)', opacity: 0.6 }}>◈</span>
        四柱八字 · SI ZHU
      </div>

      {/* 基本信息 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 20px', marginBottom: '18px' }}>
        {info.map(([k, v]) => (
          <span key={k} style={{ fontSize: '12px', color: 'var(--tx-2)' }}>
            <span style={{ color: 'var(--tx-3)', marginRight: '6px' }}>{k}</span>{v}
          </span>
        ))}
      </div>

      {/* 四柱 */}
      <div className="bazi-pillars" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '10px' }}>
        {PILLAR_ORDER.map((key) => <PillarColumn key={key} pillar={chart.pillars[key]} />)}
      </div>

      {/* 节气 + 胎元 / 胎息 / 命宫 / 身宫 */}
      <div style={{
        marginTop: '16px', paddingTop: '14px', borderTop: '1px solid var(--bdr)',
        display: 'flex', flexWrap: 'wrap', gap: '8px 24px', fontSize: '12px', color: 'var(--tx-2)',
      }}>
        <span>
          <span style={{ color: 'var(--tx-3)', marginRight: '6px' }}>节气</span>
          {chart.jieQi.prevName ?? '—'} {chart.jieQi.prevTime?.slice(0, 16) ?? ''} → {chart.jieQi.nextName ?? '—'} {chart.jieQi.nextTime?.slice(0, 16) ?? ''}
        </span>
        {([
          ['胎元', chart.aux.taiYuan],
          ['胎息', chart.aux.taiXi],
          ['命宫', chart.aux.mingGong],
          ['身宫', chart.aux.shenGong],
        ] as const).map(([k, v]) => (
          <span key={k}>
            <span style={{ color: 'var(--tx-3)', marginRight: '6px' }}>{k}</span>
            {v.ganZhi}（{v.naYin}）
          </span>
        ))}
      </div>
    </div>
  );
}