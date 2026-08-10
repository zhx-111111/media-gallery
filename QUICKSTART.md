# 🚀 5 步零配置部署指南

> 你已经把 NS 和 DNS 都迁到 Cloudflare 了，这是**最理想的情况**——CF 自动签证书、自动建 DNS，你几乎不用碰 DNS 面板。

## 你只需要做 6 件事

| 步骤 | 在哪里 | 做什么 | 耗时 |
|------|---------|---------|------|
| 1 | CF 控制台 | Workers & Pages → 连接 GitHub → 选本仓库 → 部署 | 1 分钟 |
| 2 | CF 控制台 | 存储和数据库 → D1 → 创建 `media_gallery_db` | 30 秒 |
| 3 | CF 控制台 | 存储和数据库 → KV → 创建 `media_kv` + `media_cache` | 30 秒 |
| 4 | CF 控制台 | Worker Settings → Bindings → 绑 db/kv/cache | 1 分钟 |
| 5 | CF 控制台 | Settings → Variables → 设 `INIT_SECRET` | 30 秒 |
| 6 | 浏览器 | 访问 `https://域名/api/init/你的密钥` | 10 秒 |

## 详细操作

### 第 1 步：连 GitHub 建 Worker
1. 打开 https://dash.cloudflare.com
2. 左侧菜单 → **Workers & Pages**
3. 点 **Create** → 选 **Workers**（不是 Pages）
4. 连接方式选 **Connect to Git**
5. 选 GitHub → 授权 → 选仓库 `zhx-111111/media-gallery`
6. **Production branch**: `main`
7. **Build command**: 留空
8. **Deploy command**: `npx wrangler deploy`
9. 点 **Save and Deploy**
10. CF 拉代码 → 部署 → 给你一个 `xxx.workers.dev` 地址

### 第 2 步：建 D1 数据库
1. CF 控制台 → **存储和数据库** → **D1 SQL 数据库**
2. 点 **Create database**
3. 名称填 `media_gallery_db`
4. 点创建 → **复制 database_id**（后面绑定时用）

### 第 3 步：建两个 KV
1. CF 控制台 → **存储和数据库** → **KV**
2. 点 **Create a namespace**
3. 名称填 `media_kv` → 创建 → **记 ID**
4. 再点 **Create a namespace**
5. 名称填 `media_cache` → 创建 → **记 ID**

### 第 4 步：绑定资源
1. Workers & Pages → 点你的 `media-gallery`
2. **Settings → Bindings**
3. 点 **Add**
   - Variable name: `db` → D1 → 选 `media_gallery_db`
   - Variable name: `kv` → KV → 选 `media_kv`
   - Variable name: `cache` → KV → 选 `media_cache`
4. 点 **Save**

> ⚠️ 绑定名 `db` / `kv` / `cache` **不可改**，代码里写死了。

### 第 5 步：设环境变量
1. **Settings → Variables**
2. 点 **Add variable**
   - Name: `INIT_SECRET` → Value: 填一个随机强密码（如 `Xk9#mP2$vL5@nQ3!`）
   - 这是**初始化密钥**，也是首次管理员密码
3. （可选）再 Add 一个：
   - Name: `ADMIN_PASSWORD` → Value: 你想用的后台密码
4. 点 **Save**

### 第 6 步：初始化数据库
浏览器访问：
```
https://你的域名/api/init/你设的INIT_SECRET
```

看到返回：
```json
{"ok": true, "msg": "initialized", "login": "/admin", "username": "admin", "password": "你设的密码"}
```

✅ **全部完成！**

## 验证清单

| 检查项 | 地址 | 期望结果 |
|-------|------|---------|
| 前台首页 | `https://你的域名/` | Aurora 毛玻璃列表页 |
| 后台登录 | `https://你的域名/admin` | 登录页 |
| 默认账号 | `admin` / `INIT_SECRET` | 能进后台 |
| RSS | `/rss.xml` | XML 内容 |
| Sitemap | `/sitemap.xml` | XML 内容 |
| 初始化接口 | `/api/init/密钥` | `{"ok":true}` |

## 常见错误

| 报错 | 原因 | 解决 |
|------|------|------|
| `invalid or missing INIT_SECRET` | 没设环境变量或密钥不对 | 检查 Settings → Variables 里的 `INIT_SECRET` |
| `D1_EXEC_ERROR` | SQL 语句不完整 | 确保用的是最新版 worker.js（本仓库已修复） |
| `KV NAMESPACE_NOT_FOUND` | KV 绑定名不对 | 确认绑定名是 `kv` 和 `cache`（不是别的） |
| 部署成功但页面空白 | wrangler.toml 里的 ID 和 console 绑定冲突 | 二选一：要么全用 console 绑定，要么全用 toml |
| 自定义域名打不开 | DNS 未生效或证书未签好 | 等 5~15 分钟，或检查 DNS 面板 |

## 🔐 安全提醒

部署完**第一件事**：登录后台 → 改掉默认密码 `admin123`

这个 token `ghp_nI64...` 已经 401 失效了，**建议去 GitHub Settings → Tokens 把它 revoke**，重新生成一个只勾选 `public_repo` 权限的。
