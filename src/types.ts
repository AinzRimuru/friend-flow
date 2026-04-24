// 友链配置（从 GitHub 远程加载）
export interface FriendConfig {
  name: string;
  url: string;
  icon: string;
  description: string;
  feedUrl?: string; // 可选，为空则自动拼接 url + "/atom.xml"
}

// D1 数据库中的文章记录
export interface Article {
  id: number;
  friend_url: string;
  title: string;
  url: string;
  publish_time: string;
  created_at: string;
}

// D1 数据库中的抓取状态
export interface FetchStatus {
  friend_url: string;
  last_fetch_time: string | null;
  status: 'pending' | 'ok' | 'timeout' | 'error';
  consecutive_failures: number;
  next_retry_time: string | null;
  stopped: number; // 0 or 1
  error_message: string | null;
}

// API 响应中的友链
export interface FriendLinkResponse {
  name: string;
  url: string;
  description: string;
  icon: string;
  lastFetchTime: string | null;
  fetchStatus: string;
  recentArticles: {
    title: string;
    url: string;
    publishTime: string;
  }[];
}

// Atom feed 中解析出的文章
export interface AtomEntry {
  title: string;
  url: string;
  publishTime: string;
}

// Cloudflare Workers 环境 bindings
export interface Env {
  DB: D1Database;
  GITHUB_RAW_BASE: string; // GitHub raw 基础 URL，如 https://raw.githubusercontent.com/owner/repo/branch
}
