import yaml from 'js-yaml';
import type { FriendConfig } from '../types';

let cachedConfig: FriendConfig[] | null = null;
let cacheTime = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 分钟

/**
 * 从 GitHub 获取友链配置，优先使用缓存
 */
export async function getFriendsConfig(env: { GITHUB_RAW_BASE: string }): Promise<FriendConfig[]> {
  const now = Date.now();
  if (cachedConfig && now - cacheTime < CACHE_TTL_MS) {
    return cachedConfig;
  }
  return refreshConfig(env);
}

/**
 * 强制刷新配置缓存（从 GitHub 重新拉取）
 */
export async function refreshConfig(env: { GITHUB_RAW_BASE: string }): Promise<FriendConfig[]> {
  const base = env.GITHUB_RAW_BASE.replace(/\/+$/, '');
  const url = `${base}/friends.yaml`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);

  const res = await fetch(url, {
    headers: { 'User-Agent': 'FriendFlow-Worker' },
    signal: controller.signal,
  }).finally(() => clearTimeout(timer));

  if (!res.ok) {
    // 如果有旧缓存，降级使用；否则返回空列表
    return cachedConfig ?? [];
  }

  const text = await res.text();
  const config = yaml.load(text) as FriendConfig[];
  cachedConfig = config;
  cacheTime = Date.now();
  return config;
}

/**
 * 获取 GitHub raw 基础 URL
 */
export function getRawBase(env: { GITHUB_RAW_BASE: string }): string {
  return env.GITHUB_RAW_BASE.replace(/\/+$/, '');
}
