import { useEffect, useState } from 'react';
import Layout from './components/Layout';
import FriendCard from './components/FriendCard';
import DocPage from './components/DocPage';
import { fetchFriendLinks, type FriendLinkResponse } from './api';

type Page = 'home' | 'doc';

export default function App() {
  const [page, setPage] = useState<Page>(() => {
    return location.hash === '#doc' ? 'doc' : 'home';
  });
  const [friends, setFriends] = useState<FriendLinkResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const onHash = () => setPage(location.hash === '#doc' ? 'doc' : 'home');
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    if (page === 'home' && friends.length === 0) {
      fetchFriendLinks()
        .then(setFriends)
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    }
  }, [page]);

  const apiEndpoint = `${window.location.origin}/api/friend-links`;
  const handleCopy = () => {
    navigator.clipboard.writeText(apiEndpoint);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  let content: React.ReactNode;

  if (page === 'doc') {
    content = <DocPage />;
  } else if (loading) {
    content = (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  } else if (error) {
    content = (
      <div className="text-center py-20">
        <p className="text-red-500 mb-2">加载失败</p>
        <p className="text-sm text-gray-400">{error}</p>
      </div>
    );
  } else {
    content = (
      <>
        {/* API 分发说明区 */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-gray-200/50 p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <h2 className="text-base font-semibold text-gray-800 mb-1">友链数据分发</h2>
              <p className="text-sm text-gray-500">
                通过 API 接口获取所有友链博客信息及最新文章，支持跨域调用，可直接在你的博客中接入展示。
              </p>
            </div>
            <div className="flex items-center gap-2">
              <code className="text-xs bg-gray-100 px-3 py-2 rounded-lg break-all select-all text-gray-700 max-w-xs truncate">
                {apiEndpoint}
              </code>
              <button
                onClick={handleCopy}
                className="shrink-0 px-3 py-2 text-xs font-medium rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors"
              >
                {copied ? '已复制' : '复制'}
              </button>
              <a
                href="#doc"
                className="shrink-0 px-3 py-2 text-xs font-medium rounded-lg border border-blue-500 text-blue-500 hover:bg-blue-50 transition-colors"
              >
                接入文档
              </a>
            </div>
          </div>
        </div>

        {/* 友链卡片 */}
        {friends.length === 0 ? (
          <div className="text-center py-20 text-gray-400">暂无友链数据</div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {friends.map((f) => (
              <FriendCard key={f.url} friend={f} />
            ))}
          </div>
        )}
      </>
    );
  }

  return (
    <Layout currentPage={page} onNavigate={(p) => { location.hash = p === 'doc' ? 'doc' : ''; }}>
      {content}
    </Layout>
  );
}
