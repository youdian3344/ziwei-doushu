'use client';
import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import BirthForm from '@/components/BirthForm';
import BaziBoard from '@/components/bazi/BaziBoard';
import BaziStats from '@/components/bazi/BaziStats';
import BaziYun from '@/components/bazi/BaziYun';
import { calculateBazi } from '@/lib/bazi';
import type { BaziChart } from '@/lib/bazi';
import type { BirthInfo } from '@/lib/ziwei/types';
import { useTheme } from '@/components/ThemeProvider';
import { cardStyle } from '@/components/bazi/theme';

// ─── AiContent 渲染器（与 InsightPanel / 合盘页一致）────────────
function AiContent({ text, streaming }: { text: string; streaming?: boolean }) {
  const lines = text.split('\n');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {lines.map((line, i) => {
        const sectionMatch = line.match(/^\*\*【(.+?)】\*\*$/);
        if (sectionMatch) {
          return (
            <div key={i} style={{ paddingTop: i === 0 ? 0 : '14px', paddingBottom: '4px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ac)', letterSpacing: '0.04em' }}>
                【{sectionMatch[1]}】
              </span>
            </div>
          );
        }
        if (line.trim() === '') return <div key={i} style={{ height: '4px' }} />;
        const parts = line.split(/\*\*(.+?)\*\*/);
        return (
          <div key={i} style={{ fontSize: '13px', lineHeight: 1.75, color: 'var(--tx-2)' }}>
            {parts.map((part, j) =>
              j % 2 === 0
                ? part
                : <strong key={j} style={{ fontWeight: 500, color: 'var(--tx-0)' }}>{part}</strong>
            )}
          </div>
        );
      })}
      {streaming && (
        <span style={{
          display: 'inline-block', width: '7px', height: '13px',
          background: 'var(--ac)', opacity: 0.5, borderRadius: '2px',
          animation: 'pulse 1s ease-in-out infinite',
          verticalAlign: 'middle', marginLeft: '2px',
        }} />
      )}
    </div>
  );
}

/**
 * 八字排盘页 —— /bazi
 *
 * 排盘全部在浏览器本地用 lib/bazi 引擎完成（与站内紫微排盘同一历法口径）：
 * 年柱/月柱按节气换柱，晚子时归入次日，真太阳时沿用 BirthForm 的经度修正。
 * 输出的四柱、十神、藏干、纳音、五行、旺衰、格局、调候、大运流年直接渲染成盘面；
 * 下方 AI 解读面板 POST /api/bazi，按《渊海子平》《子平真诠》《三命通会》《滴天髓》《穷通宝鉴》流式给出解读。
 */
