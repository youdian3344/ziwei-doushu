/**
 * POST /api/bazi —— 八字 AI 解读（流式）
 *
 * 请求体：{ chart: BaziChart, question?: string }
 * 响应：text/event-stream，逐条 `data: {"delta":{"text":"..."}}`，以 `data: [DONE]` 结束
 * 解读依据《渊海子平》《子平真诠》《三命通会》《滴天髓》《穷通宝鉴》的方法与原文，详见 lib/ai/bazi-knowledge.ts。
 * 供 app/bazi/page.tsx 使用。
 */

import { openChatStream, toClientSseStream, type ChatMessage } from '@/lib/ai/client';
import { buildBaziSystemPrompt } from '@/lib/ai/prompt';
import { missingConfigMessage, resolveAiProvider } from '@/lib/ai/provider';
import type { BaziChart } from '@/lib/bazi/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function isChart(value: unknown): value is BaziChart {
  const chart = value as BaziChart | null;
  return !!chart && !!chart.pillars && !!chart.pillars.day && typeof chart.pillars.day.ganZhi === 'string';
}

export async function POST(req: Request): Promise<Response> {
  const config = resolveAiProvider();
  if (!config) {
    return Response.json(
      { error: 'missing-ai-config', message: missingConfigMessage() },
      { status: 500 },
    );
  }

  let body: { chart?: BaziChart; question?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return Response.json({ error: 'bad-request', message: '请求体不是合法 JSON。' }, { status: 400 });
  }

  if (!isChart(body.chart)) {
    return Response.json(
      { error: 'bad-request', message: '缺少八字盘数据 chart。' },
      { status: 400 },
    );
  }

  const question = typeof body.question === 'string' ? body.question.trim() : '';
  const messages: ChatMessage[] = [
    { role: 'system', content: buildBaziSystemPrompt(body.chart, question || undefined) },
    {
      role: 'user',
      content: question
        ? `请就以下问题做八字解读：\n${question}`
        : '请依据上述八字盘数据做完整解读。',
    },
  ];

  try {
    const upstream = await openChatStream(config, messages);
    return new Response(toClientSseStream(upstream), {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : '调用模型服务失败。';
    return Response.json({ error: 'upstream-error', message }, { status: 502 });
  }
}