# Media Gallery — Cloudflare 媒体展示网站 v5

基于 **Cloudflare Workers + D1 + KV** 的零成本媒体展示网站，支持图片、视频、文字的展示与管理。

> 🎨 **Apple 静奢风 UI** — 深度毛玻璃、Aurora 流动背景、圆角渐变卡片、柔和阴影、流畅动效、暗色模式

---

## ✨ 功能特性（v5 — 16 项自定义全开）

### 🌐 前台展示
- 🖼️ **图片展示** — 渐变立体卡片 + 悬浮浮起 + 图片缩放动画
- 🎬 **视频播放** — 支持外链（YouTube / B站 / 任意 mp4 直链）
- 📝 **文字内容** — 优雅排版，支持换行
- 🔗 **独立 URL** — 每件作品自定义 slug，可分享、可收藏、SEO 友好
- 👁 **浏览计数** — 每打开一次详情页自动 +1
- 🔍 **搜索筛选** — 按分类、关键词实时筛选
- 📱 **全端适配** — 手机、平板、桌面完美呈现
- 🍎 **Apple 风格** — 深度毛玻璃导航、Aurora 动态背景、SF 字体
- 🌙 **暗色模式** — 关闭 / 开启 / 跟随系统，三档可选
- 📢 **公告横幅** — 支持 HTML，可关闭
- 🔗 **复制链接按钮** — 一键复制当前页面 URL
- 📎 **附件下载** — 每条内容可挂一个下载文件
- 🖼️ **懒加载占位** — 图片模糊渐显，体验丝滑
- 📡 **RSS 订阅** — 自动生成 `/rss.xml`
- 🗺️ **Sitemap** — 自动生成 `/sitemap.xml`，利于 SEO
- 🔄 **相关推荐** — 详情页底部同分类随机 3 条

### 🔐 后台管理
- 🔒 **登录鉴权** — Cookie 会话管理，可配置密码
- 👁️ **预览 → 发布工作流** — 保存为草稿 → 预览效果 → 满意后一键发布
- ➕ **添加内容** — 图片上传到 KV / 视频填外链 / 文字直接编辑
- ✏️ **编辑内容** — 修改标题、描述、标签、分类、SEO、slug 等
- 🗑️ **删除联动释放** — 删除图片时**同步清除 KV 中的二进制数据**，彻底释放存储
- 📊 **统计面板** — 全部 / 已发布 / 草稿 / 已隐藏 四色卡片
- 🏷️ **分类管理** — 添加/删除/重命名分类，每个分类自选颜色
- ⚙️ **站点设置** — 品牌名、主题色、Logo、Favicon、Hero 背景、页脚、导航链接、关于页、公告
- 🖼️ **独立封面图** — 封面与正文解耦，上传独立图片做封面
- 📸 **多图画廊** — 一条内容挂多张图，详情页竖向滑动展示
- 🎨 **自定义 CSS 类** — 高级用户给某条内容加额外 class
- 🕐 **定时发布** — 设置发布时间，未到时间前台不可见
- ⏰ **过期时间** — 设置后自动隐藏
- 🔝 **置顶权重** — 数字越大越靠前
- 🙈 **隐藏模式** — 不出现在列表，仅知道 URL 的人能看
- 🔍 **搜索表格** — 后台数据表实时筛选
- 📤 **批量删除** — 勾选多条一键清除 + 释放 KV 存储

---

## 🆕 v5 新增功能详解

### 1️⃣ 自定义 Slug
每条内容可手动设置 URL 别名，如 `my-best-photo`，URL 变为 `/item/my-best-photo`。留空自动生成拼音 slug。

### 2️⃣ SEO 字段
每条内容独立设置 `meta description` 和 `keywords`，后台表单直接编辑，前台自动注入 `<meta>` 和 Open Graph 标签。

### 3️⃣ 发布时间自定义
默认立即发布，可设为未来时间实现**定时发布**，也可设过期时间自动下架。

### 7️⃣ 隐藏 / 仅链接可访问
勾选「隐藏」后，内容不出现在前台列表和相关推荐中，但知道 URL 的人仍可访问。适合分享给特定人群。

### 8️⃣ 多图画廊（竖向滑动）
一条内容可挂多张图片，详情页内竖向排列、逐张滑动浏览，适合组图、画册、旅行记录。

### 10️⃣ 自定义 CSS 类
高级用户可为某条内容添加自定义 CSS class，配合自定义 CSS 实现个性化样式。

### 11️⃣ Logo / Favicon
后台上传 Logo 和 Favicon 图片到 KV，全站自动替换。

### 13️⃣ 暗色模式
三档可选：**关闭 / 开启 / 跟随系统**。前台有 🌙 按钮手动切换，选择记忆到 localStorage。暗色模式下毛玻璃变深色调，Aurora 背景自动调暗。

