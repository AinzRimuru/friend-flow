import type { FriendConfig, Env } from '../types';
import { getFriendsConfig } from './config';
import { refreshAllIfNeeded } from './fetcher';
import { recordSuccess, recordFailure } from './cache';
import { parseAtomXml } from '../utils/atom-parser';

const FETCH_TIMEOUT_MS = 10_000;
const MAX_ARTICLES_PER_FRIEND = 10;

/**
 * 定时任务：
 * - 每 30 分钟：刷新所有缓存过期的友链
 * - 凌晨 1 点：仅尝试被停止的站点，成功后才取消停止状态
 */
export async function handleScheduled(env: Env, cron: string): Promise<void> {
  // 凌晨 1 点（UTC 17:00，即北京时间 01:00）：仅重试被停止的站点
  if (cron === '0 17 * * *') {
    await retryStoppedSites(env);
    return;
  }

  // 每 30 分钟：常规刷新缓存过期的友链
  await refreshAllIfNeeded(env);
}

/**
 * 尝试所有被停止的站点，仅成功时取消停止状态
 */
async function retryStoppedSites(env: Env): Promise<void> {
  const friends = await getFriendsConfig(env);
  const results = await env.DB
    .prepare('SELECT friend_url FROM fetch_status WHERE stopped = 1')
    .all<{ friend_url: string }>();

  const stoppedUrls = new Set(results.results.map((r) => r.friend_url));
  const toRetry = friends.filter((f) => stoppedUrls.has(f.url));

  if (toRetry.length === 0) return;

  // 并发重试，每批最多 10 个
  for (let i = 0; i < toRetry.length; i += 10) {
    const batch = toRetry.slice(i, i + 10);
    await Promise.allSettled(batch.map((f) => retryOne(env, f)));
  }
}

async function retryOne(env: Env, friend: FriendConfig): Promise<void> {
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
    await env.DB.prepare('DELETE FROM articles WHERE friend_url = ?').bind(friend.url).run();

    if (entries.length > 0) {
      const stmt = env.DB.prepare(
        'INSERT INTO articles (friend_url, title, url, publish_time) VALUES (?, ?, ?, ?)'
      );
      await env.DB.batch(entries.map((e) => stmt.bind(friend.url, e.title, e.url, e.publishTime)));
    }

    // 成功才取消停止状态
    await recordSuccess(env.DB, friend.url);
  } catch (err: any) {
    // 失败不改变状态，保持 stopped=1
  }
}
