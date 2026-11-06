/**
 * POST /api/interpret —— 命盘 AI 解读（流式）
 *
 * 请求体：{ chart: ZiweiChart, messages: { role: 'user'|'assistant', content: string }[] }
 * 响应：text/event-stream，逐条 `data: {"delta":{"text":"..."}}`，以 `data: [DONE]` 结束
 * 供 components/ChatPanel.tsx 与 components/InsightPanel.tsx 使用。
 */

import { openChatStream, toClientSseStream, type ChatMessage } from '@/lib/ai/client';
import { buildInterpretSystemPrompt } from '@/lib/ai/prompt';
import { missingConfigMessage, resolveAiProvider } from '@/lib/ai/provider';
import type { ZiweiChart } from '@/lib/ziwei/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_MESSAGES = 40;

function badRequest(message: string): Response {
  return Response.json({ error: 'bad-request', message }, { status: 400 });
}

export async function POST(req: Request): Promise<Response> {
  const config = resolveAiProvider();
  if (!config) {
    return Response.json(
      { error: 'missing-ai-config', message: missingConfigMessage() },
      { status: 500 },
    );
  }

  let body: { chart?: ZiweiChart; messages?: ChatMessage[] };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return badRequest('请求体不是合法 JSON。');
  }

  const chart = body.chart;
  if (!chart || !Array.isArray(chart.palaces) || chart.palaces.length === 0) {
    return badRequest('缺少命盘数据 chart。');
  }

  const incoming = (body.messages ?? []).filter(
    (m): m is ChatMessage =>
      !!m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string',
  );
  if (!incoming.length) {
    return badRequest('messages 不能为空。');
  }

  const messages: ChatMessage[] = [
    { role: 'system', content: buildInterpretSystemPrompt(chart) },
    ...incoming.slice(-MAX_MESSAGES).map((m) => ({ role: m.role, content: m.content })),
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