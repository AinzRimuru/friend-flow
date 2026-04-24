import { useState } from 'react';

const API_BASE = window.location.origin;

const CODE_JS = `// 获取全部友链
fetch("${API_BASE}/api/friend-links")
  .then(res => res.json())
  .then(data => console.log(data));

// 获取 5 个随机友链，排除自己的博客
fetch("${API_BASE}/api/friend-links?limit=5&exclude=https://your.blog.com")
  .then(res => res.json())
  .then(data => console.log(data));`;

const CODE_HTML = '<div id="friend-links"></div>\n' +
'<script>\n' +
'fetch("' + API_BASE + '/api/friend-links")\n' +
'  .then(r => r.json())\n' +
'  .then(friends => {\n' +
'    const html = friends.map(f =>\n' +
'      `<div class="friend-card">\n' +
'        <img src="' + API_BASE + '${f.icon}" alt="${f.name}">\n' +
'        <a href="${f.url}">${f.name}</a>\n' +
'        <p>${f.description}</p>\n' +
'        <ul>${f.recentArticles.map(a =>\n' +
'          `<li><a href="${a.url}">${a.title}</a></li>`\n' +
'        ).join(")}</ul>\n' +
'      </div>`\n' +
'    ).join("");\n' +
'    document.getElementById("friend-links").innerHTML = html;\n' +
'  });\n' +
'</script>';

const CODE_RESPONSE = `GET ${API_BASE}/api/friend-links

[
  {
    "name": "博客名称",
    "url": "https://example.com",
    "description": "博客描述",
    "icon": "/images/icons/blog.png",
    "lastFetchTime": "2026-04-24T12:00:00.000Z",
    "fetchStatus": "ok",
    "recentArticles": [
      {
        "title": "文章标题",
        "url": "https://example.com/post/1",
        "publishTime": "2026-04-24T10:00:00.000Z"
      }
    ]
  }
]`;

function CodeBlock({ children }: { children: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      <pre className="bg-gray-900/90 backdrop-blur-md text-gray-100 rounded-lg p-4 text-sm overflow-x-auto">
        <code>{children}</code>
      </pre>
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 px-2 py-1 text-xs rounded bg-gray-700 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        {copied ? '已复制' : '复制'}
      </button>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-lg font-semibold text-gray-800 mb-3">{title}</h2>
      {children}
    </section>
  );
}

export default function DocPage() {
  return (
    <div className="max-w-3xl mx-auto bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-sm border border-gray-200/50">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">接入文档</h1>

      <Section title="接口概览">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 pr-4 font-medium text-gray-600">方法</th>
                <th className="text-left py-2 pr-4 font-medium text-gray-600">路径</th>
                <th className="text-left py-2 font-medium text-gray-600">说明</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr>
                <td className="py-2 pr-4"><code className="text-green-600">GET</code></td>
                <td className="py-2 pr-4"><code>/api/friend-links</code></td>
                <td className="py-2 text-gray-600">获取友链及最近文章列表</td>
              </tr>
              <tr>
                <td className="py-2 pr-4"><code className="text-green-600">GET</code></td>
                <td className="py-2 pr-4"><code>/api/refresh-config</code></td>
                <td className="py-2 text-gray-600">强制刷新配置缓存</td>
              </tr>
              <tr>
                <td className="py-2 pr-4"><code className="text-green-600">GET</code></td>
                <td className="py-2 pr-4"><code>/images/:path</code></td>
                <td className="py-2 text-gray-600">图片代理（302 重定向）</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="GET /api/friend-links">
        <p className="text-sm text-gray-600 mb-3">
          返回所有友链信息及每个友链最近 10 篇文章，支持跨域请求。
        </p>

        <h3 className="text-sm font-medium text-gray-700 mb-2">查询参数</h3>
        <div className="overflow-x-auto mb-4">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 pr-4 font-medium text-gray-600">参数</th>
                <th className="text-left py-2 pr-4 font-medium text-gray-600">类型</th>
                <th className="text-left py-2 font-medium text-gray-600">说明</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr>
                <td className="py-2 pr-4"><code>limit</code></td>
                <td className="py-2 pr-4 text-gray-500">int</td>
                <td className="py-2 text-gray-600">最多返回的友链数量，超出则随机选取</td>
              </tr>
              <tr>
                <td className="py-2 pr-4"><code>exclude</code></td>
                <td className="py-2 pr-4 text-gray-500">string</td>
                <td className="py-2 text-gray-600">排除的友链 URL，可多次传参</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 className="text-sm font-medium text-gray-700 mb-2">响应示例</h3>
        <CodeBlock>{CODE_RESPONSE}</CodeBlock>
      </Section>

      <Section title="接入示例">
        <h3 className="text-sm font-medium text-gray-700 mb-2">JavaScript</h3>
        <CodeBlock>{CODE_JS}</CodeBlock>

        <h3 className="text-sm font-medium text-gray-700 mt-4 mb-2">HTML + CSS</h3>
        <CodeBlock>{CODE_HTML}</CodeBlock>
      </Section>

      <Section title="排除自己的博客">
        <p className="text-sm text-gray-600 mb-3">
          如果你不希望在展示中看到自己的站点，使用 <code className="bg-gray-100 px-1 rounded">exclude</code> 参数：
        </p>
        <CodeBlock>{`GET ${API_BASE}/api/friend-links?exclude=https://your.blog.com`}</CodeBlock>
      </Section>

      <Section title="随机展示">
        <p className="text-sm text-gray-600 mb-3">
          使用 <code className="bg-gray-100 px-1 rounded">limit</code> 参数控制返回数量，超出时随机选取：
        </p>
        <CodeBlock>{`// 随机返回 5 个友链
GET ${API_BASE}/api/friend-links?limit=5

// 随机 3 个，排除自己
GET ${API_BASE}/api/friend-links?limit=3&exclude=https://your.blog.com`}</CodeBlock>
      </Section>
    </div>
  );
}
