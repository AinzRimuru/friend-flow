interface StatusBadgeProps {
  status: string;
  lastFetchTime: string | null;
}

export default function StatusBadge({ status, lastFetchTime }: StatusBadgeProps) {
  const config: Record<string, { label: string; color: string }> = {
    ok: { label: '正常', color: 'bg-green-100 text-green-700' },
    pending: { label: '等待中', color: 'bg-yellow-100 text-yellow-700' },
    timeout: { label: '超时', color: 'bg-orange-100 text-orange-700' },
    error: { label: '异常', color: 'bg-red-100 text-red-700' },
  };

  const { label, color } = config[status] || config.pending;

  const timeStr = lastFetchTime
    ? new Date(lastFetchTime).toLocaleString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '未抓取';

  return (
    <div className="flex items-center gap-2">
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>
        {label}
      </span>
      <span className="text-xs text-gray-400">{timeStr}</span>
    </div>
  );
}
