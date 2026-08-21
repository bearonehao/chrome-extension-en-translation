import { MessageType } from '../shared/types';
import { extractContent } from './extractor';

/**
 * 监听消息，响应内容提取请求
 */
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === MessageType.ExtractContent) {
    try {
      const result = extractContent();
      sendResponse({ type: MessageType.ContentExtracted, data: result });
    } catch (error) {
      sendResponse({
        type: MessageType.ExtractError,
        error: error instanceof Error ? error.message : '内容提取失败',
      });
    }
  }
  return false;
});
