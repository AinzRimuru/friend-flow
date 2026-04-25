import { Hono } from 'hono';
import type { Env } from '../types';
import { getAllFriendData } from '../services/fetcher';
import { refreshConfig } from '../services/config';

const api = new Hono<{ Bindings: Env }>();

// 获取友链列表（直接返回 D1 缓存数据，刷新由定时任务处理）
// ?limit=N        最多返回 N 个友链（随机选取）
// &exclude=url    排除指定友链（可多次传参，如 &exclude=url1&exclude=url2）
api.get('/friend-links', async (c) => {

  let exclude: string[] = [];
  const excludeParam = c.req.queries('exclude');
  if (excludeParam) {
    exclude = excludeParam.map((u) => u.replace(/\/+$/, ''));
  }

  const limitParam = c.req.query('limit');
  const limit = limitParam ? parseInt(limitParam, 10) : 0;

  const data = await getAllFriendData(c.env);

  // 排除指定的友链
  const filtered = data.filter((f) => !exclude.includes(f.url.replace(/\/+$/, '')));

  // 随机选取
  if (limit > 0 && limit < filtered.length) {
    const shuffled = [...filtered].sort(() => Math.random() - 0.5);
    return c.json(shuffled.slice(0, limit));
  }

  return c.json(filtered);
});

// 强制刷新配置缓存（从 GitHub 重新拉取 friends.json）
api.get('/refresh-config', async (c) => {
  try {
    const config = await refreshConfig(c.env);
    return c.json({
      success: true,
      count: config.length,
      message: `已刷新配置，共 ${config.length} 个友链`,
    });
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 500);
  }
});

export default api;
