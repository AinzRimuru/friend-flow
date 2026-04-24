import { Hono } from 'hono';
import type { Env } from './types';
import api from './routes/api';
import { handleScheduled } from './services/scheduler';

const app = new Hono<{ Bindings: Env }>();

// CORS
app.use('*', async (c, next) => {
  await next();
  c.header('Access-Control-Allow-Origin', '*');
  c.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  c.header('Access-Control-Allow-Headers', 'Content-Type');
});
app.options('*', (c) => c.text('', 204));

// API 路由
app.route('/api', api);

// 图片代理：重定向到图片资源地址
app.get('/images/:path{.+}', async (c) => {
  const path = c.req.param('path');
  const base = c.env.IMAGES_BASE.replace(/\/+$/, '');
  return c.redirect(`${base}/${path}`, 302);
});

// SPA 静态资源由 Cloudflare Workers Assets 自动处理
// 未匹配的路由回退到 index.html（SPA 客户端路由）
app.get('*', async (c) => {
  return c.notFound();
});

export default {
  fetch: app.fetch,

  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(handleScheduled(env));
  },
};
