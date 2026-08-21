/**
 * 提取文章标题
 * 优先级：og:title → <title> → Readability.title
 */
export function extractTitle(articleTitle?: string | null): string {
  const ogTitle = document
    .querySelector('meta[property="og:title"]')
    ?.getAttribute('content')
    ?.trim();
  if (ogTitle) return ogTitle;

  const titleTag = document.querySelector('title')?.textContent?.trim();
  if (titleTag) return titleTag;

  if (articleTitle) return articleTitle;
  return '';
}

/**
 * 提取文章作者
 * 优先级：article:author → author meta → Readability.byline → "未知作者"
 */
export function extractAuthor(articleByline?: string | null): string {
  const articleAuthor = document
    .querySelector('meta[name="article:author"]')
    ?.getAttribute('content')
    ?.trim();
  if (articleAuthor) return articleAuthor;

  const author = document.querySelector('meta[name="author"]')?.getAttribute('content')?.trim();
  if (author) return author;

  if (articleByline) return articleByline;
  return '未知作者';
}

/**
 * 提取当前页面完整 URL
 */
export function extractURL(): string {
  return window.location.href;
}
