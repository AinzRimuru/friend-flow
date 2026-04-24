import { useEffect, useState } from 'react';
import Layout from './components/Layout';
import FriendCard from './components/FriendCard';
import { fetchFriendLinks, type FriendLinkResponse } from './api';

export default function App() {
  const [friends, setFriends] = useState<FriendLinkResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchFriendLinks()
      .then(setFriends)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  let content: React.ReactNode;

  if (loading) {
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
  } else if (friends.length === 0) {
    content = (
      <div className="text-center py-20 text-gray-400">
        暂无友链数据
      </div>
    );
  } else {
    content = (
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {friends.map((f) => (
          <FriendCard key={f.url} friend={f} />
        ))}
      </div>
    );
  }

  return <Layout>{content}</Layout>;
}
