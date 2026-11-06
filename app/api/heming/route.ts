/**
 * POST /api/heming —— 合盘 AI 分析（流式）
 *
 * 请求体：{ chartA: ZiweiChart, chartB: ZiweiChart, question?: string }
 * 响应：text/event-stream，逐条 `data: {"delta":{"text":"..."}}`，以 `data: [DONE]` 结束
 * 供 app/heming/page.tsx 使用。
 */

import { openChatStream, toClientSseStream, type ChatMessage } from '@/lib/ai/client';
import { buildHemingSystemPrompt } from '@/lib/ai/prompt';
import { missingConfigMessage, resolveAiProvider } from '@/lib/ai/provider';
import type { ZiweiChart } from '@/lib/ziwei/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function isChart(value: unknown): value is ZiweiChart {
  return !!value && Array.isArray((value as ZiweiChart).palaces) && (value as ZiweiChart).palaces.length > 0;
}

export async function POST(req: Request): Promise<Response> {
  const config = resolveAiProvider();
  if (!config) {
    return Response.json(
      { error: 'missing-ai-config', message: missingConfigMessage() },
      { status: 500 },
    );
  }

  let body: { chartA?: ZiweiChart; chartB?: ZiweiChart; question?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return Response.json({ error: 'bad-request', message: '请求体不是合法 JSON。' }, { status: 400 });
  }

  if (!isChart(body.chartA) || !isChart(body.chartB)) {
    return Response.json(
      { error: 'bad-request', message: '缺少双方命盘数据 chartA / chartB。' },
      { status: 400 },
    );
  }

  const question = typeof body.question === 'string' ? body.question.trim() : '';
  const messages: ChatMessage[] = [
    { role: 'system', content: buildHemingSystemPrompt(body.chartA, body.chartB) },
    {
      role: 'user',
      content: question
        ? `请就以下问题做合盘分析，并先给出总体关系格局，再逐条回应：\n${question}`
        : '请对这两张命盘做完整的合盘分析：先给总体关系格局，再分析相处模式与情感互动，'
          + '其后指出需注意的关口与时间窗口，最后给出可操作的建议。',
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