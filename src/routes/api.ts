import { Hono } from 'hono';
import type { Env } from '../types';
import { refreshAllIfNeeded, getAllFriendData } from '../services/fetcher';
import { refreshConfig } from '../services/config';

const api = new Hono<{ Bindings: Env }>();

// 获取友链列表（查询前自动刷新过期的缓存数据）
api.get('/friend-links', async (c) => {
  await refreshAllIfNeeded(c.env);
  const data = await getAllFriendData(c.env);
  return c.json(data);
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
