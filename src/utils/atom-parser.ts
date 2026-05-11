import { XMLParser } from 'fast-xml-parser';
import type { AtomEntry } from '../types';

const parser = new XMLParser({
  ignoreAttributes: false,
  processEntities: true,
  htmlEntities: true,
});

/**
 * 解析 Atom/RSS XML 字符串，提取文章条目
 */
export function parseAtomXml(xml: string): AtomEntry[] {
  const parsed = parser.parse(xml);
  const entries: AtomEntry[] = [];

  // Atom: <feed><entry>...</entry></feed>
  // RSS:  <rss><channel><item>...</item></channel></rss>
  const isAtom = !!parsed.feed;
  const items: any[] = isAtom
    ? arrayify(parsed.feed?.entry)
    : arrayify(parsed.rss?.channel?.item);

  for (const item of items) {
    const title = extractText(item.title);
    const link = isAtom ? extractAtomLink(item.link) : extractText(item.link);
    const published =
      extractText(item.published) ||
      extractText(item.updated) ||
      extractText(item.pubDate);

    if (title && link) {
      entries.push({
        title,
        url: link,
        publishTime: published || new Date().toISOString(),
      });
    }
  }

  entries.sort((a, b) => new Date(b.publishTime).getTime() - new Date(a.publishTime).getTime());
  return entries;
}

/** Atom <link href="..." /> 从属性中提取链接 */
function extractAtomLink(link: any): string | null {
  if (!link) return null;
  // 多个 <link> 时 fast-xml-parser 可能返回数组
  const links = Array.isArray(link) ? link : [link];
  // 优先取 rel="alternate"，其次取第一个
  const alt = links.find((l: any) => l['@_rel'] === 'alternate');
  const chosen = alt || links[0];
  return chosen?.['@_href'] || (typeof chosen === 'string' ? chosen : null);
}

/** 从可能是 string / { #text } 的值中提取文本 */
function extractText(val: any): string | null {
  if (!val) return null;
  if (typeof val === 'string') return val.trim();
  if (val['#text']) return String(val['#text']).trim();
  return null;
}

function arrayify<T>(val: T | T[] | undefined): T[] {
  if (!val) return [];
  return Array.isArray(val) ? val : [val];
}
