import type { AtomEntry } from '../types';

/**
 * 解析 Atom XML 字符串，提取文章条目
 */
export function parseAtomXml(xml: string): AtomEntry[] {
  const entries: AtomEntry[] = [];

  // 使用正则解析 XML（Workers 环境无 DOM API）
  const entryRegex = /<entry[\s>]/g;
  let match: RegExpExecArray | null;

  const entryStrings: string[] = [];
  let searchStart = 0;

  while ((match = entryRegex.exec(xml)) !== null) {
    if (searchStart > 0) {
      entryStrings.push(xml.substring(searchStart, match.index));
    }
    searchStart = match.index;
  }
  if (searchStart > 0 && searchStart < xml.length) {
    entryStrings.push(xml.substring(searchStart));
  }

  // 也尝试 <item> (RSS 2.0 格式)
  if (entryStrings.length === 0) {
    const itemRegex = /<item[\s>]/g;
    let itemMatch: RegExpExecArray | null;
    let itemStart = 0;

    while ((itemMatch = itemRegex.exec(xml)) !== null) {
      if (itemStart > 0) {
        entryStrings.push(xml.substring(itemStart, itemMatch.index));
      }
      itemStart = itemMatch.index;
    }
    if (itemStart > 0 && itemStart < xml.length) {
      entryStrings.push(xml.substring(itemStart));
    }
  }

  for (const entryStr of entryStrings) {
    const title = extractTag(entryStr, 'title');
    const link = extractLink(entryStr);
    const published = extractTag(entryStr, 'published') || extractTag(entryStr, 'updated') || extractTag(entryStr, 'pubDate');

    if (title && link) {
      entries.push({
        title: decodeEntities(title),
        url: link,
        publishTime: published || new Date().toISOString(),
      });
    }
  }

  // 按发布时间降序排序
  entries.sort((a, b) => new Date(b.publishTime).getTime() - new Date(a.publishTime).getTime());

  return entries;
}

function extractTag(xml: string, tag: string): string | null {
  const regex = new RegExp(`<${tag}[^>]*>([^<]*(?:<(?!/${tag}>)[^>]*)*?)</${tag}>`, 's');
  const match = regex.exec(xml);
  return match ? match[1].trim() : null;
}

function extractLink(xml: string): string | null {
  // Atom: <link href="..." rel="alternate" />
  const hrefMatch = /<link[^>]+href=["']([^"']+)["'][^>]*(?:rel=["']alternate["'])?/i.exec(xml);
  if (hrefMatch) return hrefMatch[1];

  // 也可试试 <link>alternate|...</link>
  const linkMatch = /<link>([^<]+)<\/link>/i.exec(xml);
  if (linkMatch) return linkMatch[1].trim();

  return null;
}

function decodeEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
}
