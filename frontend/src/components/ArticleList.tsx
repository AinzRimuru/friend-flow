import type { ArticleResponse } from '../api';

interface ArticleListProps {
  articles: ArticleResponse[];
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const opts: Intl.DateTimeFormatOptions =
    date.getFullYear() === now.getFullYear()
      ? { month: 'short', day: 'numeric' }
      : { year: 'numeric', month: 'short', day: 'numeric' };
  return date.toLocaleDateString('zh-CN', opts);
}

export default function ArticleList({ articles }: ArticleListProps) {
  if (articles.length === 0) {
    return <p className="text-sm text-gray-400 italic">暂无文章</p>;
  }

  return (
    <ul className="space-y-1.5">
      {articles.map((article) => (
        <li key={article.url}>
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-start gap-2 text-sm text-gray-600 hover:text-blue-600 transition-colors"
          >
            <span className="shrink-0 mt-1 w-1.5 h-1.5 rounded-full bg-gray-300 group-hover:bg-blue-500 transition-colors" />
            <span className="line-clamp-1">{article.title}</span>
            <span className="shrink-0 ml-auto text-xs text-gray-400">
              {formatDate(article.publishTime)}
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}
