import type { FetchStatus, Env } from '../types';

const CACHE_TTL_MS = 5 * 60 * 1000;         // 5 分钟
const COOLDOWN_FAILURES = 3;                  // 连续失败 3 次进入冷却
const COOLDOWN_DURATION_MS = 60 * 60 * 1000;  // 1 小时
const STOP_FAILURES = 30;                     // 连续失败 30 次停止请求时刷新

/**
 * 判断某个友链是否需要刷新
 */
export async function shouldRefresh(db: D1Database, friendUrl: string): Promise<boolean> {
  const status = await getFetchStatus(db, friendUrl);
  if (!status) return true; // 无记录，需要抓取

  // 已停止请求时刷新
  if (status.stopped) return false;

  // 在冷却期内
  if (status.next_retry_time && new Date(status.next_retry_time) > new Date()) {
    return false;
  }

  // 缓存未过期
  if (status.last_fetch_time) {
    const elapsed = Date.now() - new Date(status.last_fetch_time).getTime();
    if (elapsed < CACHE_TTL_MS) return false;
  }

  return true;
}

/**
 * 记录抓取成功
 */
export async function recordSuccess(db: D1Database, friendUrl: string): Promise<void> {
  const now = new Date().toISOString();
  await db
    .prepare(
      `INSERT INTO fetch_status (friend_url, last_fetch_time, status, consecutive_failures, next_retry_time, stopped, error_message)
       VALUES (?, ?, 'ok', 0, NULL, 0, NULL)
       ON CONFLICT(friend_url) DO UPDATE SET
         last_fetch_time = ?,
         status = 'ok',
         consecutive_failures = 0,
         next_retry_time = NULL,
         stopped = 0,
         error_message = NULL`
    )
    .bind(friendUrl, now, now)
    .run();
}

/**
 * 记录抓取失败
 */
export async function recordFailure(
  db: D1Database,
  friendUrl: string,
  errorMessage: string,
  isTimeout: boolean
): Promise<void> {
  const status = await getFetchStatus(db, friendUrl);
  const failures = (status?.consecutive_failures ?? 0) + 1;
  const now = new Date();

  let nextRetryTime: string | null = null;
  let stopped = 0;

  if (failures >= STOP_FAILURES) {
    stopped = 1;
  } else if (failures >= COOLDOWN_FAILURES) {
    nextRetryTime = new Date(now.getTime() + COOLDOWN_DURATION_MS).toISOString();
  }

  await db
    .prepare(
      `INSERT INTO fetch_status (friend_url, last_fetch_time, status, consecutive_failures, next_retry_time, stopped, error_message)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(friend_url) DO UPDATE SET
         status = ?,
         consecutive_failures = ?,
         next_retry_time = ?,
         stopped = ?,
         error_message = ?`
    )
    .bind(
      friendUrl, now.toISOString(), isTimeout ? 'timeout' : 'error', failures, nextRetryTime, stopped, errorMessage,
      isTimeout ? 'timeout' : 'error', failures, nextRetryTime, stopped, errorMessage
    )
    .run();
}

/**
 * 重置已停止的站点（由定时任务调用）
 */
export async function resetStoppedSites(db: D1Database): Promise<string[]> {
  const results = await db
    .prepare(`SELECT friend_url FROM fetch_status WHERE stopped = 1 OR (next_retry_time IS NOT NULL AND next_retry_time > ?)`)
    .bind(new Date().toISOString())
    .all<{ friend_url: string }>();

  const urls = results.results.map((r) => r.friend_url);

  if (urls.length > 0) {
    await db
      .prepare(`UPDATE fetch_status SET stopped = 0, consecutive_failures = 0, next_retry_time = NULL, status = 'pending' WHERE stopped = 1`)
      .run();
  }

  return urls;
}

export async function getFetchStatus(db: D1Database, friendUrl: string): Promise<FetchStatus | null> {
  return db
    .prepare('SELECT * FROM fetch_status WHERE friend_url = ?')
    .bind(friendUrl)
    .first<FetchStatus>();
}