### 14️⃣ Hero 区域自定义
首页大标题区域支持四种背景：**无 / 渐变 / 图片 / 视频**。可自定义渐变 CSS、上传背景图、填入视频 URL。

### 15️⃣ 页脚（支持 HTML）
后台富文本编辑页脚内容，可放版权、友链、备案号、社交链接等。

### 16️⃣ 导航链接
后台配置额外导航链接（JSON 数组），如 GitHub、Twitter、邮箱等，自动出现在顶部导航栏。

### 17️⃣ 关于页（支持 HTML）
独立的 `/about` 页面，后台富文本编辑，支持 HTML 标签。

### 18️⃣ 公告（支持 HTML）
首页顶部公告横幅，支持 HTML（可放链接、加粗、换行），留空自动关闭。每个访客可手动关闭。

### 19️⃣ 品牌名
全局替换 "Gallery" 为你的品牌名，影响导航栏、标题、页脚、RSS、SEO。

### 27️⃣ 懒加载占位
图片使用 `loading="lazy"` + `IntersectionObserver` 双重懒加载，搭配模糊渐显效果，大图页面丝滑不卡顿。

### 28️⃣ 复制链接
详情页一键复制当前 URL 到剪贴板，按钮文案可自定义（默认"复制链接"）。

### ➕ RSS + Sitemap
- `/rss.xml` — RSS 2.0 格式，自动包含最近 30 条已发布内容
- `/sitemap.xml` — XML Sitemap，包含所有公开内容 URL
- 两者均可在后台一键开关

---

## 🏗️ 技术架构

```
┌─────────────────────────────────────────────┐
│          Cloudflare Worker (全栈)          │
│   API + 前台页面 + 后台管理（单文件 JS）     │
└──────┬──────────────┬──────────────┬───────┘
       │              │              │
       ▼              ▼              ▼
┌──────────┐  ┌──────────────┐  ┌──────────────┐
│  D1      │  │  KV #1 MEDIA │  │  KV #2 CACHE │
│  SQLite  │  │  图片二进制   │  │  会话/缓存   │
│  元数据   │  │  封面/附件   │  │  登录态       │
│  站点设置 │  │  ≤25MB/张   │  │              │
└──────────┘  └──────────────┘  └──────────────┘
```

### 存储分工
| 内容类型 | 存储位置 | 说明 |
|---------|---------|------|
| 图片 | **KV (MEDIA_KV)** | 二进制直存，删除时 `KV.delete()` 彻底释放 |
| 视频 | **外链 URL** | 存于 D1，仅记录地址，不占 CF 存储 |
| 文字 | **D1** | 直接存文本内容 |
| 封面图 | **KV (MEDIA_KV)** | 独立存储，与正文解耦 |
| 附件 | **KV (MEDIA_KV)** | 独立存储，支持下载 |
| 多图 | **KV (MEDIA_KV)** | 每张图独立 key，JSON 数组存 D1 |
| 元数据 | **D1** | 标题、描述、标签、排序、SEO 等 |
| 站点设置 | **D1** | 品牌名、主题色、分类、HTML 片段等 |
| Logo/Favicon | **KV (MEDIA_KV)** | 小图直存 |

---

## 🚀 部署指南

### 前置要求
- Cloudflare 账户（免费版即可）
- Node.js >= 18
- Wrangler CLI (`npm install -g wrangler`)

### 第一步：登录 Cloudflare
```bash
wrangler login
```

### 第二步：创建 Cloudflare 资源
```bash
# D1 数据库
npx wrangler d1 create media_gallery_db

# KV 命名空间 #1：会话缓存
npx wrangler kv namespace create CACHE

# KV 命名空间 #2：图片/附件存储
npx wrangler kv namespace create MEDIA_KV
```
记录每个命令返回的 **ID**。

### 第三步：填写配置
编辑 `wrangler.toml`，填入三个 ID + 管理员密码：
```toml
[[d1_databases]]
database_id = "你的 D1 ID"

[[kv_namespaces]]
binding = "CACHE"
id = "你的 KV #1 ID"

[[kv_namespaces]]
binding = "MEDIA_KV"
id = "你的 KV #2 ID"

[vars]
ADMIN_PASSWORD = "改成你的强密码"
```

### 第四步：执行数据库迁移
```bash
npx wrangler d1 migrations apply media_gallery_db
```
会依次执行 0001_init → 0002_add_slug → 0003_add_cover → 0004_add_customization_fields。

### 第五步：部署
```bash
npm install
npm run deploy
```
部署成功后获得 `https://media-gallery.<你的CF用户名>.workers.dev` 地址。

### 第六步：首次登录后台
1. 访问 `https://你的地址/admin/login`
2. 输入密码（即 `wrangler.toml` 中的 `ADMIN_PASSWORD`）
3. 进入后台 → 站点设置 → 修改品牌名、上传 Logo、配置分类
4. 开始添加内容！

