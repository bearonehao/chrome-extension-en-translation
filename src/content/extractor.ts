import { Readability } from '@mozilla/readability';
import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';
import { ITranslateResult } from '../shared/types';
import { extractAuthor, extractTitle, extractURL } from './metadata';

/**
 * 创建并配置 TurndownService 实例
 */
function createTurndownService(): TurndownService {
  const service = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    bulletListMarker: '-',
    emDelimiter: '*',
    strongDelimiter: '**',
  });

  // 集成 GFM 扩展（表格、删除线、任务列表）
  service.use(gfm);

  // 图片处理：转换为绝对 URL 的 ![alt](src)
  service.addRule('image', {
    filter: 'img',
    replacement: (_content, node) => {
      const img = node as HTMLImageElement;
      const alt = img.getAttribute('alt') || '';
      const src = img.getAttribute('src') || '';
      const absoluteSrc = src ? new URL(src, window.location.href).href : '';
      return `![${alt}](${absoluteSrc})`;
    },
  });

  return service;
}

/**
 * 提取当前页面文章内容并转换为 Markdown
 */
export function extractContent(): ITranslateResult {
  const article = new Readability(document.cloneNode(true) as Document).parse();
  const content = article?.content;

  if (!content) {
    throw new Error('无法识别页面文章内容');
  }

  const markdown = createTurndownService().turndown(content);

  return {
    title: extractTitle(article?.title),
    author: extractAuthor(article?.byline),
    sourceURL: extractURL(),
    markdown,
    timestamp: Date.now(),
  };
}
