import type { ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="bg-blur" />
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-3">
          <span className="text-2xl">🔗</span>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Friend Flow</h1>
            <p className="text-xs text-gray-400">友链互助 · 文章同步</p>
          </div>
          <a
            href="https://github.com/AinzRimuru/friend_flow_apply"
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto text-sm text-blue-500 hover:text-blue-600 transition-colors"
          >
            申请友链
          </a>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-6xl mx-auto px-4 py-8 w-full">{children}</main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-6 text-center text-xs text-gray-400">
        Friend Flow &mdash; Powered by Cloudflare Workers
      </footer>
    </div>
  );
}
