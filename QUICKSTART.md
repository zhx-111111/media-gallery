# ⚡ 快速开始（3 步部署）

## 方式一：命令行（首次推荐）

```bash
# 1. 安装 wrangler 并登录
npm install -g wrangler && wrangler login

# 2. 拉代码
git clone https://github.com/zhx-111111/media-gallery.git
cd media-gallery && npm install

# 3. 一键部署（自动建库、建 KV、注入 ID、跑迁移、部署）
chmod +x deploy.sh && ./deploy.sh
```

完毕。打开终端输出的 URL 即可访问。

---

## 方式二：GitHub 自动部署（长期推荐）

1. **建资源**（只需一次）：
   ```bash
   wrangler login
   wrangler d1 create media_gallery_db
   wrangler kv namespace create CACHE
   wrangler kv namespace create MEDIA_KV
   ```
   记下 3 个 ID。

2. **设 Secrets**：打开 `https://github.com/zhx-111111/media-gallery/settings/secrets/actions`
   
   | Secret | 值 |
   |---|---|
   | `CF_API_TOKEN` | Cloudflare API Token（需 Workers + D1 + KV 权限） |
   | `CF_ACCOUNT_ID` | Cloudflare 账户 ID |
   | `D1_DB_ID` | 上面拿到的 D1 ID |
   | `KV_CACHE_ID` | CACHE namespace ID |
   | `KV_MEDIA_ID` | MEDIA_KV namespace ID |

3. **Connect to Git**：
   - Dashboard → Workers & Pages → Create → Workers → Connect to Git
   - 选 `media-gallery` 仓库 → Save and Deploy

之后 **`git push` 就自动部署**。

---

## 绑定自定义域名

Workers & Pages → media-gallery → Settings → Domains & Routes → Add Custom Domain → 输入域名 → 等 1~5 分钟变 Active。

---

## 登录后台

- URL：`你的域名/admin`
- 默认密码：`admin123`（**请尽快修改！**）
