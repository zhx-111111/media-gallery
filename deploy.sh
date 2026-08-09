#!/usr/bin/env bash
# ============================================================
#  Media Gallery — 一键部署脚本
#  用法：  chmod +x deploy.sh && ./deploy.sh
#  前提：  已执行 `wrangler login`（浏览器授权一次即可）
# ============================================================
set -e

# ── 颜色输出 ──
G='\033[0;32m'; B='\033[0;34m'; Y='\033[1;33m'; R='\033[0;31m'; NC='\033[0m'
info(){ echo -e "${B}[INFO]${NC} $*"; }
ok()  { echo -e "${G}[ OK ]${NC} $*"; }
warn(){ echo -e "${Y}[WARN]${NC} $*"; }
err() { echo -e "${R}[ERR ]${NC} $*"; exit 1; }

echo -e "${B}╔══════════════════════════════════════════╗${NC}"
echo -e "${B}║   Media Gallery — 一键部署到 Cloudflare  ║${NC}"
echo -e "${B}╚══════════════════════════════════════════╝${NC}"

# ── 1. 检查 wrangler ──
info "检查 wrangler..."
command -v wrangler >/dev/null 2>&1 || err "请先安装 wrangler: npm install -g wrangler"
WVER=$(wrangler --version 2>/dev/null | head -1)
ok "wrangler 已安装 (${WVER})"

# ── 2. 检查登录态 ──
info "检查 Cloudflare 登录态..."
if ! wrangler whoami >/dev/null 2>&1; then
  warn "未登录，正在打开浏览器授权..."
  wrangler login || err "登录失败"
fi
USER=$(wrangler whoami 2>/dev/null | grep -oP 'You are logged in as \K\S+' || echo "unknown")
ok "已登录为 ${USER}"

# ── 3. 创建/获取 D1 数据库 ──
info "创建/获取 D1 数据库 [media_gallery_db]..."
D1_OUT=$(wrangler d1 create media_gallery_db 2>&1 || true)
if echo "$D1_OUT" | grep -qi "already exists"; then
  D1_ID=$(wrangler d1 info media_gallery_db 2>/dev/null | grep -oP 'database_id.*?\K[0-9a-f-]{36}' | head -1)
  ok "D1 已存在: ${D1_ID}"
else
  D1_ID=$(echo "$D1_OUT" | grep -oP '"id":\s*"\K[0-9a-f-]{36}' | head -1)
  ok "D1 已创建: ${D1_ID}"
fi
[ -z "$D1_ID" ] && err "无法获取 D1 database_id"

# ── 4. 创建/获取 KV 命名空间 ──
info "创建/获取 KV [CACHE]..."
KV_CACHE_OUT=$(wrangler kv namespace create CACHE 2>&1 || true)
KV_CACHE_ID=$(echo "$KV_CACHE_OUT" | grep -oP '"id":\s*"\K[0-9a-f]{32}' | head -1)
if [ -z "$KV_CACHE_ID" ]; then
  # 可能已存在，用 list 查
  KV_CACHE_ID=$(wrangler kv namespace list 2>/dev/null | grep -i "CACHE" | grep -oP '\K[0-9a-f]{32}' | head -1)
fi
ok "KV CACHE: ${KV_CACHE_ID}"

info "创建/获取 KV [MEDIA_KV]..."
KV_MEDIA_OUT=$(wrangler kv namespace create MEDIA_KV 2>&1 || true)
KV_MEDIA_ID=$(echo "$KV_MEDIA_OUT" | grep -oP '"id":\s*"\K[0-9a-f]{32}' | head -1)
if [ -z "$KV_MEDIA_ID" ]; then
  KV_MEDIA_ID=$(wrangler kv namespace list 2>/dev/null | grep -i "MEDIA_KV" | grep -oP '\K[0-9a-f]{32}' | head -1)
fi
ok "KV MEDIA_KV: ${KV_MEDIA_ID}"

[ -z "$KV_CACHE_ID" ] || [ -z "$KV_MEDIA_ID" ] && err "无法获取 KV namespace ID"

# ── 5. 注入 ID 到 wrangler.toml ──
info "将资源 ID 注入 wrangler.toml..."
sed -i.bak "s/database_id = \"auto\"/database_id = \"${D1_ID}\"/" wrangler.toml
sed -i.bak "s/id = \"auto\" # 部署脚本会自动替换$/id = \"${KV_CACHE_ID}\"/" wrangler.toml
# 第二个 KV id = "auto" 用更精确匹配
sed -i.bak "s/^id = \"auto\".*MEDIA_KV.*$/id = \"${KV_MEDIA_ID}\"/" wrangler.toml
# 兜底：如果上面没匹配到，直接替换剩下的 auto
sed -i.bak "s/id = \"auto\"/id = \"${KV_MEDIA_ID}\"/" wrangler.toml
rm -f wrangler.toml.bak
ok "wrangler.toml 已更新"

# ── 6. 跑数据库迁移 ──
info "执行数据库迁移..."
wrangler d1 migrations apply media_gallery_db --remote --yes
ok "迁移完成"

# ── 7. 部署 ──
info "部署到 Cloudflare Workers..."
wrangler deploy
ok "部署成功！"

# ── 8. 输出结果 ──
WORKER_URL=$(wrangler deployments list 2>/dev/null | grep -oP 'https://\S+\.workers\.dev' | head -1 || echo "https://media-gallery.<你的用户名>.workers.dev")
echo ""
echo -e "${G}╔══════════════════════════════════════════╗${NC}"
echo -e "${G}║  ✅ 部署完成！                            ║${NC}"
echo -e "${G}╠══════════════════════════════════════════╣${NC}"
echo -e "${G}║  前台: ${WORKER_URL}/${NC}"
echo -e "${G}║  后台: ${WORKER_URL}/admin${NC}"
echo -e "${G}║  默认密码: admin123（请尽快修改）      ║${NC}"
echo -e "${G}╚══════════════════════════════════════════╝${NC}"
echo ""
echo -e "${Y}下一步：绑定自定义域名${NC}"
echo -e "  Dashboard → Workers & Pages → media-gallery"
echo -e "  → Settings → Domains & Routes → Add Custom Domain"
echo -e "  输入你的域名（如 gallery.你的域名.com）→ 确认"
echo -e "  等待 1~5 分钟变 Active 即可访问。"
