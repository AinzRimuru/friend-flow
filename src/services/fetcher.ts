import type { FriendConfig, Env } from '../types';
import { parseAtomXml } from '../utils/atom-parser';
import { shouldRefresh, recordSuccess, recordFailure } from './cache';
import { getFriendsConfig } from './config';

const MAX_CONCURRENT = 10;
const FETCH_TIMEOUT_MS = 10_000;
const MAX_ARTICLES_PER_FRIEND = 10;

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
  const toRefresh: FriendConfigWithFeed[] = [];

  for (const friend of friends) {
    const need = await shouldRefresh(env.DB, friend.url);
    if (need) toRefresh.push(friend);
  }

  // 分批并发，每批最多 MAX_CONCURRENT
  for (let i = 0; i < toRefresh.length; i += MAX_CONCURRENT) {
    const batch = toRefresh.slice(i, i + MAX_CONCURRENT);
    await Promise.allSettled(batch.map((f) => fetchAndStore(env.DB, f)));
  }
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
      'INSERT INTO articles (friend_url, title, url, publish_time) VALUES (?, ?, ?, ?)'
    );
    const batchStmts = entries.map((e) =>
      stmt.bind(friend.url, e.title, e.url, e.publishTime)
    );
    await db.batch(batchStmts);

    await recordSuccess(db, friend.url);
  } catch (err: any) {
    const isTimeout = err?.message?.includes('timeout') || err?.name === 'TimeoutError';
    await recordFailure(db, friend.url, err?.message || 'Unknown error', isTimeout);
  }
}

function fetchWithTimeout(url: string, timeoutMs: number): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  return fetch(url, { signal: controller.signal })
    .then(async (res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.text();
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
