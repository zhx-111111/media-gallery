# Media Gallery

基于 Cloudflare Workers 的轻量作品集站点 — 图片 / 视频 / 文字，零服务器成本。

[Demo](#) · [文档](#)

## ✨ 功能

- 🖼 图片 / 🎬 视频 / 📝 文字三种内容类型
- 🎨 Apple 静奢风设计 + 深度毛玻璃效果
- 🔗 每条内容独立 URL（`/item/自定义-slug`）
- 📊 多图画廊（竖向滑动浏览）
- 🌙 暗色模式（关闭 / 开启 / 跟随系统）
- 📱 完全响应式，移动端友好
- 🔍 SEO 字段 + RSS + Sitemap 自动生成
- 📋 复制链接、附件下载、浏览计数
- 🎯 定时发布 / 过期隐藏 / 权重排序 / 隐藏仅链接
- 🛡️ 后台密码保护 + 会话管理

## 🚀 部署（5 步，全程网页操作）

> 前提：一个 Cloudflare 账号 + 一个已托管到 CF 的域名

### 第 1 步：连接 GitHub 创建 Worker

1. 打开 [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages**
2. 点 **Create** → 选 **Workers** → **Connect to Git**
3. 授权 GitHub → 选择 `media-gallery` 仓库
4. 构建命令留空，保存并部署

### 第 2 步：创建 D1 数据库

1. **存储和数据库** → **D1 SQL 数据库** → **创建**
2. 名称填 `media_gallery_db`
3. 创建后**复制 database_id**

### 第 3 步：创建 KV 命名空间 ×2

1. **存储和数据库** → **KV** → **创建命名空间**
2. 名称填 `media_kv` → 记下 ID
3. 再创建一个，名称填 `media_cache` → 记下 ID

### 第 4 步：绑定资源到 Worker

回到 Worker → **Settings** → **Bindings**，添加三个绑定：

| 变量名称 | 类型 | 选择 |
|---------|------|------|
| `db` | D1 数据库 | `media_gallery_db` |
| `kv` | KV 命名空间 | `media_kv` |
| `cache` | KV 命名空间 | `media_cache` |

然后 **Settings** → **Variables** → 添加环境变量：

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `INIT_SECRET` | 任意随机字符串 | **必填**，初始化密钥 + 首次密码 |
| `ADMIN_PASSWORD` | 你的后台密码 | 可选，默认等于 INIT_SECRET |

### 第 5 步：初始化 + 绑定域名

1. 访问 `https://你的worker地址/api/init/你的INIT_SECRET`
2. 看到 `{"ok":true,"msg":"initialized"}` → ✅ 完成
3. **Settings** → **Custom Domains** → 添加你的域名（如 `gallery.你的域名.com`）
4. 等 1~5 分钟变 Active → 浏览器打开你的域名

## 📝 后台使用

- 访问 `/admin` → 用 `admin` + 你的密码登录
- **所有内容**：新建 / 编辑 / 删除 / 批量操作
- **上传**：上传图片和文件到 KV 存储
- **分类管理**：添加 / 重命名 / 改颜色 / 删分类
- **站点设置**：品牌名、标题、SEO、暗色模式、Hero 背景、页脚、公告、关于页、导航链接、RSS/Sitemap 开关
- **修改密码**：改后台登录密码

## 🏗️ 技术栈

| 层 | 技术 |
|----|------|
| 运行时 | Cloudflare Workers |
| 数据库 | Cloudflare D1 (SQLite) |
| 文件存储 | Cloudflare KV |
| 缓存 | Cloudflare KV |
| 前端 | 原生 JS + 内联 CSS（单文件部署） |

## 📄 License

MIT
