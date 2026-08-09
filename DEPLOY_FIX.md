# 部署排错指南

## 根因（为什么之前一直红）

不是 Token 错、不是权限不够——是 **Wrangler 版本问题**。

| 版本 | 结果 |
|------|------|
| 4.120.0（Actions 默认拉的最新） | ❌ 解析大文件时把 JS 字符串里的 `<` 当 HTML 标签 → SyntaxError |
| **4.86.0（已锁定）** | ✅ 沙盒实测 `wrangler deploy --dry-run` 通过，24.64 KiB gzip |

## 关键文件

### `wrangler.toml`
- 用占位符 `__D1_DB_ID__` / `__KV_CACHE_ID__` / `__KV_MEDIA_ID__`
- **不要写真实 ID**（Secrets 泄露风险）
- Actions 运行时会用 `sed` 替换成真实值

### `.github/workflows/deploy.yml`
- 锁定 `wrangler@4.86.0`
- 步骤：`setup-node` → `npm install wrangler@4.86.0` → `sed 替换占位符` → `wrangler d1 migrations apply` → `wrangler deploy`

## 你需要做的

### 1. 确认 4 个 GitHub Secrets 都在
打开 https://github.com/zhx-111111/media-gallery/settings/secrets/actions

| Secret 名（必须完全一致） | 值 |
|---|---|
| `CLOUDFLARE_API_TOKEN` | CF 面板建的 Token（不是 `ghp_` 开头！）|
| `D1_DB_ID` | D1 数据库 ID |
| `KV_CACHE_ID` | CACHE KV ID |
| `KV_MEDIA_ID` | MEDIA_KV KV ID |

CF API Token 权限必须勾：`Workers Scripts: Edit` + `D1: Edit` + `Workers KV Storage: Edit`

### 2. 触发 Run
Actions → Deploy to Cloudflare Workers → Run workflow → main → 绿色按钮

## 成功标志（日志应看到）

```
✅ Verify all secrets are present     ← 4 个都 ✅
✅ Inject real IDs into wrangler.toml ← 替换完成 + 无残留占位符
✅ Syntax check worker.js            ← worker.js 语法 OK
✅ Apply D1 migrations (remote)      ← migrations applied
✅ Deploy Worker                     ← 输出 workers.dev 地址
```

## 常见报错速查

| 日志关键词 | 含义 | 解决 |
|---|---|---|
| `❌ XXX = MISSING` | Secret 没填或名字拼错 | 核对大小写，补全 |
| `Authentication failed 9106` | Token 无效/权限不够/是 GitHub Token | 换成 CF 面板建的 Token |
| `database not found` | D1_DB_ID 填错 | 回 CF D1 面板核对 ID |
| `Syntax error "x"` + `x3c` | Wrangler 版本 > 4.90 | 已锁定 4.86.0，不会复现 |
| `Build failed` + `require stack` | node_modules 缺包 | Actions 会自动 `npm install` |

## 安全提醒

- `ghp_xxx` 是 GitHub Token，Cloudflare **不认**，别再填进 `CLOUDFLARE_API_TOKEN`
- 用完的 Token 去对应面板 revoke
- `wrangler.toml` 永远只放占位符，真实 ID 走 Secrets