### 第七步（可选）：绑定自定义域名
Cloudflare Dashboard → Workers & Pages → 你的 Worker → 设置 → 触发器 → 自定义域

> ⚠️ 自定义域名需要将 DNS 迁到 Cloudflare。不改 NS 也能用 `*.workers.dev` 地址。

---

## 📂 项目结构

```
media-gallery/
├── src/
│   ├── worker.js          # Worker 主文件（全部逻辑，~80KB 单文件）
│   └── design-system.js   # 设计令牌（CSS 变量定义）
├── migrations/
│   ├── 0001_init.sql     # D1 建表（media_items + site_settings + admins）
│   ├── 0002_add_slug.sql # 独立 URL（slug + views）
│   ├── 0003_add_cover.sql# 独立封面图（cover_key）
│   └── 0004_add_customization_fields.sql  # v5 全部自定义字段
├── scripts/
│   ├── build_worker.py   # 构建脚本（生成完整 worker.js）
│   └── generate_v5_images.py  # 效果图生成脚本
├── frontend_v5_final.png  # 前台效果图
├── admin_v5_final.png    # 后台效果图
├── wrangler.toml          # Cloudflare 配置
├── package.json
└── README.md
```

---

## 🔌 API 接口

### 认证
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/login` | 管理员登录，返回 token |
| POST | `/api/logout` | 退出登录 |
| GET  | `/api/auth/check` | 检查登录态 |

### 站点设置
| 方法 | 路径 | 说明 |
|------|------|------|
| GET  | `/api/settings` | 获取全部站点设置 |
| PUT  | `/api/settings` | 更新站点设置（品牌名/主题色/分类/Hero/页脚/导航/关于/公告/RSS/Sitemap） |

### 媒体内容
| 方法 | 路径 | 说明 |
|------|------|------|
| GET    | `/api/items` | 公开列表（前台调用） |
| POST   | `/api/items` | 创建（自动生成 slug，默认草稿） |
| PUT    | `/api/items/:id` | 更新（支持所有自定义字段） |
| DELETE | `/api/items/:id` | 删除（**联动清除 KV 图片/封面/附件/多图**） |
| DELETE | `/api/items/batch` | 批量删除（联动清除所有 KV 资源） |
| POST   | `/api/items/:id/publish` | 发布到前台 |
| POST   | `/api/items/:id/unpublish` | 取消发布（转草稿） |

### 文件上传
| 方法 | 路径 | 说明 |
|------|------|------|
| POST   | `/api/upload` | 上传文件到 KV（≤24MB），返回 key |
| DELETE | `/api/file` | 删除 KV 文件 |

### 公开页面
| 路径 | 说明 |
|------|------|
| `/` | 前台首页（Hero + 筛选 + 卡片网格 + 分页） |
| `/item/:slug` | 作品详情页（封面 + 正文 + 多图 + 相关推荐 + 复制链接） |
| `/about` | 关于页（后台可编辑 HTML） |
| `/rss.xml` | RSS 订阅源 |
| `/sitemap.xml` | XML Sitemap |
| `/file/:key` | KV 文件代理（图片/附件下载） |

---

## 🗑️ 删除如何释放存储

后台删除内容时，系统执行**全量清除**：

```js
// 1. 删除正文图片（如果是图片类型）
if (item.content && item.type === 'image') await env.MEDIA_KV.delete(item.content);
// 2. 删除封面图
if (item.cover_key) await env.MEDIA_KV.delete(item.cover_key);
// 3. 删除附件
if (item.attachment_key) await env.MEDIA_KV.delete(item.attachment_key);
// 4. 删除多图画廊所有图片
for (const key of JSON.parse(item.gallery_keys || '[]')) {
  await env.MEDIA_KV.delete(key);
}
// 5. 删除 D1 元数据行
await env.DB.prepare('DELETE FROM media_items WHERE id = ?').bind(id).run();
```

> KV 删除操作**免费**，存储配额立即释放。

---

## 💰 成本

Cloudflare 免费额度对个人展示站绰绰有余：

| 资源 | 免费额度 | 本项目用途 |
|------|---------|-----------|
| Workers | 10 万次/天 | API + 页面渲染 |
| D1 | 5GB 存储 | 元数据 + 文字内容 + 站点设置 |
| KV | 1GB 存储 | 图片 + 封面 + 附件 |
| KV 删除操作 | **免费** | 删除图片不额外收费 |

> 没有 R2，没有出口流量费，零成本运行。

---

## 🔒 安全建议

1. 部署后立即修改默认密码为强密码
2. 绑定自定义域名（避免 `*.workers.dev` 暴露信息）
3. 对 `/admin` 和 `/api/*` 路径开启 Cloudflare Access 额外保护
4. KV 命名空间设为私有（默认即私有）
5. 定期备份 D1 数据：`wrangler d1 export media_gallery_db --output dump.sql`

---

## 📝 License

MIT
