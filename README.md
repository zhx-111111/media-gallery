# Media Gallery — Cloudflare Workers + D1 + KV

Apple 静奢风媒体作品集，零配置部署，5 步上线。

## 🚀 部署步骤（全程网页，零命令行）

### 第 1 步：连接 GitHub
1. 打开 https://dash.cloudflare.com → **Workers & Pages**
2. 点 **Create** → 选 **Workers**
3. 连接方式选 **Connect to Git**
4. 选 GitHub → 授权 → 选仓库 `zhx-111111/media-gallery`
5. **Production branch**: `main` → **Save and Deploy**
6. 构建命令留空，部署命令填 `npx wrangler deploy`

### 第 2 步：创建 D1 数据库
1. CF 控制台 → **存储和数据库** → **D1**
2. 点 **Create database**
3. 名称填 `media_gallery_db` → 创建
4. **复制 database_id**（等下要用）

### 第 3 步：创建 KV 命名空间 ×2
1. CF 控制台 → **存储和数据库** → **KV**
2. 点 **Create a namespace**
3. 名称填 `media_kv` → 创建 → **记 ID**
4. 再创建一个 `media_cache` → 创建 → **记 ID**

### 第 4 步：绑定资源
1. Workers & Pages → 点你的 `media-gallery`
2. **Settings → Bindings → Add**
   - `db` → D1 → 选 `media_gallery_db`
   - `kv` → KV → 选 `media_kv`
   - `cache` → KV → 选 `media_cache`
3. **保存**

### 第 5 步：设置环境变量 + 初始化
1. **Settings → Variables → Add**
   - `INIT_SECRET` = 任意随机字符串（如 `MySecret2026!`，**必填**）
   - `ADMIN_PASSWORD` = 后台密码（可选，默认等于 INIT_SECRET）
2. **保存**
3. 浏览器访问：`https://你的域名/api/init/你的INIT_SECRET`
4. 看到 `{"ok":true,"msg":"initialized"}` → ✅ 完成！

### 第 6 步（可选）：绑定自定义域名
1. **Settings → Custom Domains → Add**
2. 输入你的域名（如 `gallery.你的域名.com`）
3. CF 自动建 DNS + 签 HTTPS 证书
4. 等 1~5 分钟变 Active

## 🔑 登录后台
- 地址：`https://你的域名/admin`
- 用户名：`admin`
- 密码：`INIT_SECRET` 的值（或你设的 `ADMIN_PASSWORD`）

## 📋 功能清单
- ✅ 图片 / 视频 / 文字 三种内容类型
- ✅ 独立封面图 + 多图画廊（竖向滑动）
- ✅ 自定义 Slug / SEO 字段 / 发布时间 / 过期时间
- ✅ 隐藏模式（仅链接可访问）
- ✅ 自定义 CSS 类（高级用户）
- ✅ Logo / Favicon 上传
- ✅ 暗色模式（关闭/开启/跟随系统）
- ✅ Hero 背景（渐变/图片/视频/无）
- ✅ 页脚 HTML / 公告 HTML / 关于页 HTML
- ✅ 导航链接自定义
- ✅ 品牌名自定义
- ✅ 图片懒加载 + 模糊渐显
- ✅ 复制链接按钮
- ✅ RSS 订阅 + Sitemap
- ✅ 批量删除 / 回收站友好
- ✅ 多管理员就绪（权限系统预留）

## 🔧 本地开发
```bash
npm install
npx wrangler d1 create media_gallery_db
npx wrangler kv namespace create media_kv
npx wrangler kv namespace create media_cache
# 编辑 wrangler.toml 填入 3 个 ID
npx wrangler d1 migrations apply media_gallery_db
npx wrangler deploy
```

## 🔐 安全提醒
- 部署完**第一件事**：登录后台改掉默认密码
- `INIT_SECRET` 用强密码（16+ 字符，含大小写+数字+符号）
- 定期 rotate token 和密钥

## 📄 License
MIT
