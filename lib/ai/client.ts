/**
 * lib/ai/client —— OpenAI 兼容协议的流式调用
 *
 * 上游返回的 SSE 会被转换成项目前端约定的格式：
 *   data: {"delta":{"text":"..."}}\n\n   —— 增量文本
 *   data: [DONE]\n\n                    —— 结束标记
 * 与 components/ChatPanel.tsx、components/InsightPanel.tsx、app/heming/page.tsx 的读取逻辑一致。
 */

import type { AiProviderConfig } from './provider';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/** 上游调用失败（网络不通、鉴权失败、返回非 2xx、无响应流） */
export class AiUpstreamError extends Error {
  readonly status: number;

  constructor(message: string, status = 502) {
    super(message);
    this.name = 'AiUpstreamError';
    this.status = status;
  }
}

/** 发起流式对话请求；配置或上游有问题时抛出 AiUpstreamError（尚未向客户端写出任何内容） */
export async function openChatStream(
  config: AiProviderConfig,
  messages: ChatMessage[],
): Promise<ReadableStream<Uint8Array>> {
  const endpoint = `${config.baseUrl}/chat/completions`;

  let res: Response;
  try {
    res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        stream: true,
        temperature: 0.7,
      }),
    });
  } catch (err) {
    const reason = err instanceof Error ? err.message : '网络错误';
    throw new AiUpstreamError(`无法连接模型服务（${config.provider} · ${endpoint}）：${reason}`);
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    const hint = res.status === 401 || res.status === 403
      ? '（密钥无效或无权限，请检查 .env.local 中的 API Key）'
      : res.status === 404
        ? '（端点或模型名不存在，请检查 _BASE_URL 与 _MODEL）'
        : '';
    throw new AiUpstreamError(
      `模型服务返回 ${res.status}${hint}${detail ? `：${detail.slice(0, 400)}` : ''}`,
    );
  }

  if (!res.body) {
    throw new AiUpstreamError('模型服务未返回可用响应流（该服务可能不支持 stream 参数）');
  }

  return res.body;
}

/** 从上游 SSE 行中取出增量文本 */
function extractDelta(line: string): string {
  const trimmed = line.trim();
  if (!trimmed.startsWith('data:')) return '';
  const payload = trimmed.slice(5).trim();
  if (!payload || payload === '[DONE]') return '';
  try {
    const json = JSON.parse(payload) as {
      choices?: Array<{ delta?: { content?: string }; message?: { content?: string } }>;
    };
    const choice = json.choices?.[0];
    return choice?.delta?.content ?? choice?.message?.content ?? '';
  } catch {
    // 上游偶发的心跳/注释行，忽略
    return '';
  }
}

/** 把上游 SSE 流转成前端约定格式的 SSE 流 */
export function toClientSseStream(upstream: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = upstream.getReader();
      const send = (text: string) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta: { text } })}\n\n`));
      };

      let buffer = '';
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';
          for (const line of lines) {
            const delta = extractDelta(line);
            if (delta) send(delta);
          }
        }
        // 上游最后一行可能没有换行结尾
        const tail = extractDelta(buffer);
        if (tail) send(tail);
      } catch (err) {
        const reason = err instanceof Error ? err.message : '流式读取中断';
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: reason })}\n\n`));
      } finally {
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      }
    },
    cancel() {
      upstream.cancel().catch(() => { /* ignore */ });
    },
  });
}