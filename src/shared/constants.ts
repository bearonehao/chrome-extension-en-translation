import { ISettings, ThemeMode, TypewriterSpeed } from './types';

/** 默认 API 端点地址（通义千问 DashScope 兼容模式） */
export const DEFAULT_BASE_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1';

/** 默认模型名称 */
export const DEFAULT_MODEL = 'qwen-plus';

/** 默认翻译 System Prompt */
export const DEFAULT_SYSTEM_PROMPT = [
  '你是一名专业的翻译助手，负责将英文文章翻译成中文。',
  '请严格遵循以下规则：',
  '1. 保持 Markdown 格式结构不变（标题、列表、引用、代码块等标记保留）。',
  '2. 代码块内容不翻译，保持原样。',
  '3. 链接 URL 不翻译，仅翻译链接显示文本。',
  '4. 图片语法 ![alt](src) 中的 alt 文本可翻译为中文，src 链接保持不变。',
  '5. 专有名词、技术术语尽量保留原文或采用业界通用译法。',
  '6. 翻译风格：准确、流畅、符合中文阅读习惯。',
  '只输出翻译后的 Markdown 内容，不要输出任何解释说明。',
].join('\n');

/** 错误码与提示文案映射 */
export const ERROR_MESSAGES = {
  AUTH_ERROR: 'API Key 无效，请检查设置',
  NETWORK_ERROR: '网络连接失败，请检查网络后重试',
  QUOTA_ERROR: 'API 额度已用完，请充值或更换 Key',
  EXTRACT_ERROR: '无法识别页面文章内容，请尝试在其他页面使用',
  TIMEOUT_ERROR: '翻译超时，请重试或更换更快的模型',
} as const;

/** Popup 面板宽度（px） */
export const POPUP_WIDTH = 420;
/** Popup 面板最大高度（px） */
export const POPUP_MAX_HEIGHT = 600;
/** 内容区最小高度（px） */
export const CONTENT_MIN_HEIGHT = 200;
/** 内容区最大高度（px） */
export const CONTENT_MAX_HEIGHT = 480;

/** 默认设置 */
export const DEFAULT_SETTINGS: ISettings = {
  baseURL: DEFAULT_BASE_URL,
  apiKey: '',
  model: DEFAULT_MODEL,
  systemPrompt: '',
  targetLanguage: '简体中文',
  typewriterSpeed: TypewriterSpeed.Medium,
  fontSize: 14,
  theme: ThemeMode.System,
};
