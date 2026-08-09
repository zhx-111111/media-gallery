# Media Gallery — Cloudflare Workers 作品集

一个跑在 Cloudflare 免费额度上的个人作品集站点。图片 / 视频 / 文字全支持，Apple 静奢风毛玻璃 UI，零服务器成本。

---

## 🚀 5 步部署（参考 cloudmail 流程）

### 第 1 步：CF 控制台拉 GitHub 建 Worker

1. 打开 https://dash.cloudflare.com → **Workers & Pages**
2. 点 **Create** → 选 **Workers**
3. 连接方式选 **Connect to Git**
4. 授权 GitHub → 选仓库 `media-gallery`
5. 配置保持默认 → **Save and Deploy**

> 此时 Worker 已建好，但还跑不起来（缺 D1/KV 绑定），继续👇

### 第 2 步：建 D1 数据库

1. CF 控制台 → **存储和数据库** → **D1 SQL 数据库** → **创建**
2. 名称填 `media_gallery_db`
3. 创建后，**复制保存 database_id**（后面绑定要用）

### 第 3 步：建 KV 命名空间 ×2

1. **存储和数据库** → **KV** → **创建命名空间**
2. 第一个名称填 `media_kv`（存图片/文件）→ 创建 → **复制 ID**
3. 第二个名称填 `media_cache`（存缓存）→ 创建 → **复制 ID**

### 第 4 步：绑定到 Worker

进 Worker → **Settings** → **Bindings**，添加 3 个绑定：

| 绑定类型 | 变量名称（**必须严格一致**） | 选择 |
|---------|---------------------------|------|
| D1 Database | `db` | 选刚建的 `media_gallery_db` |
| KV Namespace | `kv` | 选 `media_kv` |
| KV Namespace | `cache` | 选 `media_cache` |

再设 2 个环境变量（**Settings → Variables**）：

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `ADMIN_PASSWORD` | 你想要的密码 | 后台登录密码 |
| `INIT_SECRET` | 一串随机字符串 | 初始化密钥，**很重要** |

> ⚠️ 变量类型选 **Text**。改完点 **Deploy** 让配置生效。

### 第 5 步：初始化 + 绑自定义域名

**初始化数据库**（浏览器访问，替换成你的值）：

```
https://你的域名/api/init/你的INIT_SECRET
```

看到 `{"ok":true}` 就成功了 ✅

**绑自定义域名**：

1. Worker → **Settings** → **Domains & Routes** → **Add Custom Domain**
2. 输入 `gallery.你的域名.com` → 确认
3. 等 1~5 分钟状态变 **Active**

**搞定！** 访问你的域名开始用 👇

- 前台：`https://gallery.你的域名.com/`
- 后台：`https://gallery.你的域名.com/admin`
- 登录账号：`admin` / 密码 = 你设的 `ADMIN_PASSWORD`

---

## 📁 项目结构

```
media-gallery/
├── src/
│   └── worker.js          ← 全部逻辑（单文件，~960 行）
├── wrangler.toml          ← 配置模板（绑定时参考）
├── package.json
└── README.md
```

---

## ✨ 功能清单

| 功能 | 说明 |
|------|------|
| 🖼 图片 / 🎬 视频 / 📝 文字 | 三种内容类型 |
| 🎨 独立封面图 | 每条内容可单独上传封面 |
| 📑 多图画廊 | 一条内容挂多张图，详情页竖向滑动 |
| 🔗 独立 URL | 每条内容 `/item/自定义slug` |
| 🔍 SEO 字段 | 每条内容独立 meta description + keywords |
| ⏰ 定时发布 + 过期 | 设未来时间自动上线，过期自动隐藏 |
| 🙈 隐藏模式 | 不进列表，仅 URL 直访可见 |
| 🌙 暗色模式 | 关闭 / 开启 / 跟随系统 |
| 🎭 Hero 自定义 | 渐变 / 图片 / 视频 四种背景 |
| 📄 富文本页脚/公告/关于 | 支持 HTML |
| 🔗 导航链接 | JSON 配置外链 |
| 📋 复制链接 | 详情页一键复制 URL |
| 📡 RSS + Sitemap | 自动生成，可开关 |
| 💤 懒加载 | IntersectionObserver 模糊渐显 |
| 🎨 自定义 CSS 类 | 高级用户给单条内容加样式 |
| 🔒 后台管理 | 增删改查 + 批量操作 + 预览发布 |

---

## 🔧 更新部署

改了代码 → `git push` → CF 自动拉取部署（如果用了 Git 集成）。

或本地手动：
```bash
wrangler deploy
```

---

## 🔐 安全提醒

- **INIT_SECRET 只用于首次初始化**，用完可以改掉
- 部署完**第一件事**：登录后台 → 修改密码
- Token / 密码不要提交到公开仓库

---

## 🆚 和 cloudmail 的对比

| | cloudmail | media-gallery |
|---|---|---|
| 平台 | CF Workers | CF Workers |
| 数据库 | D1 + KV + R2 | D1 + KV ×2 |
| 初始化 | `/api/init/SECRET` | `/api/init/SECRET` |
| 绑定名 | `db` / `kv` / `r2` | `db` / `kv` / `cache` |
| 部署步骤 | 5 步 | 5 步 |
| 免费额度内 | ✅ | ✅ |

---

## 📜 License

MIT
