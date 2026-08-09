# Media Gallery — Cloudflare Workers

> 深度毛玻璃风格的轻量作品集站点，跑在 **Cloudflare Workers + D1 + KV** 上。
> **零配置部署**：Worker 启动时自动建表、注入默认数据，无需手动跑迁移。

---

## ✨ 功能一览

| 模块 | 能力 |
|------|------|
| **内容管理** | 图片 / 视频 / 文字，独立封面图，多图画廊（竖向滑动） |
| **自定义** | Slug、SEO 字段、发布/过期时间、隐藏、置顶、自定义 CSS 类 |
| **站点设置** | 品牌名、Logo/Favicon、主题色、暗色模式、Hero 背景 |
| **富文本** | 页脚（HTML）、公告（HTML）、关于页（HTML）、导航链接 |
| **交互** | RSS、Sitemap、复制链接、懒加载、浏览计数、相关推荐 |
| **管理** | 统计仪表盘、批量操作、草稿/发布工作流、预览面板 |

---

## 🚀 部署（两种方式）

### 方式 A：命令行一键部署（推荐首次）

```bash
npm install -g wrangler && wrangler login
git clone https://github.com/zhx-111111/media-gallery.git
cd media-gallery && npm install
chmod +x deploy.sh && ./deploy.sh
```

`deploy.sh` 会自动：建 D1 → 建 KV → 注入 ID → 部署 → 输出访问地址。

### 方式 B：GitHub 绑定自动部署（推荐长期）

1. 建资源（只需一次）：`wrangler d1 create media_gallery_db` + `wrangler kv namespace create CACHE/MEDIA_KV`
2. 设 GitHub Secrets（`CF_API_TOKEN` / `CF_ACCOUNT_ID` / `D1_DB_ID` / `KV_CACHE_ID` / `KV_MEDIA_ID`）
3. Dashboard → Workers & Pages → Create → Connect to Git → 选仓库 → Save and Deploy

之后 **`git push` 就自动部署**。

> 详细步骤见 `QUICKSTART.md`

---

## 🌐 绑定自定义域名

Workers & Pages → media-gallery → Settings → Domains & Routes → Add Custom Domain → 输入域名 → 等 1~5 分钟变 Active。

---

## 🔐 首次登录

- 后台：`你的域名/admin`
- 默认密码：`admin123`（**第一件事：改密码！**）

---

## 📁 项目结构

```
media-gallery/
├── .github/workflows/deploy.yml   # GitHub Actions 自动部署
├── migrations/                      # SQL 迁移（自动执行）
│   ├── 0001_init.sql
│   ├── 0002_add_slug.sql
│   ├── 0003_add_cover.sql
│   └── 0004_add_customization_fields.sql
├── src/
│   ├── worker.js                   # 单文件 Worker（全部逻辑 + UI）
│   └── design-system.js            # 设计令牌（CSS 变量）
├── scripts/
│   └── gen_v6.py                  # 效果图生成脚本
├── deploy.sh                        # 一键部署脚本
├── wrangler.toml                    # CF 配置
├── package.json
├── README.md
└── QUICKSTART.md                   # 快速开始指南
```

---

## 🛠 常见问题

| 问题 | 解决 |
|------|------|
| 部署后打不开 | 等 1~2 分钟冷启动，或检查 D1/KV ID |
| 图片上传失败 | 默认最大 24MB，超过会拒绝 |
| 自定义域名 522 | 删旧 DNS 记录，走 "Add Custom Domain" 重建 |
| 重置数据库 | `wrangler d1 execute media_gallery_db --command "DROP TABLE media_items;"` 然后重新部署 |
| 忘记密码 | 删 CACHE 里的 session，或直接改 D1 的 admins 表 |

---

## 📝 License

MIT
