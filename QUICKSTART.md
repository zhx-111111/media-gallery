# ⚡ 快速开始（5 步，全程网页操作）

> 目标：从零到网站上线，**不用装任何命令行工具**。

---

## 前置条件

- ✅ 一个 Cloudflare 账号（免费就行）
- ✅ 一个域名已托管到 Cloudflare（NS 指向 CF）
- ✅ 本项目已 fork / 上传到你的 GitHub

---

## 第 1 步：连接 GitHub → 创建 Worker

1. 打开 [dash.cloudflare.com](https://dash.cloudflare.com) → 左侧 **Workers & Pages**
2. 点 **Create** → 选 **Workers** → 点 **Connect to Git**
3. 授权 GitHub → 选择 `media-gallery` 仓库
4. **Production branch** 填 `main`，**构建命令留空**
5. 点 **Save and Deploy**

✅ 等待约 1 分钟，你会拿到一个地址：
```
https://media-gallery.<你的CF用户名>.workers.dev
```

---

## 第 2 步：创建 D1 数据库

1. CF 控制台 → **存储和数据库** → **D1 SQL 数据库**
2. 点 **创建**
3. 名称填 `media_gallery_db` → 创建
4. **复制 database_id**（后面要用）

---

## 第 3 步：创建 KV 命名空间 ×2

1. CF 控制台 → **存储和数据库** → **KV**
2. 点 **创建命名空间**
3. 名称填 `media_kv` → 创建 → **记 ID**
4. 再点 **创建命名空间**
5. 名称填 `media_cache` → 创建 → **记 ID**

---

## 第 4 步：绑定资源 + 设置环境变量

回到 Worker → **Settings** 标签页：

### Bindings（绑定）

| 变量名称 | 类型 | 选择 |
|---------|------|------|
| `db` | D1 数据库 | `media_gallery_db` |
| `kv` | KV 命名空间 | `media_kv` |
| `cache` | KV 命名空间 | `media_cache` |

> ⚠️ 变量名称必须是 `db` / `kv` / `cache`，**不能改**！

### Variables（环境变量）

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `INIT_SECRET` | 任意随机字符串 | **必填！** 初始化密钥 + 首次密码 |
| `ADMIN_PASSWORD` | 你的后台密码 | 可选，默认等于 INIT_SECRET |

点 **保存**。

---

## 第 5 步：初始化 + 绑定域名

### 5a. 初始化数据库

浏览器访问（替换成你的值）：
```
https://你的域名/api/init/你的INIT_SECRET
```

看到返回：
```json
{"ok": true, "msg": "initialized"}
```

✅ 数据库表已建好，管理员账号已创建。

### 5b. 绑定自定义域名

1. Worker → **Settings** → **Domains & Routes**
2. 点 **Add Custom Domain**
3. 输入你的域名，如 `gallery.你的域名.com`
4. CF 自动建 DNS + 签 HTTPS 证书 → 等 1~5 分钟变 Active

---

## 🎉 完成！

| 地址 | 用途 |
|------|------|
| `https://gallery.你的域名.com/` | 前台展示 |
| `https://gallery.你的域名.com/admin` | 后台管理 |
| `https://gallery.你的域名.com/rss.xml` | RSS 订阅 |
| `https://gallery.你的域名.com/sitemap.xml` | Sitemap |

> 🔒 **第一件事**：登录后台 → 改掉默认密码！

---

## 后续更新

以后改了代码 → `git push` → CF 自动部署（如果配了 GitHub Actions），或者在 CF 控制台手动点 **Deploy**。

---

## 常见问题

| 问题 | 解决 |
|------|------|
| `/api/init/` 返回 401 | INIT_SECRET 没设或填错，去 Settings → Variables 检查 |
| `/api/init/` 返回 500 | 绑定名写错了，必须是 `db` / `kv` / `cache` |
| 域名一直 Pending | 等 5~15 分钟，证书自动签；检查 NS 是否真在 CF |
| workers.dev 能开，域名不行 | 删掉域名的旧 A/CNAME 记录，重新 Add Custom Domain |
