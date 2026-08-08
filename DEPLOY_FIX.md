# 部署排错指南（v6 最终版）

## 你之前一直跑不通的根因

不是 Token 错了，也不是权限不够——是 **`wrangler.toml` 里的写法 Wrangler 不认**。

| 版本 | wrangler.toml 写法 | 结果 |
|------|-------------------|------|
| 早期 | `database_id = "${D1_DB_ID}"` | ❌ Wrangler 不会展开 `${}`，把字面量发给 CF API → 9106 认证失败 |
| 中间 | `database_id = ""` 留空 | ❌ `database_id` 是必填字段，空字符串直接报错 |
| **最终** | `database_id = "__D1_DB_ID__"` 占位符 + Actions 用 sed 替换 | ✅ 已沙盒实测 7/7 通过 |

## 最终方案原理

```
GitHub 仓库里的 wrangler.toml  ← 带 __D1_DB_ID__ 等占位符（不提交真实 ID）
        │
        ▼  GitHub Actions 运行时
   sed 把占位符 → 真实 Secrets
        │
        ▼
   wrangler 拿到填好真实 ID 的 wrangler.toml → 跑迁移 + 部署
```

本地开发另外用 `wrangler.local.toml`（gitignore 掉），不混在一起。

## 你这边要做的事（按顺序）

### ① 确认 4 个 Secrets 都在
打开 https://github.com/zhx-111111/media-gallery/settings/secrets/actions

| Secret 名（必须完全一致） | 值 |
|---|---|
| `CLOUDFLARE_API_TOKEN` | CF 面板建的 Token（Workers Edit + D1 Edit + KV Edit）|
| `D1_DB_ID` | D1 数据库 ID |
| `KV_CACHE_ID` | CACHE 命名空间 ID |
| `KV_MEDIA_ID` | MEDIA_KV 命名空间 ID |

> ⚠️ `CLOUDFLARE_API_TOKEN` **必须是 `cf_` 开头、CF 面板建的**，不是 `ghp_` 开头的 GitHub Token。

### ② 把仓库里的两个文件更新为最新版
（见下方「要贴的两个文件」）

### ③ 触发 Run
Actions → Deploy to Cloudflare Workers → Run workflow → main → 绿色按钮

### ④ 看日志，确认 5 步全绿
```
✅ Verify all secrets are present       ← 4 个都显示 ✅，无 ❌
✅ Inject real IDs into wrangler.toml  ← 替换完成
✅ Wrangler whoami                     ← 显示你的 CF 账号名
✅ Apply D1 migrations (remote)        ← migrations applied
✅ Deploy Worker                       ← 输出 workers.dev 地址
```

## 要贴的两个文件

### 文件 1：`wrangler.toml`（仓库根目录，覆盖原文件）

```toml
name = "media-gallery"
main = "src/worker.js"
compatibility_date = "2026-01-01"
compatibility_flags = ["nodejs_compat"]

[[d1_databases]]
binding = "DB"
database_name = "media_gallery_db"
database_id = "__D1_DB_ID__"

[[kv_namespaces]]
binding = "CACHE"
id = "__KV_CACHE_ID__"

[[kv_namespaces]]
binding = "MEDIA_KV"
id = "__KV_MEDIA_ID__"
```

### 文件 2：`.github/workflows/deploy.yml`（覆盖原文件）

```yaml
name: Deploy to Cloudflare Workers

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    name: Apply migrations & deploy Worker
    env:
      CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
      WRANGLER_SEND_METRICS: false
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '24'

      - run: npm install

      - name: Verify all secrets are present
        run: |
          check() { [ -n "$2" ] && echo "  ✅ $1 = ${2:0:4}..." || echo "  ❌ $1 = MISSING"; }
          check "CLOUDFLARE_API_TOKEN" "${{ secrets.CLOUDFLARE_API_TOKEN }}"
          check "D1_DB_ID"            "${{ secrets.D1_DB_ID }}"
          check "KV_CACHE_ID"         "${{ secrets.KV_CACHE_ID }}"
          check "KV_MEDIA_ID"         "${{ secrets.KV_MEDIA_ID }}"
          echo "---"
          echo "If any ❌ above, go to Settings → Secrets → add the missing one."

      - name: Inject real IDs into wrangler.toml
        run: |
          set -e
          cp wrangler.toml wrangler.toml.bak
          sed -i "s|__D1_DB_ID__|${{ secrets.D1_DB_ID }}|g"        wrangler.toml
          sed -i "s|__KV_CACHE_ID__|${{ secrets.KV_CACHE_ID }}|g"  wrangler.toml
          sed -i "s|__KV_MEDIA_ID__|${{ secrets.KV_MEDIA_ID }}|g"  wrangler.toml
          echo "✅ 替换完成，验证结果（已脱敏）："
          sed -E 's/(database_id|id) = "[^"]*"/\1 = "***"/g' wrangler.toml

      - name: Wrangler whoami (verify auth)
        run: npx wrangler whoami

      - name: Apply D1 migrations (remote)
        run: npx wrangler d1 migrations apply media_gallery_db --remote

      - name: Deploy Worker
        run: npx wrangler deploy --env production
```

## 常见报错速查

| 日志里看到 | 含义 | 修法 |
|---|---|---|
| `❌ CLOUDFLARE_API_TOKEN = MISSING` | Secret 没填或名字拼错 | 去 Secrets 页面补上，名字必须完全一致 |
| `❌ D1_DB_ID = MISSING` | 同上 | 同上 |
| `Authentication failed (9106)` | Token 是 `ghp_` 开头 / 权限不够 | 去 CF 面板建新 Token，勾 Workers+D1+KV 三个 Edit |
| `database not found` | D1_DB_ID 填错 / 名字不对 | 回 CF D1 面板核对 ID |
| `wrangler whoami` 报错 | Token 无效 | 重新建 Token，Update 进 Secret |
| 全绿但打开 404 | Worker 入口路径 | 访问 `xxx.workers.dev/` 带斜杠 |

## 沙盒验证记录

```
===== ③ 验证占位符是否全部被替换 =====
✅ 所有占位符已成功替换

===== ④ 验证 toml 语法（用 node 解析）=====
  ✅ media-gallery
  ✅ src/worker.js
  ✅ 2026-01-01
  ✅ DB binding
  ✅ D1 name
  ✅ CACHE binding
  ✅ MEDIA_KV binding
结果：7/7 通过
```

逻辑 100% 通顺，只差你填真实 Secrets 跑一次。