export default function BaziPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [chart, setChart] = useState<BaziChart | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // ─── AI 解读状态 ──────────────────────────────────────────
  const [analysis, setAnalysis] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [question, setQuestion] = useState('');
  const [analysisError, setAnalysisError] = useState(false);
  // 服务端返回的具体原因（缺哪项配置 / 上游错误）
  const [errorNote, setErrorNote] = useState('');
  // 开源版不含 /api/bazi：接口 404 时单独说明
  const [apiMissing, setApiMissing] = useState(false);
  const analysisRef = useRef<HTMLDivElement>(null);

  const handleSubmit = (info: BirthInfo) => {
    setFormError(null);
    try {
      setChart(calculateBazi(info, new Date().getFullYear()));
      setAnalysis('');
      setAnalysisError(false);
      setErrorNote('');
      setApiMissing(false);
    } catch {
      setFormError('排盘失败：请检查出生年月日时是否合法。');
    }
  };

  const resetChart = () => {
    setChart(null);
    setFormError(null);
    setAnalysis('');
    setAnalyzing(false);
    setAnalysisError(false);
    setErrorNote('');
    setApiMissing(false);
  };

  // ─── 统一入口：请求流式解读（首次解读与追问共用）──────────
  const runAnalysis = useCallback(async (q?: string) => {
    if (!chart) return;
    setAnalyzing(true);
    setAnalysis('');
    setAnalysisError(false);
    setErrorNote('');

    try {
      const res = await fetch('/api/bazi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chart, question: q ?? undefined }),
      });
      if (res.status === 404) { setApiMissing(true); throw new Error('api-missing'); }
      if (!res.ok) {
        // 服务端会把「缺哪项配置 / 上游为什么失败」写进 message
        const detail = (await res.json().catch(() => null)) as { message?: string } | null;
        setErrorNote(detail?.message ?? '');
        throw new Error('请求失败');
      }
      if (!res.body) throw new Error('无响应流');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let text = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6);
          if (data === '[DONE]') break;
          try {
            const delta = JSON.parse(data).delta?.text ?? '';
            text += delta;
            setAnalysis(text);
          } catch { /* skip */ }
        }
      }
      setTimeout(() => analysisRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    } catch {
      setAnalysisError(true);
    } finally {
      setAnalyzing(false);
    }
  }, [chart]);

  const labelStyle = {
    fontSize: '10px', letterSpacing: '0.4em', color: 'var(--ac)', opacity: 0.7,
    marginBottom: '16px', display: 'block',
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-0)' }}>
      {/* 顶栏 */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: isDark ? 'rgba(2,8,16,0.88)' : 'rgba(250,245,235,0.92)',
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--bdr)',
        display: 'flex', alignItems: 'center', padding: '0 24px', height: '52px', gap: '16px',
      }}>
        <button
          onClick={() => router.push('/')}
          style={{
            display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px',
            color: 'var(--tx-3)', background: 'none', border: 'none', cursor: 'pointer',
          }}
        >
          <span style={{ fontSize: '16px' }}>‹</span>
          <span>返回</span>
        </button>
        <div style={{ width: '1px', height: '20px', background: 'var(--bdr-med)' }} />
        <span style={{ fontSize: '12px', color: 'var(--ac)', letterSpacing: '0.2em' }}>八字排盘</span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: '11px', color: 'var(--tx-3)' }}>四柱 · 十神 · 大运流年</span>
      </header>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 24px 80px' }}>
        {/* 标题 */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '28px', color: 'var(--ac)', opacity: 0.15, marginBottom: '12px' }}>☰</div>
          <h1 style={{ fontSize: '22px', fontWeight: 600, letterSpacing: '0.15em', color: 'var(--tx-0)', marginBottom: '8px' }}>
            八字排盘
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--tx-3)', lineHeight: 1.7 }}>
            输入出生年月日时，本地引擎按节气口径排出四柱八字，
            <br />
            并给出十神、藏干、纳音、五行旺衰、格局、调候用神与大运流年
          </p>
        </div>

        {/* 未起盘：出生信息表单 */}
        {!chart && (
          <div style={{ maxWidth: '720px', margin: '0 auto', ...cardStyle(isDark) }}>
            <BirthForm onSubmit={handleSubmit} />
            {formError && (
              <div style={{ marginTop: '16px', fontSize: '13px', color: '#dc2626' }}>{formError}</div>
            )}
          </div>
        )}

        {/* 已起盘：命盘 */}
        {chart && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={resetChart}
                style={{
                  padding: '6px 14px', cursor: 'pointer', fontSize: '13px',
                  border: '1px solid var(--bdr-med)', borderRadius: 'var(--r-sm)',
                  background: 'transparent', color: 'var(--tx-2)',
                }}
              >
                ← 重新起盘
              </button>
              <span style={{ fontSize: '12px', color: 'var(--tx-3)' }}>
                {chart.birthInfo.name ? `${chart.birthInfo.name} · ` : ''}
                {chart.birthInfo.gender === 'male' ? '乾造' : '坤造'}　{chart.pillars.year.ganZhi} {chart.pillars.month.ganZhi} {chart.pillars.day.ganZhi} {chart.pillars.hour.ganZhi}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <BaziBoard chart={chart} />
              <BaziStats chart={chart} />
              <BaziYun chart={chart} />

              {/* ═══ AI 解读面板 ═══════════════════════════════ */}
              <div ref={analysisRef} style={{
                ...cardStyle(isDark),
                minHeight: '280px', padding: '28px 32px',
                display: 'flex', flexDirection: 'column',
                justifyContent: (!analysis && !analyzing) ? 'center' : 'flex-start',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: (analysis || analyzing) ? '20px' : '24px' }}>
                  <span style={{ color: 'var(--ac)', opacity: 0.6 }}>◉</span>
                  <span style={{ fontSize: '11px', letterSpacing: '0.3em', color: 'var(--tx-3)' }}>
                    八字解读 · BAZI
                  </span>
                </div>

                {!analysis && !analyzing && (
                  <div style={{ textAlign: 'center', padding: '20px 0' }}>
                    <div style={{ fontSize: '13px', color: 'var(--tx-3)', marginBottom: '20px', lineHeight: 1.8 }}>
                      依据《渊海子平》《子平真诠》《三命通会》《滴天髓》《穷通宝鉴》的方法与原文<br />
                      AI 按子平法次第解读本盘：日主、月令提纲、格局调候、大运流年
                    </div>
                    <button
                      onClick={() => runAnalysis()}
                      style={{
                        padding: '14px 40px', borderRadius: 'var(--r-pill)', border: 'none',
                        background: 'linear-gradient(135deg, #9a6210, #c88020)',
                        color: '#fff8e8', fontSize: '14px', fontWeight: 600,
                        letterSpacing: '0.15em', cursor: 'pointer',
                        boxShadow: '0 4px 16px rgba(140,100,20,0.25)',
                        transition: 'transform 0.15s',
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; }}
                    >
                      开始八字解读
                    </button>
                  </div>
                )}

                {analyzing && !analysis && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '40px 0', color: 'var(--tx-3)', fontSize: '13px' }}>
                    <div style={{
                      width: '14px', height: '14px',
                      border: '2px solid var(--bdr-med)', borderTopColor: 'var(--ac)',
                      borderRadius: '50%', animation: 'spin 0.8s linear infinite',
                    }} />
                    正在依据典籍解读八字…
                  </div>
                )}

                {analysis && <AiContent text={analysis} streaming={analyzing} />}

                {analysisError && (
                  <div style={{ padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--bdr)', background: 'var(--bg-card)', fontSize: '13px', color: 'var(--tx-2)', marginTop: '12px' }}>
                    {apiMissing
                      ? '开源版不含八字 AI 解读接口（/api/bazi），需要你自己实现后才能用。命盘本身已在页面上完整排出，可先查看四柱与运势。'
                      : errorNote || '解读暂时不可用，请重试。'}
                  </div>
                )}
              </div>

              {/* ═══ 追问框（仅解读完成后显示）═════════════════ */}
              {analysis && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ fontSize: '11px', letterSpacing: '0.2em', color: 'var(--tx-3)', marginBottom: '4px' }}>
                    针对此次解读继续追问
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {[
                      '事业财运如何？',
                      '婚姻感情如何？',
                      '适合什么行业与方位？',
                      '当前大运走势如何？',
                      '健康上需注意什么？',
                    ].map(q => (
                      <button
                        key={q}
                        onClick={() => { setQuestion(q); runAnalysis(q); }}
                        disabled={analyzing}
                        style={{
                          fontSize: '12px', padding: '6px 14px',
                          borderRadius: 'var(--r-pill)',
                          border: '1px solid var(--bdr-med)',
                          background: 'transparent', color: 'var(--tx-2)',
                          cursor: analyzing ? 'not-allowed' : 'pointer',
                          opacity: analyzing ? 0.5 : 1,
                          transition: 'border-color 0.15s',
                        }}
                        onMouseEnter={e => { if (!analyzing) (e.currentTarget as HTMLElement).style.borderColor = 'var(--ac-bdr)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--bdr-med)'; }}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      value={question}
                      onChange={e => setQuestion(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !analyzing) runAnalysis(question || undefined); }}
                      placeholder="继续追问，如：哪几年是事业关键期？"
                      disabled={analyzing}
                      className="input-base"
                      style={{ fontSize: '13px', flex: 1 }}
                    />
                    <button
                      onClick={() => runAnalysis(question || undefined)}
                      disabled={analyzing}
                      style={{
                        padding: '10px 20px', borderRadius: 'var(--r-sm)', border: 'none',
                        background: analyzing ? 'var(--bg-2)' : 'var(--tx-0)',
                        color: analyzing ? 'var(--tx-3)' : 'white',
                        fontSize: '13px', fontWeight: 500,
                        cursor: analyzing ? 'not-allowed' : 'pointer',
                        transition: 'all 0.15s', whiteSpace: 'nowrap',
                      }}
                    >
                      {analyzing ? '解读中…' : '继续追问'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 相关入口 */}
            <div style={{
              marginTop: '24px', display: 'flex', gap: '16px', flexWrap: 'wrap',
              fontSize: '12px', color: 'var(--tx-3)',
            }}>
              <Link href="/chart" style={{ color: 'var(--tx-2)', textDecoration: 'none' }}>紫微命盘 →</Link>
              <Link href="/heming" style={{ color: 'var(--tx-2)', textDecoration: 'none' }}>紫微合盘 →</Link>
              <Link href="/library" style={{ color: 'var(--tx-2)', textDecoration: 'none' }}>古籍库 →</Link>
            </div>
          </>
        )}
      </div>

      <style>{`
        @media (max-width: 680px) {
          .bazi-pillars { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
        }
      `}</style>
    </div>
  );
}