export interface ArticleResponse {
  title: string;
  url: string;
  publishTime: string;
}

export interface FriendLinkResponse {
  name: string;
  url: string;
  description: string;
  icon: string;
  lastFetchTime: string | null;
  fetchStatus: string;
  recentArticles: ArticleResponse[];
}

export async function fetchFriendLinks(): Promise<FriendLinkResponse[]> {
  const res = await fetch('/api/friend-links');
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}
