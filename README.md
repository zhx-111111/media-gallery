# 🖼️ Media Gallery — Cloudflare 媒体展示网站

基于 **Cloudflare Workers + D1 + R2 + KV** 的零成本媒体展示网站，支持图片、视频、文字的展示与管理。

## ✨ 功能特性

### 前台展示
- 🖼️ **图片展示** — 瀑布流网格布局，支持缩略图懒加载
- 🎬 **视频播放** — 原生 HTML5 视频播放器
- 📝 **文字内容** — 富文本展示，支持换行
- 🔍 **搜索筛选** — 按类型、关键词实时搜索
- 📱 **响应式设计** — 完美适配手机、平板、桌面
- 🌙 **暗色主题** — 护眼暗色 UI，现代感十足

### 后台管理
- 🔐 **登录鉴权** — Cookie 会话管理，7天自动过期
- ➕ **添加内容** — 支持图片/视频上传、文字编辑
- ✏️ **编辑内容** — 修改标题、描述、标签、可见性等
- 🗑️ **删除/批量删除** — 删除时自动清理 R2 文件
- 🏷️ **标签系统** — 逗号分隔的多标签管理
- 📊 **统计面板** — 实时显示各类型内容数量
- 📤 **拖拽上传** — 支持拖拽 + 点击上传，带进度条
- 🔒 **私有/公开** — 控制内容是否在前台展示

## 🏗️ 技术架构

```
┌─────────────────────────────────────────────┐
│          Cloudflare Pages (前端)           │
│     纯静态 HTML/CSS/JS，零成本托管         │
└──────────────────┬──────────────────────────┘
                   │ API 调用
                   ▼
┌─────────────────────────────────────────────┐
│         Cloudflare Worker (后端)            │
│   路由分发 + 鉴权 + 业务逻辑 + 文件代理     │
└──────┬──────────────┬──────────────┬────────┘
       │              │              │
       ▼              ▼              ▼
┌──────────┐  ┌──────────┐  ┌──────────┐
│  D1      │  │  R2      │  │  KV      │
│  SQLite  │  │  对象存储 │  │  会话缓存 │
│  元数据   │  │  媒体文件 │  │  登录态   │
└──────────┘  └──────────┘  └──────────┘
```

## 🚀 部署指南

### 前置要求
- Cloudflare 账户（免费版即可）
- Node.js >= 18
- npm 或 pnpm

### 第一步：创建 Cloudflare 资源

#### 1. 创建 D1 数据库
```bash
cd media-gallery
npx wrangler d1 create media_gallery_db
```
记录输出的 `database_id`，填入 `wrangler.toml` 的 `database_id` 字段。

#### 2. 创建 R2 存储桶
```bash
npx wrangler r2 bucket create media-gallery-bucket
```

#### 3. 创建 KV 命名空间
```bash
npx wrangler kv namespace create CACHE
```
记录输出的 ID，填入 `wrangler.toml` 的 KV `id` 字段。

### 第二步：执行数据库迁移

```bash
# 本地测试
npx wrangler d1 migrations apply media_gallery_db --local

# 生产环境
npx wrangler d1 migrations apply media_gallery_db
```

### 第三步：修改配置

编辑 `wrangler.toml`：
- 将 `REPLACE_WITH_YOUR_D1_DATABASE_ID` 替换为实际的 D1 数据库 ID
- 将 `REPLACE_WITH_YOUR_KV_NAMESPACE_ID` 替换为实际的 KV 命名空间 ID
- 修改 `ADMIN_PASSWORD` 为你自己的强密码（或使用默认的 admin/admin123 登录后修改）

> **默认管理员账号**: `admin` / `admin123`
> 密码哈希在迁移文件中，建议部署后立即修改。

### 第四步：部署

```bash
# 安装依赖
npm install

# 部署到 Cloudflare
npm run deploy
```

部署成功后，你会获得一个 `*.workers.dev` 的域名。

### 第五步（可选）：绑定自定义域名

在 Cloudflare Dashboard → Workers & Pages → 你的 Worker → 设置 → 触发器 → 自定义域，添加你的域名。

## 📂 项目结构

```
media-gallery/
├── src/
│   └── worker.js          # Worker 主文件（含所有 API + 前端页面）
├── migrations/
│   └── 0001_init.sql     # D1 数据库初始化 SQL
├── wrangler.toml          # Cloudflare Worker 配置
├── package.json           # 项目依赖
└── README.md              # 本文件
```

## 🔌 API 接口文档

### 认证
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/login` | 管理员登录 |
| POST | `/api/logout` | 退出登录 |
| GET  | `/api/auth/check` | 检查登录状态 |

### 媒体内容
| 方法 | 路径 | 说明 |
|------|------|------|
| GET    | `/api/media?page=1&pageSize=24&type=image&search=关键词` | 列表查询 |
| GET    | `/api/media/:id` | 获取单条详情 |
| POST   | `/api/media` | 创建内容 |
| PUT    | `/api/media/:id` | 更新内容 |
| DELETE | `/api/media/:id` | 删除内容 |
| POST   | `/api/media/batch-delete` | 批量删除 |

### 文件上传
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/upload` | 上传文件到 R2（form-data，字段名 `file`） |

### 文件代理
| 方法 | 路径 | 说明 |
|------|------|------|
| GET  | `/file/:key` | 从 R2 读取文件并代理返回 |

## 💰 成本估算

Cloudflare 免费额度完全够个人使用：

| 资源 | 免费额度 | 个人使用预估 |
|------|---------|------------|
| Workers | 10万次/天 | ✅ 绰绰有余 |
| D1 | 5GB 存储 + 500万次读/月 | ✅ 足够 |
| R2 | 10GB 存储 + 100万次 A 类操作 + 1000万次 B 类操作 | ✅ 足够 |
| KV | 1GB 存储 | ✅ 足够 |

> **核心优势**：R2 的 **出口流量免费**，不像 AWS S3 那样按流量收费！

## 🔧 使用说明

### 首次登录
1. 访问 `https://你的域名/login`
2. 输入用户名 `admin`，密码 `admin123`
3. 登录后进入管理后台

### 添加图片/视频
1. 在管理后台点击 **"添加内容"**
2. 选择类型（图片/视频）
3. 填写标题
4. 拖拽或点击上传文件
5. 可选填写描述、标签
6. 点击保存

### 添加文字内容
1. 点击 **"添加内容"**
2. 选择类型 **"文字"**
3. 填写标题和文字内容
4. 保存

### 修改管理员密码
在 D1 控制台执行：
```sql
-- 生成新密码的 SHA-256 哈希后更新
UPDATE admins SET password_hash = '新哈希值' WHERE username = 'admin';
```

生成哈希的方法（浏览器控制台）：
```javascript
crypto.subtle.digest('SHA-256', new TextEncoder().encode('新密码'))
  .then(h => Array.from(new Uint8Array(h)).map(b => b.toString(16).padStart(2,'0')).join(''));
```

## 🛡️ 安全建议

1. **修改默认密码** — 部署后立即修改 admin 密码
2. **绑定自定义域名** — 避免使用 `*.workers.dev` 暴露账户信息
3. **开启 Cloudflare Access** — 对 `/admin` 路径增加额外保护
4. **设置 R2 存储桶为私有** — 本项目通过 Worker 代理访问，无需公开桶
5. **定期备份 D1** — 使用 `wrangler d1 time-travel` 功能

## 📝 License

MIT License
