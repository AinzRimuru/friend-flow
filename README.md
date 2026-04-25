# Friend Flow

友链互助系统 —— 自动抓取友链博客的最新文章，提供 API 和展示页面。

**在线预览**: [friend.rimuru.work](https://friend.rimuru.work/)

**友链申请**: [AinzRimuru/friend_flow_apply](https://github.com/AinzRimuru/friend_flow_apply)

## 架构

- **后端**: Cloudflare Workers + Hono
- **数据库**: Cloudflare D1
- **前端**: React + Vite + TailwindCSS
- **配置**: GitHub 仓库托管 YAML 配置和图标资源

## 功能

- 自动从友链博客的 Atom/RSS Feed 抓取最近 10 篇文章
- 缓存 TTL 5 分钟，10s 抓取超时
- 连续失败 3 次冷却 1 小时，30 次停止请求时刷新
- 每天凌晨 1 点定时重试已停止的站点
- 图片资源通过 Worker 重定向从 GitHub Pages 透传
- 现代卡片式 SPA 展示页面

## 部署

### 1. 创建 D1 数据库

```bash
npx wrangler d1 create friend-flow-db
```

将返回的 `database_id` 填入 `wrangler.toml`。

### 2. 初始化数据库

```bash
npx wrangler d1 execute friend-flow-db --remote --file=./schema.sql
```

### 3. 配置环境变量

在 `wrangler.toml` 中设置 `GITHUB_RAW_BASE` 指向你托管友链配置的地址：

```toml
[vars]
GITHUB_RAW_BASE = "https://your-site.github.io/your-config-repo"
```

### 4. 构建前端

```bash
cd frontend && npm install && npm run build
```

### 5. 部署

```bash
npm run deploy
```

## 配置仓库

配置仓库需要包含以下结构：

```
├── friends.yaml       # 友链配置
└── icons/             # 友链图标
    ├── blog_a.png
    └── blog_b.png
```

`friends.yaml` 格式：

```yaml
- name: 博客名称
  url: https://example.com
  icon: icons/blog_a.png
  description: 博客描述
  feedUrl: ""                    # 可选，为空则自动拼接 url + "/atom.xml"
```

## API

| 接口 | 说明 |
|------|------|
| `GET /api/friend-links` | 获取友链及最近文章 |
| `GET /api/refresh-config` | 强制刷新配置缓存 |
| `GET /images/:path` | 图片代理（重定向到配置仓库） |

### GET /api/friend-links

支持以下查询参数：

| 参数 | 类型 | 说明 |
|------|------|------|
| `limit` | int | 最多返回的友链数量，不足则全部返回，超出则随机选取 |
| `exclude` | string | 排除的友链 URL，可多次传参 |

示例：

```bash
# 获取全部友链
GET /api/friend-links

# 最多返回 5 个友链（随机选取）
GET /api/friend-links?limit=5

# 排除自己的博客
GET /api/friend-links?exclude=https://blog.example.com

# 组合使用：排除两个站点，随机返回 3 个
GET /api/friend-links?limit=3&exclude=https://a.com&exclude=https://b.com
```

## 本地开发

```bash
# 安装依赖
npm install
cd frontend && npm install && npm run build && cd ..

# 初始化本地数据库
npx wrangler d1 execute friend-flow-db --local --file=./schema.sql

# 启动
npm run dev
```

访问 `http://localhost:8787` 查看效果。

## License

MIT

## 鸣谢

[LINUX DO - 新的理想型社区](https://linux.do)
