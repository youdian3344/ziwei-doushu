/**
 * lib/ai/provider —— AI 模型服务的环境变量解析
 *
 * 开源版原本不含任何 /api/* 后端接口，本模块为自建的解读接口提供统一的模型服务配置。
 * 全部按 OpenAI 兼容协议调用（POST {baseUrl}/chat/completions），支持四种配置方式：
 *
 *   1. AI_PROVIDER=deepseek（默认）：DEEPSEEK_API_KEY
 *      可选覆盖 DEEPSEEK_BASE_URL / DEEPSEEK_MODEL
 *   2. AI_PROVIDER=mimo：MIMO_API_KEY / MIMO_BASE_URL / MIMO_MODEL
 *   3. AI_PROVIDER=openai：OPENAI_API_KEY
 *      可选覆盖 OPENAI_BASE_URL / OPENAI_MODEL
 *   4. AI_PROVIDER=<其他名称>：<名称>_API_KEY / <名称>_BASE_URL / <名称>_MODEL
 *
 * 通用覆盖项优先级最高，可用于任意 provider：AI_API_KEY / AI_BASE_URL / AI_MODEL
 *
 * 安全约束：密钥只从环境变量读取，不落盘、不进日志、不在响应里回显。
 */

export interface AiProviderConfig {
  provider: string;
  apiKey: string;
  baseUrl: string;
  model: string;
}

/** 读取第一个非空环境变量 */
function readEnv(...names: string[]): string {
  for (const name of names) {
    const value = process.env[name];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

/** 内置默认端点与模型（只在对应的 provider 下生效，可被环境变量覆盖） */
const BUILTIN: Record<string, { baseUrl: string; model: string }> = {
  deepseek: { baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
  openai: { baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
};

/**
 * 解析当前生效的模型服务配置；缺少必需项时返回 null。
 * 注意：只有同时拿到 apiKey / baseUrl / model 才算配置完整，
 * 避免半配置状态下把占位值当成真实密钥发往上游。
 */
export function resolveAiProvider(): AiProviderConfig | null {
  const provider = (readEnv('AI_PROVIDER') || 'deepseek').toLowerCase();
  const envPrefix = provider.toUpperCase().replace(/[^A-Z0-9]+/g, '_');

  let apiKey = '';
  let baseUrl = '';
  let model = '';

  if (provider === 'deepseek' || provider === 'openai') {
    apiKey = readEnv(`${envPrefix}_API_KEY`);
    baseUrl = readEnv(`${envPrefix}_BASE_URL`) || BUILTIN[provider].baseUrl;
    model = readEnv(`${envPrefix}_MODEL`) || BUILTIN[provider].model;
  } else if (provider === 'mimo') {
    // MIMO 没有固定端点，三项都必须由环境变量给出
    apiKey = readEnv('MIMO_API_KEY');
    baseUrl = readEnv('MIMO_BASE_URL');
    model = readEnv('MIMO_MODEL');
  } else {
    // 自定义 provider：按 provider 名派生的变量名查找
    apiKey = readEnv(`${envPrefix}_API_KEY`, 'CUSTOM_API_KEY');
    baseUrl = readEnv(`${envPrefix}_BASE_URL`, 'CUSTOM_BASE_URL');
    model = readEnv(`${envPrefix}_MODEL`, 'CUSTOM_MODEL');
  }

  // 通用覆盖项（任意 provider 都可用，优先级最高）
  apiKey = readEnv('AI_API_KEY') || apiKey;
  baseUrl = readEnv('AI_BASE_URL') || baseUrl;
  model = readEnv('AI_MODEL') || model;

  if (!apiKey || !baseUrl || !model) return null;

  return {
    provider,
    apiKey,
    baseUrl: baseUrl.replace(/\/+$/, ''),
    model,
  };
}

/** 配置缺失时返回给前端的提示，说明该去哪里补配置 */
export function missingConfigMessage(): string {
  const provider = (readEnv('AI_PROVIDER') || 'deepseek').toLowerCase();
  const keyName = provider === 'mimo' ? 'MIMO_API_KEY' : `${provider.toUpperCase()}_API_KEY`;
  return `未检测到完整的 AI 模型配置：请在项目根目录 .env.local 中设置 AI_PROVIDER 与 ${keyName}`
    + '（以及 MIMO/自定义服务所需的 _BASE_URL、_MODEL），保存后重启 npm run dev。';
}