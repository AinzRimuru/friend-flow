import type { FriendLinkResponse } from '../api';
import StatusBadge from './StatusBadge';
import ArticleList from './ArticleList';

interface FriendCardProps {
  friend: FriendLinkResponse;
}

export default function FriendCard({ friend }: FriendCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
      {/* 头部：图标 + 名称 + 状态 */}
      <div className="flex items-start gap-3 mb-4">
        <img
          src={friend.icon}
          alt={friend.name}
          className="w-10 h-10 rounded-lg object-cover bg-gray-100 shrink-0"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect fill="%23e5e7eb" width="40" height="40" rx="8"/><text x="50%" y="55%" text-anchor="middle" dy=".3em" fill="%239ca3af" font-size="18">?</text></svg>';
          }}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-0.5">
            <a
              href={friend.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-gray-900 hover:text-blue-600 transition-colors truncate"
            >
              {friend.name}
            </a>
            <StatusBadge status={friend.fetchStatus} lastFetchTime={friend.lastFetchTime} />
          </div>
          {friend.description && (
            <p className="text-sm text-gray-500 line-clamp-1">{friend.description}</p>
          )}
        </div>
      </div>

      {/* 最近文章 */}
      <ArticleList articles={friend.recentArticles} />
    </div>
  );
}
