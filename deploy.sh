#!/bin/bash
# ============================================================
#  Media Gallery — 一键部署脚本
#  用法：chmod +x deploy.sh && ./deploy.sh
#  前提：已 wrangler login，且已在 CF 控制台建好 D1 + KV×2
# ============================================================
set -e

echo "🔍 检查 wrangler..."
command -v wrangler >/dev/null || { echo "❌ 请先 npm i -g wrangler"; exit 1; }

echo "📦 安装依赖..."
npm install --silent

echo "🗄️  创建 D1 数据库（如已存在会报错，忽略即可）..."
wrangler d1 create media_gallery_db 2>/dev/null || true

echo "🗄️  创建 KV：media_kv / media_cache..."
wrangler kv namespace create media_kv 2>/dev/null || true
wrangler kv namespace create media_cache 2>/dev/null || true

echo ""
echo "⚠️  请将上面输出的 ID 填入 wrangler.toml 对应位置"
echo "   然后重新运行此脚本（或直接 wrangler deploy）"
echo ""
echo "🚀 部署..."
wrangler deploy

echo ""
echo "✅ 部署完成！"
echo "   访问 https://你的域名/api/init/你的INIT_SECRET 完成初始化"
