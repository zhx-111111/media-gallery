#!/bin/bash
# 模拟 GitHub Actions 的本地验证脚本
# 用假 ID 走一遍完整流程，验证 sed 替换 + wrangler 调用链

set -e
cd "$(dirname "$0")"/..

echo "===== ① 模拟注入 Secrets ====="
export D1_DB_ID="fake-d1-1111-2222-3333"
export KV_CACHE_ID="fake-kv-cache-9999"
export KV_MEDIA_ID="fake-kv-media-8888"
export CLOUDFLARE_API_TOKEN="fake-cf-token-7777"

echo "Secrets 已设置（前4位）："
echo "  D1_DB_ID     = ${D1_DB_ID:0:4}..."
echo "  KV_CACHE_ID  = ${KV_CACHE_ID:0:4}..."
echo "  KV_MEDIA_ID  = ${KV_MEDIA_ID:0:4}..."
echo "  CF_API_TOKEN = ${CLOUDFLARE_API_TOKEN:0:4}..."

echo ""
echo "===== ② 模拟 Actions 的 sed 替换 ====="
cp wrangler.toml wrangler.toml.bak
sed -i "s|__D1_DB_ID__|${D1_DB_ID}|g"        wrangler.toml
sed -i "s|__KV_CACHE_ID__|${KV_CACHE_ID}|g"   wrangler.toml
sed -i "s|__KV_MEDIA_ID__|${KV_MEDIA_ID}|g"  wrangler.toml

echo "替换后的 wrangler.toml（脱敏）："
sed -E 's/(database_id|id) = "[^"]*"/\1 = "***"/g' wrangler.toml

echo ""
echo "===== ③ 验证占位符是否全部被替换 ====="
if grep -q "__.*__" wrangler.toml; then
  echo "❌ 仍有未替换的占位符："
  grep "__.*__" wrangler.toml
  exit 1
else
  echo "✅ 所有占位符已成功替换"
fi

echo ""
echo "===== ④ 验证 toml 语法（用 node 解析）====="
node -e "
const fs = require('fs');
const content = fs.readFileSync('wrangler.toml', 'utf8');
// 简单检查关键字段存在
const checks = [
  ['name', 'media-gallery'],
  ['main', 'src/worker.js'],
  ['compatibility_date', '2026-01-01'],
  ['binding = \"DB\"', 'DB binding'],
  ['database_name = \"media_gallery_db\"', 'D1 name'],
  ['binding = \"CACHE\"', 'CACHE binding'],
  ['binding = \"MEDIA_KV\"', 'MEDIA_KV binding'],
];
let pass = 0;
for (const [needle, label] of checks) {
  if (content.includes(needle)) { console.log('  ✅', label); pass++; }
  else { console.log('  ❌', label, '(missing:', needle + ')'); }
}
console.log(\`\\n结果：\${pass}/\${checks.length} 通过\`);
if (pass !== checks.length) process.exit(1);
"

echo ""
echo "===== ⑤ 还原 wrangler.toml ====="
mv wrangler.toml.bak wrangler.toml
echo "✅ 已还原为带占位符的模板版本"

echo ""
echo "===== ⑥ 总结 ====="
echo "如果上面全部 ✅，说明 Actions 流程逻辑正确。"
echo "在 GitHub 上只需确保 4 个 Secrets 都填了真实值即可。"
