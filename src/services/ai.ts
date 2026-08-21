import OpenAI, { APIConnectionError, APIError } from 'openai';
import { DEFAULT_SYSTEM_PROMPT, ERROR_MESSAGES } from '../shared/constants';
import { ISettings } from '../shared/types';

/**
 * 将 openai 错误转换为用户友好的中文提示
 */
function toErrorMessage(error: unknown): string {
  if (error instanceof APIConnectionError) {
    return ERROR_MESSAGES.NETWORK_ERROR;
  }
  if (error instanceof APIError) {
    if (error.status === 401 || error.status === 403) {
      return ERROR_MESSAGES.AUTH_ERROR;
    }
    if (error.status === 429) {
      return ERROR_MESSAGES.QUOTA_ERROR;
    }
  }
  return error instanceof Error ? error.message : ERROR_MESSAGES.NETWORK_ERROR;
}

/**
 * 将 Markdown 原文流式翻译为目标语言
 * 返回异步迭代器，逐 chunk 产出翻译文本增量
 */
export async function* translateStream(
  markdown: string,
  settings: ISettings
): AsyncGenerator<string> {
  const client = new OpenAI({
    baseURL: settings.baseURL,
    apiKey: settings.apiKey,
    dangerouslyAllowBrowser: true,
  });

  const systemPrompt = settings.systemPrompt || DEFAULT_SYSTEM_PROMPT;

  try {
    const stream = await client.chat.completions.create({
      model: settings.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: markdown },
      ],
      stream: true,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        yield delta;
      }
    }
  } catch (error) {
    throw new Error(toErrorMessage(error));
  }
}
