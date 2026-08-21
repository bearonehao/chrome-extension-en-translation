/**
 * 翻译结果数据结构（本地存储 key: lastTranslation）
 */
export interface ITranslateResult {
  /** 文章标题 */
  title: string;
  /** 作者名 */
  author: string;
  /** 原始文章 URL */
  sourceURL: string;
  /** 翻译后的 Markdown 正文 */
  markdown: string;
  /** 翻译完成时间戳 */
  timestamp: number;
}

/**
 * 打字机速度档位
 */
export enum TypewriterSpeed {
  Fast = 'fast',
  Medium = 'medium',
  Slow = 'slow',
}

/**
 * 主题模式
 */
export enum ThemeMode {
  System = 'system',
  Light = 'light',
  Dark = 'dark',
}

/**
 * 用户设置数据结构（本地存储 key: settings）
 */
export interface ISettings {
  /** API 端点地址 */
  baseURL: string;
  /** API Key */
  apiKey: string;
  /** 模型名称 */
  model: string;
  /** 自定义 System Prompt（为空时使用内置默认） */
  systemPrompt: string;
  /** 目标语言 */
  targetLanguage: string;
  /** 打字机速度 */
  typewriterSpeed: TypewriterSpeed;
  /** 字体大小（px） */
  fontSize: number;
  /** 主题模式 */
  theme: ThemeMode;
}

/**
 * 翻译流程状态机
 */
export enum TranslateStatus {
  Idle = 'idle',
  Extracting = 'extracting',
  Translating = 'translating',
  Done = 'done',
  Error = 'error',
}

/**
 * 消息通信协议类型
 */
export enum MessageType {
  ExtractContent = 'EXTRACT_CONTENT',
  ContentExtracted = 'CONTENT_EXTRACTED',
  ExtractError = 'EXTRACT_ERROR',
  TranslateRequest = 'TRANSLATE_REQUEST',
  TranslateChunk = 'TRANSLATE_CHUNK',
  TranslateComplete = 'TRANSLATE_COMPLETE',
  TranslateError = 'TRANSLATE_ERROR',
  CancelTranslate = 'CANCEL_TRANSLATE',
}
