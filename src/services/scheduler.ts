import type { FriendConfig, Env } from '../types';
import { resetStoppedSites } from './cache';
import { getFriendsConfig } from './config';
import { parseAtomXml } from '../utils/atom-parser';

const FETCH_TIMEOUT_MS = 10_000;
const MAX_ARTICLES_PER_FRIEND = 10;

/**
 * 定时任务：凌晨 1 点重试所有停止抓取的站点
 */
export async function handleScheduled(env: Env): Promise<void> {
  const resetUrls = await resetStoppedSites(env.DB);

  if (resetUrls.length === 0) return;

  const friends = await getFriendsConfig(env);
  const toRetry = friends.filter((f) => resetUrls.includes(f.url));

  // 并发重试，每批最多 10 个
  for (let i = 0; i < toRetry.length; i += 10) {
    const batch = toRetry.slice(i, i + 10);
    await Promise.allSettled(batch.map((f) => retryFetch(env.DB, f)));
  }
}

async function retryFetch(db: D1Database, friend: FriendConfig): Promise<void> {
  const feedUrl = friend.feedUrl || `${friend.url.replace(/\/+$/, '')}/atom.xml`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const res = await fetch(feedUrl, { signal: controller.signal });
    clearTimeout(timer);

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const xml = await res.text();
    const entries = parseAtomXml(xml).slice(0, MAX_ARTICLES_PER_FRIEND);

    // 更新文章
    await db.prepare('DELETE FROM articles WHERE friend_url = ?').bind(friend.url).run();

    if (entries.length > 0) {
      const stmt = db.prepare(
        'INSERT INTO articles (friend_url, title, url, publish_time) VALUES (?, ?, ?, ?)'
      );
      await db.batch(entries.map((e) => stmt.bind(friend.url, e.title, e.url, e.publishTime)));
    }

    // 标记成功
    const now = new Date().toISOString();
    await db
      .prepare(
        `UPDATE fetch_status SET last_fetch_time = ?, status = 'ok', consecutive_failures = 0, next_retry_time = NULL, stopped = 0, error_message = NULL WHERE friend_url = ?`
      )
      .bind(now, friend.url)
      .run();
  } catch (err: any) {
    // 重试失败，递增计数但不重新设置 stopped（下次定时任务再来）
    await db
      .prepare(
        `UPDATE fetch_status SET consecutive_failures = consecutive_failures + 1, error_message = ? WHERE friend_url = ?`
      )
      .bind(err?.message || 'Unknown error', friend.url)
      .run();
  }
}
