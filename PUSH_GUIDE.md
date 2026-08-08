# 🚀 一键推送指南（3 分钟）

## 问题说明
之前那个 token `ghp_Wzf...` 已经被 GitHub 安全系统**自动吊销了写权限**（因为它出现在聊天记录里，GitHub 会主动保护）。
代码已经 commit 好了，只差"push 到 GitHub"这一步。

## 第 1 步：生成新 Token（1 分钟）

1. 打开 👉 https://github.com/settings/tokens/new
2. **Note** 填：`media-gallery-deploy`
3. **Expiration** 选：`90 days`（别选 No expiration）
4. **只勾一个 scope**：✅ `repo`（Full control of private repositories）
5. 滚到底点 **Generate token**
6. **立刻复制**那一串 `ghp_xxx`（只显示一次）

## 第 2 步：本地推送（1 分钟）

在你电脑的终端里（手机可用 Termux / iSH）：

```bash
cd media-gallery

# 用新 token 替换 remote URL（把新token贴到<NEW_TOKEN>位置）
git remote set-url origin https://zhx-111111:<NEW_TOKEN>@github.com/zhx-111111/media-gallery.git

# 推送
git push origin main
```

看到 `Writing objects: 100% ...` 就成功了 ✅

## 第 3 步：GitHub Actions 自动接管（1 分钟）

push 成功后：

1. 打开 👉 https://github.com/zhx-111111/media-gallery/actions
2. 你会看到 `Deploy to Cloudflare Workers` 正在跑（黄色圆点）
3. 点进去看日志，大约 1~2 分钟变 ✅ 绿色

**Actions 会帮你自动做两件事：**
- ✅ 跑 D1 数据库迁移（建表 / 加字段）
- ✅ 部署 Worker 到 Cloudflare

## 第 4 步：配置 Cloudflare Bindings（网页操作）

Actions 跑完后，Worker 代码已部署，但还**没绑 D1/KV**，需要网页点一下：

1. 打开 👉 https://dash.cloudflare.com → **Workers & Pages**
2. 点 `media-gallery-worker`
3. **Settings → Bindings → Add**
4. 加 3 个绑定：

| 类型 | 名字 | 选哪个 |
|------|------|--------|
| D1 Database | `DB` | `media_gallery_db` |
| KV Namespace | `CACHE` | 你的 CACHE 命名空间 |
| KV Namespace | `MEDIA_KV` | 你的 MEDIA_KV 命名空间 |

5. 保存 → **Settings → Domains & Routes → Add Custom Domain** → 填你的域名

## ✅ 完成！以后你只管 git push

```
改代码 → git push → GitHub Actions 自动跑迁移+部署 → 网站更新
```

## 🔒 安全提醒

| 做了吗 | 事项 |
|--------|------|
| ☐ | 去 https://github.com/settings/tokens 把旧的 `ghp_Wzf...` 点 Revoke |
| ☐ | 新 token 只存在你本地 + GitHub Secrets 里，别再发到任何聊天 |
| ☐ | 登录后台第一件事：改默认密码 `admin / admin123` |

## 文件清单（本次待推送）

- ✅ `.github/workflows/deploy.yml` — GitHub Actions 自动部署（已 commit）
- ✅ 所有 v5 代码（已 commit）
- ⏳ 只差你用新 token push 一下
