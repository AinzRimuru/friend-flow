import type { FriendConfig, Env } from '../types';
import { parseAtomXml } from '../utils/atom-parser';
import { shouldRefresh, recordSuccess, recordFailure } from './cache';
import { getFriendsConfig } from './config';

const MAX_CONCURRENT = 10;
const FETCH_TIMEOUT_MS = 10_000;
const MAX_ARTICLES_PER_FRIEND = 10;
const MAX_FEED_BYTES = 2 * 1024 * 1024; // 2MB，防御性上限，正常 atom feed 远小于此
const ACCEPTED_CONTENT_TYPES = [
  'application/atom+xml',
  'application/rss+xml',
  'application/xml',
  'text/xml',
];

type FriendConfigWithFeed = FriendConfig & { resolvedFeedUrl: string };

function resolveFeedUrl(friend: FriendConfig): FriendConfigWithFeed {
  return {
    ...friend,
    resolvedFeedUrl: friend.feedUrl || `${friend.url.replace(/\/+$/, '')}/atom.xml`,
  };
}

/**
 * 刷新所有需要刷新的友链文章数据
 */
export async function refreshAllIfNeeded(env: Env): Promise<void> {
  const friends = (await getFriendsConfig(env)).map(resolveFeedUrl);

  // 先清理孤儿行：友链从配置移除后残留的文章/状态行会占住 articles.url 的
  // 全局 UNIQUE 约束，导致其他友链插入相同 URL 时被 INSERT OR IGNORE 静默丢弃
  await cleanupOrphans(env.DB, friends.map((f) => f.url));

  const toRefresh: FriendConfigWithFeed[] = [];

  for (const friend of friends) {
    const need = await shouldRefresh(env.DB, friend.url);
    if (need) toRefresh.push(friend);
  }

  if (toRefresh.length === 0) {
    console.log('[refresh] no friends need refresh');
    return;
  }

  console.log(`[refresh] refreshing ${toRefresh.length} friend(s): ${toRefresh.map((f) => f.name).join(', ')}`);

  // 分批并发，每批最多 MAX_CONCURRENT
  for (let i = 0; i < toRefresh.length; i += MAX_CONCURRENT) {
    const batch = toRefresh.slice(i, i + MAX_CONCURRENT);
    await Promise.allSettled(batch.map((f) => fetchAndStore(env.DB, f)));
  }
}

/**
 * 清理孤儿行：友链从配置移除后，articles / fetch_status 中的残留行
 * 会占住 articles.url 的全局 UNIQUE 约束，导致其他友链（尤其是相对路径
 * URL 的 feed）插入相同 URL 时被 INSERT OR IGNORE 静默丢弃。
 */
async function cleanupOrphans(db: D1Database, activeUrls: string[]): Promise<void> {
  const active = new Set(activeUrls);
  const orphans = new Set<string>();

  const [articleRows, statusRows] = await Promise.all([
    db.prepare('SELECT DISTINCT friend_url FROM articles').all<{ friend_url: string }>(),
    db.prepare('SELECT friend_url FROM fetch_status').all<{ friend_url: string }>(),
  ]);
  for (const r of articleRows.results) if (!active.has(r.friend_url)) orphans.add(r.friend_url);
  for (const r of statusRows.results) if (!active.has(r.friend_url)) orphans.add(r.friend_url);

  if (orphans.size === 0) return;

  for (const url of orphans) {
    await db.prepare('DELETE FROM articles WHERE friend_url = ?').bind(url).run();
    await db.prepare('DELETE FROM fetch_status WHERE friend_url = ?').bind(url).run();
  }
  console.log(`[cleanup] removed orphan rows for: ${[...orphans].join(', ')}`);
}

/**
 * 抓取单个友链的 atom.xml 并存储文章
 */
async function fetchAndStore(db: D1Database, friend: FriendConfigWithFeed): Promise<void> {
  try {
    const xml = await fetchWithTimeout(friend.resolvedFeedUrl, FETCH_TIMEOUT_MS);
    const entries = parseAtomXml(xml).slice(0, MAX_ARTICLES_PER_FRIEND);

    if (entries.length === 0) {
      await recordSuccess(db, friend.url);
      return;
    }

    // 先删除该友链的旧文章，再插入新的
    await db.prepare('DELETE FROM articles WHERE friend_url = ?').bind(friend.url).run();

    const stmt = db.prepare(
      'INSERT OR IGNORE INTO articles (friend_url, title, url, publish_time) VALUES (?, ?, ?, ?)'
    );
    const batchStmts = entries.map((e) =>
      stmt.bind(friend.url, e.title, e.url, e.publishTime)
    );
    await db.batch(batchStmts);

    await recordSuccess(db, friend.url);
    console.log(`[fetch] ${friend.name} (${friend.resolvedFeedUrl}) -> ${entries.length} articles`);
  } catch (err: any) {
    const isTimeout = err?.message?.includes('timeout') || err?.name === 'TimeoutError';
    console.error(`[fetch] ${friend.name} (${friend.resolvedFeedUrl}) failed: ${err?.message || err}`);
    await recordFailure(db, friend.url, err?.message || 'Unknown error', isTimeout);
  }
}

export function fetchWithTimeout(url: string, timeoutMs: number): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  return fetch(url, { signal: controller.signal })
    .then(async (res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      // 校验 Content-Type，拒绝把 HTML（如 SPA 首页）当 feed 解析
      const contentType = res.headers.get('content-type') || '';
      const baseType = contentType.split(';')[0].trim().toLowerCase();
      if (!ACCEPTED_CONTENT_TYPES.includes(baseType)) {
        throw new Error(`unexpected content-type: ${contentType || '(none)'}`);
      }

      // 限制响应体大小，防止超大文档同样耗尽 CPU
      const contentLength = res.headers.get('content-length');
      if (contentLength && parseInt(contentLength, 10) > MAX_FEED_BYTES) {
        throw new Error(`feed too large (content-length): ${contentLength}`);
      }

      const text = await res.text();
      if (text.length > MAX_FEED_BYTES) {
        throw new Error(`feed too large (body): ${text.length}`);
      }
      return text;
    })
    .finally(() => clearTimeout(timer));
}

/**
 * 获取所有友链的文章和状态（用于 API 响应）
 */
export async function getAllFriendData(env: Env) {
  const imagesBase = env.IMAGES_BASE.replace(/\/+$/, '');
  const friends = await getFriendsConfig(env);
  const results = [];

  for (const friend of friends) {
    const [status, articles] = await Promise.all([
      env.DB.prepare('SELECT * FROM fetch_status WHERE friend_url = ?').bind(friend.url).first(),
      env.DB
        .prepare('SELECT * FROM articles WHERE friend_url = ? ORDER BY publish_time DESC LIMIT ?')
        .bind(friend.url, MAX_ARTICLES_PER_FRIEND)
        .all(),
    ]);

    const s = status as any;
    // icon 为相对路径时，直接拼接 CDN 地址
    const iconUrl = friend.icon.startsWith('http')
      ? friend.icon
      : `${imagesBase}/${friend.icon.replace(/^\/+/, '')}`;

    results.push({
      name: friend.name,
      url: friend.url,
      description: friend.description,
      icon: iconUrl,
      lastFetchTime: s?.last_fetch_time ?? null,
      fetchStatus: s?.status ?? 'pending',
      recentArticles: (articles.results as any[]).map((a) => ({
        title: a.title,
        url: a.url,
        publishTime: a.publish_time,
      })),
    });
  }

  return results;
}
