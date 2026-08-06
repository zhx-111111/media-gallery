/**
 * Media Gallery — Cloudflare Workers + D1 + KV
 *  - 图片 → KV (≤25MB)，删除时同步 KV.delete 彻底释放
 *  - 视频 → 外链 URL（YouTube / B站 / 任意 mp4）
 *  - 文字 → D1 直接存
 *  UI：Apple 风格（浅色、毛玻璃、圆角、SF 字体、柔和阴影）
 */

// ===================== 工具函数 =====================

async function sha256(text) {
  const encoder = new TextEncoder();
  const hash = await crypto.subtle.digest('SHA-256', encoder.encode(text));
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function randomStr(len = 16) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let r = '';
  for (let i = 0; i < len; i++) r += chars.charAt(Math.floor(Math.random() * chars.length));
  return r;
}

async function createSession(env, username) {
  const token = randomStr(32);
  const expiry = Date.now() + 7 * 24 * 60 * 60 * 1000;
  await env.CACHE.put(`session:${token}`, JSON.stringify({ username, expiry }), {
    expirationTtl: 7 * 24 * 60 * 60
  });
  return token;
}

async function verifySession(env, token) {
  if (!token) return null;
  const data = await env.CACHE.get(`session:${token}`);
  if (!data) return null;
  try {
    const s = JSON.parse(data);
    if (s.expiry < Date.now()) return null;
    return s;
  } catch { return null; }
}

async function requireAuth(request, env) {
  const cookie = request.headers.get('Cookie') || '';
  const m = cookie.match(/admin_token=([^;]+)/);
  return verifySession(env, m ? m[1] : null);
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { 'Content-Type': 'application/json; charset=utf-8' }
  });
}

function setAuthCookie(token) {
  return `admin_token=${token}; Path=/; Max-Age=${7*24*60*60}; HttpOnly; SameSite=Strict`;
}
function clearAuthCookie() {
  return 'admin_token=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict';
}

function getPagination(url) {
  const p = new URL(url).searchParams;
  const page = Math.max(1, parseInt(p.get('page') || '1'));
  const pageSize = Math.min(100, Math.max(1, parseInt(p.get('pageSize') || '24')));
  return { page, pageSize, offset: (page - 1) * pageSize };
}

// 安全转义
function esc(s) {
  if (!s) return '';
  const d = (typeof document !== 'undefined') ? document.createElement('div')
            : { textContent: s, innerHTML: '' };
  if (d.textContent !== undefined) { d.textContent = s; return d.innerHTML; }
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

// 服务端转义（无 DOM）
function escapeHtml(s) {
  if (!s) return '';
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

// ===================== 路由入口 =====================

async function handleRequest(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // CORS 预检
  if (method === 'OPTIONS') {
    return new Response(null, { headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }});
  }

  // ========== 页面 ==========
  if (path === '/' && method === 'GET') {
    return new Response(renderGalleryPage(env), { headers: { 'Content-Type': 'text/html; charset=utf-8' }});
  }
  if (path === '/admin' && method === 'GET') {
    return new Response(renderAdminPage(env), { headers: { 'Content-Type': 'text/html; charset=utf-8' }});
  }
  if (path === '/login' && method === 'GET') {
    return new Response(renderLoginPage(), { headers: { 'Content-Type': 'text/html; charset=utf-8' }});
  }

  // ========== 公开 API ==========
  if (path === '/api/login' && method === 'POST') return handleLogin(request, env);
  if (path === '/api/logout' && method === 'POST') {
    return json({ success: true }, 200, { 'Set-Cookie': clearAuthCookie() });
  }
  if (path === '/api/auth/check' && method === 'GET') {
    const s = await requireAuth(request, env);
    return json({ authenticated: !!s, user: s?.username || null });
  }
  if (path === '/api/media' && method === 'GET') return handleListMedia(request, env);
  if (path.startsWith('/api/media/') && method === 'GET') {
    const id = path.split('/')[3]; if (id && !isNaN(id)) return handleGetMedia(id, env);
  }
  // KV 文件代理（图片）
  if (path.startsWith('/file/') && method === 'GET') {
    return handleFileProxy(path.slice(6), env);
  }

  // ========== 鉴权后 API ==========
  const session = await requireAuth(request, env);
  const authed = !!session;

  if (path === '/api/media' && method === 'POST') {
    if (!authed) return json({ error: '未登录' }, 401);
    return handleCreateMedia(request, env);
  }
  if (path.startsWith('/api/media/') && method === 'PUT') {
    if (!authed) return json({ error: '未登录' }, 401);
    const id = path.split('/')[3]; if (id && !isNaN(id)) return handleUpdateMedia(request, id, env);
  }
  if (path.startsWith('/api/media/') && method === 'DELETE') {
    if (!authed) return json({ error: '未登录' }, 401);
    const id = path.split('/')[3]; if (id && !isNaN(id)) return handleDeleteMedia(id, env);
  }
  if (path === '/api/media/batch-delete' && method === 'POST') {
    if (!authed) return json({ error: '未登录' }, 401);
    return handleBatchDeleteMedia(request, env);
  }
  if (path === '/api/upload' && method === 'POST') {
    if (!authed) return json({ error: '未登录' }, 401);
    return handleFileUpload(request, env);
  }

  return new Response('Not Found', { status: 404 });
}

// ===================== API 处理器 =====================

async function handleLogin(request, env) {
  try {
    const body = await request.json();
    const username = (body.username || '').trim();
    const password = (body.password || '').trim();
    if (!username || !password) return json({ error: '请输入用户名和密码' }, 400);

    const hash = await sha256(password);
    const admin = await env.DB.prepare('SELECT * FROM admins WHERE username = ? AND password_hash = ?')
      .bind(username, hash).first();
    if (!admin) return json({ error: '用户名或密码错误' }, 401);

    const token = await createSession(env, username);
    return new Response(JSON.stringify({ success: true, username }), {
      status: 200, headers: { 'Content-Type': 'application/json', 'Set-Cookie': setAuthCookie(token) }
    });
  } catch (err) { return json({ error: '登录失败: ' + err.message }, 500); }
}

async function handleListMedia(request, env) {
  const url = new URL(request.url);
  const { page, pageSize, offset } = getPagination(request.url);
  const type = url.searchParams.get('type') || '';
  const tag = url.searchParams.get('tag') || '';
  const search = url.searchParams.get('search') || '';

  let where = 'WHERE is_public = 1'; const binds = [];
  if (type) { where += ' AND type = ?'; binds.push(type); }
  if (tag) { where += ' AND tags LIKE ?'; binds.push(`%${tag}%`); }
  if (search) { where += ' AND (title LIKE ? OR description LIKE ?)'; binds.push(`%${search}%`, `%${search}%`); }

  const count = await env.DB.prepare(`SELECT COUNT(*) as total FROM media_items ${where}`).bind(...binds).first();
  const total = count?.total || 0;
  const items = await env.DB.prepare(
    `SELECT * FROM media_items ${where} ORDER BY sort_order DESC, created_at DESC LIMIT ? OFFSET ?`
  ).bind(...binds, pageSize, offset).all();

  return json({ items: items.results || [], pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) }});
}

async function handleGetMedia(id, env) {
  const item = await env.DB.prepare('SELECT * FROM media_items WHERE id = ? AND is_public = 1').bind(id).first();
  if (!item) return json({ error: '未找到' }, 404);
  return json(item);
}

async function handleCreateMedia(request, env) {
  try {
    const b = await request.json();
    const { type, title, description, content, thumbnail_key, tags, sort_order, is_public } = b;
    if (!type || !['image','video','text'].includes(type)) return json({ error: '类型必须是 image/video/text' }, 400);
    if (!title || !content) return json({ error: '标题和内容不能为空' }, 400);

    const r = await env.DB.prepare(
      `INSERT INTO media_items (type,title,description,content,thumbnail_key,tags,sort_order,is_public)
       VALUES (?,?,?,?,?,?,?,?)`
    ).bind(type, title, description||'', content, thumbnail_key||null, tags||'', sort_order||0, is_public!==false?1:0).run();

    return json({ success: true, id: r.meta?.last_row_id }, 201);
  } catch (err) { return json({ error: '创建失败: ' + err.message }, 500); }
}

async function handleUpdateMedia(request, id, env) {
  try {
    const b = await request.json();
    const fields = []; const binds = [];
    for (const f of ['type','title','description','content','thumbnail_key','tags','sort_order','is_public']) {
      if (b[f] !== undefined) { fields.push(`${f} = ?`); binds.push(b[f]); }
    }
    if (fields.length === 0) return json({ error: '没有可更新的字段' }, 400);
    fields.push(`updated_at = datetime('now')`);
    binds.push(id);
    await env.DB.prepare(`UPDATE media_items SET ${fields.join(', ')} WHERE id = ?`).bind(...binds).run();
    return json({ success: true });
  } catch (err) { return json({ error: '更新失败: ' + err.message }, 500); }
}

// ===== 删除：D1 + KV 联动，彻底释放存储 =====
async function handleDeleteMedia(id, env) {
  try {
    const item = await env.DB.prepare('SELECT * FROM media_items WHERE id = ?').bind(id).first();
    if (item) {
      // 图片存在 KV 中 → 彻底删除释放配额
      if (item.type === 'image' && item.content) {
        try { await env.MEDIA_KV.delete(item.content); } catch(e) { console.warn('KV delete failed:', e.message); }
      }
      // 缩略图也删
      if (item.thumbnail_key) {
        try { await env.MEDIA_KV.delete(item.thumbnail_key); } catch(e) {}
      }
    }
    await env.DB.prepare('DELETE FROM media_items WHERE id = ?').bind(id).run();
    return json({ success: true, kv_deleted: item?.type === 'image' });
  } catch (err) { return json({ error: '删除失败: ' + err.message }, 500); }
}

async function handleBatchDeleteMedia(request, env) {
  try {
    const { ids } = await request.json();
    if (!Array.isArray(ids) || ids.length === 0) return json({ error: '请选择要删除的项' }, 400);

    let kvDeleted = 0;
    for (const id of ids) {
      const item = await env.DB.prepare('SELECT * FROM media_items WHERE id = ?').bind(id).first();
      if (item) {
        if (item.type === 'image' && item.content) {
          try { await env.MEDIA_KV.delete(item.content); kvDeleted++; } catch(e) {}
        }
        if (item.thumbnail_key) {
          try { await env.MEDIA_KV.delete(item.thumbnail_key); } catch(e) {}
        }
      }
    }
    const placeholders = ids.map(()=>'?').join(',');
    await env.DB.prepare(`DELETE FROM media_items WHERE id IN (${placeholders})`).bind(...ids).run();
    return json({ success: true, deleted: ids.length, kv_deleted: kvDeleted });
  } catch (err) { return json({ error: '批量删除失败: ' + err.message }, 500); }
}

// ===== 上传到 KV（替代 R2）=====
async function handleFileUpload(request, env) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    if (!file || !(file instanceof File)) return json({ error: '未选择文件' }, 400);

    const allowed = ['image/jpeg','image/png','image/gif','image/webp','image/svg+xml','image/avif'];
    if (!allowed.includes(file.type)) return json({ error: `不支持的类型: ${file.type}，仅支持图片` }, 400);

    const maxSize = parseInt(env.MAX_FILE_SIZE) || 24 * 1024 * 1024;
    if (file.size > maxSize) return json({ error: `文件过大 (${(file.size/1024/1024).toFixed(1)}MB)，KV 单值上限 25MB` }, 400);

    const ext = (file.name.split('.').pop() || 'bin').toLowerCase();
    const key = `img/${Date.now()}_${randomStr(8)}.${ext}`;
    const buf = await file.arrayBuffer();

    await env.MEDIA_KV.put(key, buf, {
      metadata: { contentType: file.type, originalName: file.name, uploadedAt: new Date().toISOString() }
    });

    return json({ success: true, key, url: `/file/${key}`, name: file.name, size: file.size, type: file.type });
  } catch (err) { return json({ error: '上传失败: ' + err.message }, 500); }
}

// KV 文件代理
async function handleFileProxy(key, env) {
  try {
    const obj = await env.MEDIA_KV.get(key, { type: 'arrayBuffer', metadata: true });
    if (!obj) return new Response('Not Found', { status: 404 });
    const headers = new Headers();
    headers.set('Content-Type', obj.metadata?.contentType || 'application/octet-stream');
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    return new Response(obj.value, { headers });
  } catch (err) { return new Response('Error: ' + err.message, { status: 500 }); }
}

// ===================== Apple 风格 UI =====================

function renderGalleryPage(env) {
  const siteName = env.SITE_NAME || '媒体画廊';
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${siteName}</title>
<style>
  :root {
    --bg: #f5f5f7;
    --surface: rgba(255,255,255,0.72);
    --surface-solid: #ffffff;
    --text: #1d1d1f;
    --text-secondary: #6e6e73;
    --accent: #0071e3;
    --accent-hover: #0077ed;
    --danger: #ff3b30;
    --success: #34c759;
    --warning: #ff9500;
    --border: rgba(0,0,0,0.08);
    --shadow-sm: 0 1px 2px rgba(0,0,0,0.04);
    --shadow-md: 0 4px 16px rgba(0,0,0,0.08);
    --shadow-lg: 0 12px 40px rgba(0,0,0,0.12);
    --radius-sm: 8px;
    --radius-md: 12px;
    --radius-lg: 18px;
    --radius-xl: 24px;
  }
  * { margin:0; padding:0; box-sizing:border-box; }
  html { scroll-behavior: smooth; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
    background: var(--bg);
    color: var(--text);
    min-height: 100vh;
    -webkit-font-smoothing: antialiased;
    letter-spacing: -0.01em;
  }

  /* Header */
  .nav-bar {
    position: sticky; top: 0; z-index: 100;
    background: rgba(245,245,247,0.8);
    backdrop-filter: saturate(180%) blur(20px);
    -webkit-backdrop-filter: saturate(180%) blur(20px);
    border-bottom: 1px solid var(--border);
    padding: 0.75rem 1.5rem;
  }
  .nav-inner {
    max-width: 1200px; margin: 0 auto;
    display: flex; align-items: center; justify-content: space-between;
  }
  .nav-brand {
    font-size: 1.15rem; font-weight: 600;
    background: linear-gradient(135deg, #0071e3, #5e5ce6);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  }
  .nav-links { display: flex; gap: 0.5rem; align-items: center; }
  .nav-link {
    color: var(--text-secondary); text-decoration: none;
    font-size: 0.85rem; padding: 0.4rem 0.8rem;
    border-radius: var(--radius-sm); transition: all 0.2s;
  }
  .nav-link:hover { background: rgba(0,0,0,0.04); color: var(--text); }

  /* Hero */
  .hero {
    text-align: center; padding: 4rem 1rem 2rem;
    max-width: 800px; margin: 0 auto;
  }
  .hero h1 {
    font-size: clamp(2rem, 5vw, 3.5rem);
    font-weight: 700; letter-spacing: -0.03em;
    line-height: 1.1; margin-bottom: 0.8rem;
  }
  .hero p {
    font-size: 1.1rem; color: var(--text-secondary);
    line-height: 1.5;
  }

  /* Container */
  .container { max-width: 1200px; margin: 0 auto; padding: 0 1.5rem 3rem; }

  /* Controls */
  .controls {
    display: flex; flex-wrap: wrap; gap: 0.6rem;
    margin-bottom: 2rem; align-items: center;
  }
  .search-box {
    flex: 1; min-width: 200px; position: relative;
  }
  .search-box input {
    width: 100%; padding: 0.7rem 1rem 0.7rem 2.4rem;
    background: var(--surface-solid); border: 1px solid var(--border);
    border-radius: var(--radius-md); font-size: 0.95rem;
    color: var(--text); outline: none; transition: all 0.2s;
    font-family: inherit;
  }
  .search-box input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(0,113,227,0.1); }
  .search-box::before {
    content: '🔍'; position: absolute; left: 0.8rem; top: 50%;
    transform: translateY(-50%); font-size: 0.9rem; opacity: 0.5;
  }
  .filter-btn {
    padding: 0.6rem 1.1rem; border-radius: var(--radius-md);
    border: 1px solid var(--border); background: var(--surface-solid);
    color: var(--text-secondary); font-size: 0.9rem; cursor: pointer;
    transition: all 0.2s; font-family: inherit;
  }
  .filter-btn:hover { border-color: var(--accent); color: var(--accent); }
  .filter-btn.active { background: var(--accent); color: #fff; border-color: var(--accent); }

  /* Gallery Grid */
  .gallery-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 1rem;
  }
  .gallery-item {
    background: var(--surface-solid);
    border-radius: var(--radius-lg);
    overflow: hidden;
    box-shadow: var(--shadow-sm);
    transition: transform 0.3s cubic-bezier(0.25,0.8,0.25,1), box-shadow 0.3s;
    cursor: pointer;
    border: 1px solid var(--border);
  }
  .gallery-item:hover {
    transform: translateY(-4px);
    box-shadow: var(--shadow-lg);
  }
  .item-media-wrap {
    position: relative; width: 100%; aspect-ratio: 4/3; overflow: hidden;
    background: #f0f0f3;
  }
  .item-media {
    width: 100%; height: 100%; object-fit: cover;
    transition: transform 0.5s ease;
  }
  .gallery-item:hover .item-media { transform: scale(1.03); }
  .item-placeholder {
    width: 100%; height: 100%;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    background: linear-gradient(135deg, #f5f5f7, #e8e8ed);
    color: var(--text-secondary); gap: 0.5rem;
  }
  .item-placeholder .icon { font-size: 2rem; }
  .item-placeholder .label { font-size: 0.8rem; }
  .item-body { padding: 0.9rem 1rem 1rem; }
  .item-title {
    font-size: 0.95rem; font-weight: 600;
    margin-bottom: 0.3rem; color: var(--text);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .item-desc {
    font-size: 0.82rem; color: var(--text-secondary);
    line-height: 1.4; display: -webkit-box;
    -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
  }
  .item-tags { margin-top: 0.5rem; display: flex; flex-wrap: wrap; gap: 0.3rem; }
  .item-tag {
    background: rgba(0,113,227,0.08); color: var(--accent);
    padding: 0.15rem 0.55rem; border-radius: 4px; font-size: 0.72rem; font-weight: 500;
  }
  .type-badge {
    position: absolute; top: 0.6rem; right: 0.6rem;
    background: rgba(255,255,255,0.92); backdrop-filter: blur(8px);
    padding: 0.2rem 0.55rem; border-radius: 6px;
    font-size: 0.7rem; font-weight: 600;
    box-shadow: var(--shadow-sm);
  }

  /* Pagination */
  .pagination {
    display: flex; justify-content: center; align-items: center;
    gap: 0.8rem; margin: 2.5rem 0 1rem;
  }
  .pagination button {
    padding: 0.5rem 1.1rem; border-radius: var(--radius-md);
    border: 1px solid var(--border); background: var(--surface-solid);
    color: var(--text); font-size: 0.9rem; cursor: pointer;
    transition: all 0.2s; font-family: inherit;
  }
  .pagination button:hover:not(:disabled) { background: var(--accent); color: #fff; border-color: var(--accent); }
  .pagination button:disabled { opacity: 0.35; cursor: not-allowed; }
  .pagination span { color: var(--text-secondary); font-size: 0.85rem; }

  /* Empty */
  .empty-state {
    text-align: center; padding: 5rem 1rem;
    color: var(--text-secondary);
  }
  .empty-state .icon { font-size: 3rem; margin-bottom: 1rem; }
  .empty-state h3 { font-size: 1.2rem; font-weight: 600; margin-bottom: 0.4rem; color: var(--text); }

  /* Admin FAB */
  .admin-fab {
    position: fixed; bottom: 1.5rem; right: 1.5rem;
    width: 52px; height: 52px; border-radius: 50%;
    background: var(--accent); color: #fff;
    display: flex; align-items: center; justify-content: center;
    text-decoration: none; font-size: 1.3rem;
    box-shadow: 0 4px 16px rgba(0,113,227,0.35);
    transition: transform 0.2s, box-shadow 0.2s;
    z-index: 50;
  }
  .admin-fab:hover { transform: scale(1.08); box-shadow: 0 6px 24px rgba(0,113,227,0.45); }

  /* Modal */
  .modal-overlay {
    display: none; position: fixed;
    inset: 0; background: rgba(0,0,0,0.4);
    backdrop-filter: blur(4px); z-index: 1000;
    align-items: center; justify-content: center; padding: 1rem;
    opacity: 0; transition: opacity 0.3s;
  }
  .modal-overlay.active { display: flex; opacity: 1; }
  .modal-content {
    background: var(--surface-solid); border-radius: var(--radius-xl);
    max-width: 720px; width: 100%; max-height: 85vh; overflow-y: auto;
    box-shadow: var(--shadow-lg); border: 1px solid var(--border);
    transform: scale(0.96); transition: transform 0.3s cubic-bezier(0.25,0.8,0.25,1);
  }
  .modal-overlay.active .modal-content { transform: scale(1); }
  .modal-header {
    display: flex; justify-content: space-between; align-items: center;
    padding: 1.2rem 1.5rem; border-bottom: 1px solid var(--border);
  }
  .modal-header h2 { font-size: 1.15rem; font-weight: 600; }
  .modal-close {
    background: #f0f0f3; border: none; width: 32px; height: 32px;
    border-radius: 50%; font-size: 1.1rem; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    color: var(--text-secondary); transition: all 0.2s;
  }
  .modal-close:hover { background: #e0e0e5; color: var(--text); }
  .modal-body { padding: 1.5rem; }
  .modal-body img, .modal-body video {
    width: 100%; border-radius: var(--radius-md); margin-bottom: 1rem;
  }
  .modal-body p { color: var(--text-secondary); line-height: 1.6; white-space: pre-wrap; }
  .modal-meta { margin-top: 1rem; display: flex; flex-wrap: wrap; gap: 0.4rem; }

  @media (max-width: 600px) {
    .gallery-grid { grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 0.7rem; }
    .hero { padding: 2rem 1rem 1rem; }
  }
</style>
</head>
<body>

<nav class="nav-bar">
  <div class="nav-inner">
    <div class="nav-brand">${siteName}</div>
    <div class="nav-links">
      <a href="#" class="nav-link" id="navAll">全部</a>
      <a href="#" class="nav-link" id="navImage">图片</a>
      <a href="#" class="nav-link" id="navVideo">视频</a>
      <a href="#" class="nav-link" id="navText">文字</a>
    </div>
  </div>
</nav>

<div class="hero">
  <h1>${siteName}</h1>
  <p>图片 · 视频 · 文字 — 一切精彩，尽收眼底</p>
</div>

<div class="container">
  <div class="controls">
    <div class="search-box">
      <input type="text" id="searchInput" placeholder="搜索标题或描述..." />
    </div>
  </div>
  <div id="galleryContainer">
    <div class="empty-state"><div class="icon">⏳</div><h3>加载中...</h3></div>
  </div>
  <div class="pagination" id="pagination"></div>
</div>

<a href="/admin" class="admin-fab" title="管理后台">⚙︎</a>

<div class="modal-overlay" id="modal">
  <div class="modal-content">
    <div class="modal-header">
      <h2 id="modalTitle"></h2>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <div class="modal-body" id="modalBody"></div>
  </div>
</div>

<script>
  let currentPage = 1, currentType = '', currentSearch = '', totalPages = 1;
  const container = document.getElementById('galleryContainer');
  const paginationEl = document.getElementById('pagination');
  const searchInput = document.getElementById('searchInput');

  // Nav filter
  const navMap = { navAll:'', navImage:'image', navVideo:'video', navText:'text' };
  Object.keys(navMap).forEach(id => {
    document.getElementById(id).addEventListener('click', e => {
      e.preventDefault();
      currentType = navMap[id];
      currentPage = 1;
      document.querySelectorAll('.nav-link').forEach(a => a.classList.remove('active'));
      e.target.classList.add('active');
      fetchMedia();
    });
  });

  async function fetchMedia() {
    const params = new URLSearchParams({ page: currentPage, pageSize: 24 });
    if (currentType) params.set('type', currentType);
    if (currentSearch) params.set('search', currentSearch);
    try {
      const res = await fetch('/api/media?' + params);
      const data = await res.json();
      renderGallery(data);
    } catch (err) {
      container.innerHTML = '<div class="empty-state"><div class="icon">❌</div><h3>加载失败</h3><p>'+err.message+'</p></div>';
    }
  }

  function renderGallery(data) {
    const items = data.items || [];
    totalPages = data.pagination?.totalPages || 1;

    if (items.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="icon">📭</div><h3>暂无内容</h3><p>还没有添加任何媒体内容</p></div>';
      paginationEl.innerHTML = ''; return;
    }

    container.innerHTML = '<div class="gallery-grid">' + items.map(item => {
      let mediaHtml = '';
      if (item.type === 'image') {
        mediaHtml = '<div class="item-media-wrap"><img class="item-media" src="/file/'+escapeHtml(item.content)+'" alt="'+escapeHtml(item.title)+'" loading="lazy" /><span class="type-badge">🖼 图片</span></div>';
      } else if (item.type === 'video') {
        mediaHtml = '<div class="item-media-wrap"><video class="item-media" src="'+escapeHtml(item.content)+'" muted preload="metadata" poster=""></video><span class="type-badge">🎬 视频</span></div>';
      } else {
        mediaHtml = '<div class="item-media-wrap"><div class="item-placeholder"><span class="icon">📝</span><span class="label">文字</span></div><span class="type-badge">📝 文字</span></div>';
      }
      const tagsHtml = (item.tags||'').split(',').filter(t=>t.trim()).map(t => '<span class="item-tag">'+escapeHtml(t.trim())+'</span>').join('');
      return '<div class="gallery-item" onclick="openItem('+item.id+')">'+mediaHtml+
        '<div class="item-body"><div class="item-title">'+escapeHtml(item.title)+'</div>'+
        (item.description?'<div class="item-desc">'+escapeHtml(item.description)+'</div>':'')+
        (tagsHtml?'<div class="item-tags">'+tagsHtml+'</div>':'')+
        '</div></div>';
    }).join('') + '</div>';

    renderPagination();
  }

  function renderPagination() {
    if (totalPages <= 1) { paginationEl.innerHTML = ''; return; }
    paginationEl.innerHTML =
      '<button '+(currentPage<=1?'disabled':'')+' onclick="changePage('+(currentPage-1)+')">← 上一页</button>'+
      '<span>第 '+currentPage+' / '+totalPages+' 页</span>'+
      '<button '+(currentPage>=totalPages?'disabled':'')+' onclick="changePage('+(currentPage+1)+')">下一页 →</button>';
  }

  function changePage(p) { currentPage = p; fetchMedia(); window.scrollTo({top:0,behavior:'smooth'}); }

  async function openItem(id) {
    try {
      const res = await fetch('/api/media/'+id);
      const item = await res.json();
      if (!res.ok) throw new Error(item.error||'加载失败');
      document.getElementById('modalTitle').textContent = item.title;
      let body = '';
      if (item.type === 'image') body = '<img src="/file/'+escapeHtml(item.content)+'" alt="'+escapeHtml(item.title)+'" />';
      else if (item.type === 'video') body = '<video src="'+escapeHtml(item.content)+'" controls autoplay></video>';
      if (item.description) body += '<p><strong>描述：</strong>'+escapeHtml(item.description)+'</p>';
      if (item.type === 'text') body += '<p>'+escapeHtml(item.content).replace(/\\n/g,'<br>')+'</p>';
      if (item.tags) body += '<div class="modal-meta">'+item.tags.split(',').filter(t=>t.trim()).map(t=>'<span class="item-tag">'+escapeHtml(t.trim())+'</span>').join('')+'</div>';
      document.getElementById('modalBody').innerHTML = body;
      document.getElementById('modal').classList.add('active');
    } catch (err) { alert('加载详情失败: '+err.message); }
  }

  function closeModal() { document.getElementById('modal').classList.remove('active'); }

  let searchTimeout;
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => { currentSearch = searchInput.value.trim(); currentPage = 1; fetchMedia(); }, 300);
  });

  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
  document.getElementById('modal').addEventListener('click', e => { if (e.target === e.currentTarget) closeModal(); });

  function escapeHtml(str) { if (!str) return ''; const d = document.createElement('div'); d.textContent = str; return d.innerHTML; }

  fetchMedia();
</script>
</body>
</html>`;
}

function renderLoginPage() {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>登录 — 管理后台</title>
<style>
  :root {
    --bg: #f5f5f7; --surface: rgba(255,255,255,0.72); --text: #1d1d1f; --text2: #6e6e73;
    --accent: #0071e3; --border: rgba(0,0,0,0.08); --radius: 16px; --radius-sm: 10px;
    --shadow: 0 8px 30px rgba(0,0,0,0.08);
  }
  * { margin:0; padding:0; box-sizing:border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'PingFang SC', sans-serif;
    background: var(--bg); color: var(--text); min-height: 100vh;
    display: flex; align-items: center; justify-content: center;
    -webkit-font-smoothing: antialiased;
  }
  .login-card {
    background: rgba(255,255,255,0.85); backdrop-filter: blur(20px);
    border: 1px solid var(--border); border-radius: var(--radius);
    padding: 2.5rem; width: 100%; max-width: 380px; box-shadow: var(--shadow);
  }
  .login-card h1 { font-size: 1.4rem; font-weight: 700; text-align: center; margin-bottom: 0.3rem; }
  .login-card p { text-align: center; color: var(--text2); font-size: 0.9rem; margin-bottom: 2rem; }
  .form-group { margin-bottom: 1rem; }
  .form-group label { display: block; margin-bottom: 0.35rem; color: var(--text2); font-size: 0.85rem; font-weight: 500; }
  .form-group input {
    width: 100%; padding: 0.75rem 1rem; background: #fff;
    border: 1px solid var(--border); border-radius: var(--radius-sm);
    font-size: 1rem; color: var(--text); outline: none; transition: all 0.2s;
    font-family: inherit;
  }
  .form-group input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(0,113,227,0.1); }
  .btn-primary {
    width: 100%; padding: 0.8rem; background: var(--accent); color: #fff;
    border: none; border-radius: var(--radius-sm); font-size: 1rem; font-weight: 500;
    cursor: pointer; transition: all 0.2s; font-family: inherit;
    margin-top: 0.5rem;
  }
  .btn-primary:hover { background: #0077ed; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,113,227,0.3); }
  .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
  .error-msg { color: #ff3b30; font-size: 0.85rem; margin-top: 0.8rem; text-align: center; min-height: 1.2em; }
  .back-link { display: block; text-align: center; margin-top: 1.5rem; color: var(--text2); text-decoration: none; font-size: 0.85rem; }
  .back-link:hover { color: var(--accent); }
</style>
</head>
<body>
<div class="login-card">
  <h1>管理后台</h1>
  <p>请输入管理员凭据</p>
  <form id="loginForm">
    <div class="form-group">
      <label for="username">用户名</label>
      <input type="text" id="username" placeholder="admin" autocomplete="username" required />
    </div>
    <div class="form-group">
      <label for="password">密码</label>
      <input type="password" id="password" placeholder="••••••••" autocomplete="current-password" required />
    </div>
    <button type="submit" class="btn-primary" id="loginBtn">登 录</button>
    <div class="error-msg" id="errorMsg"></div>
  </form>
  <a href="/" class="back-link">← 返回首页</a>
</div>
<script>
  document.getElementById('loginForm').addEventListener('submit', async e => {
    e.preventDefault();
    const btn = document.getElementById('loginBtn');
    const errEl = document.getElementById('errorMsg');
    btn.disabled = true; btn.textContent = '登录中...'; errEl.textContent = '';
    try {
      const res = await fetch('/api/login', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ username:document.getElementById('username').value.trim(), password:document.getElementById('password').value.trim() }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error||'登录失败');
      window.location.href = '/admin';
    } catch (err) { errEl.textContent = err.message; }
    finally { btn.disabled = false; btn.textContent = '登 录'; }
  });
</script>
</body>
</html>`;
}

function renderAdminPage(env) {
  const siteName = env.SITE_NAME || '媒体画廊';
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>管理后台 — ${siteName}</title>
<style>
  :root {
    --bg: #f5f5f7; --surface: rgba(255,255,255,0.72); --surface-solid: #ffffff;
    --text: #1d1d1f; --text2: #6e6e73; --accent: #0071e3; --accent2: #5e5ce6;
    --danger: #ff3b30; --success: #34c759; --warning: #ff9500;
    --border: rgba(0,0,0,0.08); --shadow: 0 4px 16px rgba(0,0,0,0.06);
    --shadow-lg: 0 12px 40px rgba(0,0,0,0.12);
    --radius: 12px; --radius-lg: 18px; --radius-xl: 24px;
  }
  * { margin:0; padding:0; box-sizing:border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'PingFang SC', sans-serif;
    background: var(--bg); color: var(--text); min-height: 100vh;
    -webkit-font-smoothing: antialiased; letter-spacing: -0.01em;
  }

  /* Nav */
  .nav-bar {
    position: sticky; top: 0; z-index: 100;
    background: rgba(245,245,247,0.8); backdrop-filter: saturate(180%) blur(20px);
    border-bottom: 1px solid var(--border); padding: 0.7rem 1.5rem;
  }
  .nav-inner { max-width: 1200px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; }
  .nav-brand { font-size: 1.1rem; font-weight: 600; background: linear-gradient(135deg, var(--accent), var(--accent2)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
  .header-actions { display: flex; gap: 0.6rem; align-items: center; }

  /* Buttons */
  .btn {
    padding: 0.5rem 1rem; border-radius: var(--radius); border: 1px solid var(--border);
    background: var(--surface-solid); color: var(--text); font-size: 0.85rem; cursor: pointer;
    transition: all 0.2s; text-decoration: none; display: inline-flex; align-items: center; gap: 0.3rem;
    font-family: inherit; font-weight: 500;
  }
  .btn:hover { border-color: #c0c0c5; transform: translateY(-1px); box-shadow: var(--shadow); }
  .btn-primary { background: var(--accent); color: #fff; border-color: var(--accent); }
  .btn-primary:hover { background: #0077ed; border-color: #0077ed; }
  .btn-danger { background: #fff; border-color: rgba(255,59,48,0.3); color: var(--danger); }
  .btn-danger:hover { background: var(--danger); color: #fff; border-color: var(--danger); }
  .btn-success { background: #f0faf4; border-color: rgba(52,199,89,0.3); color: var(--success); }
  .btn-success:hover { background: var(--success); color: #fff; }
  .btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }

  .container { max-width: 1200px; margin: 0 auto; padding: 1.5rem; }

  /* Stats */
  .stats-bar { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 0.8rem; margin-bottom: 1.5rem; }
  .stat-card {
    background: var(--surface-solid); border: 1px solid var(--border);
    border-radius: var(--radius-lg); padding: 1rem 1.2rem; box-shadow: var(--shadow);
  }
  .stat-card .label { color: var(--text2); font-size: 0.78rem; font-weight: 500; margin-bottom: 0.2rem; }
  .stat-card .value { font-size: 1.6rem; font-weight: 700; }
  .stat-card.total .value { color: var(--text); }
  .stat-card.images .value { color: var(--accent); }
  .stat-card.videos .value { color: var(--accent2); }
  .stat-card.texts .value { color: var(--warning); }
  .stat-card.storage .value { color: var(--success); font-size: 1.2rem; }

  /* Toolbar */
  .toolbar { display: flex; flex-wrap: wrap; gap: 0.6rem; margin-bottom: 1.2rem; align-items: center; }
  .toolbar .search-box { flex: 1; min-width: 180px; position: relative; }
  .toolbar input[type="text"] {
    width: 100%; padding: 0.6rem 1rem 0.6rem 2.2rem; background: var(--surface-solid);
    border: 1px solid var(--border); border-radius: var(--radius); font-size: 0.9rem;
    outline: none; transition: all 0.2s; font-family: inherit; color: var(--text);
  }
  .toolbar input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(0,113,227,0.1); }
  .toolbar .search-box::before { content:'🔍'; position:absolute; left:0.7rem; top:50%; transform:translateY(-50%); opacity:0.4; font-size:0.85rem; }
  .toolbar select {
    padding: 0.6rem 0.8rem; background: var(--surface-solid); border: 1px solid var(--border);
    border-radius: var(--radius); font-size: 0.85rem; color: var(--text); outline: none; font-family: inherit;
  }
  .toolbar select:focus { border-color: var(--accent); }

  /* Table */
  .table-wrap {
    background: var(--surface-solid); border: 1px solid var(--border);
    border-radius: var(--radius-lg); overflow: hidden; box-shadow: var(--shadow);
  }
  table { width: 100%; border-collapse: collapse; }
  th { background: #fafafc; padding: 0.7rem 1rem; text-align: left; color: var(--text2); font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid var(--border); }
  td { padding: 0.7rem 1rem; border-bottom: 1px solid var(--border); font-size: 0.85rem; vertical-align: middle; }
  tr:last-child td { border-bottom: none; }
  tr:hover { background: #fafafc; }
  .col-cb { width: 36px; } .col-prev { width: 72px; } .col-act { width: 140px; text-align: right; }
  .preview-thumb { width: 56px; height: 38px; object-fit: cover; border-radius: 6px; background: #f0f0f3; }
  .preview-placeholder { width: 56px; height: 38px; display: flex; align-items: center; justify-content: center; background: #f0f0f3; border-radius: 6px; font-size: 0.9rem; }
  .type-badge { display: inline-block; padding: 0.15rem 0.55rem; border-radius: 6px; font-size: 0.75rem; font-weight: 500; }
  .type-badge.image { background: rgba(0,113,227,0.1); color: var(--accent); }
  .type-badge.video { background: rgba(94,92,230,0.1); color: var(--accent2); }
  .type-badge.text { background: rgba(255,149,0,0.1); color: var(--warning); }
  .status-dot { display: inline-block; width: 7px; height: 7px; border-radius: 50%; margin-right: 0.3rem; vertical-align: middle; }
  .status-dot.public { background: var(--success); }
  .status-dot.private { background: var(--warning); }
  .action-btns { display: flex; gap: 0.35rem; justify-content: flex-end; }
  .action-btns .btn { padding: 0.3rem 0.6rem; font-size: 0.78rem; }

  /* Modal */
  .modal-overlay {
    display: none; position: fixed; inset: 0;
    background: rgba(0,0,0,0.4); backdrop-filter: blur(4px);
    z-index: 1000; align-items: center; justify-content: center; padding: 1rem;
    opacity: 0; transition: opacity 0.3s;
  }
  .modal-overlay.active { display: flex; opacity: 1; }
  .modal-content {
    background: var(--surface-solid); border-radius: var(--radius-xl);
    max-width: 560px; width: 100%; border: 1px solid var(--border);
    box-shadow: var(--shadow-lg); overflow: hidden;
    transform: scale(0.96); transition: transform 0.3s cubic-bezier(0.25,0.8,0.25,1);
  }
  .modal-overlay.active .modal-content { transform: scale(1); }
  .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 1.1rem 1.5rem; border-bottom: 1px solid var(--border); }
  .modal-header h2 { font-size: 1.1rem; font-weight: 600; }
  .modal-close { background: #f0f0f3; border: none; width: 30px; height: 30px; border-radius: 50%; font-size: 1rem; cursor: pointer; color: var(--text2); }
  .modal-close:hover { background: #e0e0e5; }
  .modal-body { padding: 1.5rem; max-height: 70vh; overflow-y: auto; }
  .modal-footer { padding: 1rem 1.5rem; border-top: 1px solid var(--border); display: flex; justify-content: flex-end; gap: 0.6rem; }

  /* Form */
  .form-group { margin-bottom: 1rem; }
  .form-group label { display: block; margin-bottom: 0.3rem; color: var(--text2); font-size: 0.82rem; font-weight: 500; }
  .form-group input, .form-group select, .form-group textarea {
    width: 100%; padding: 0.65rem 0.9rem; background: #fafafc;
    border: 1px solid var(--border); border-radius: var(--radius);
    font-size: 0.9rem; color: var(--text); outline: none; transition: all 0.2s; font-family: inherit;
  }
  .form-group textarea { min-height: 80px; resize: vertical; }
  .form-group input:focus, .form-group select:focus, .form-group textarea:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(0,113,227,0.1); background: #fff; }

  /* Upload */
  .upload-area {
    border: 2px dashed var(--border); border-radius: var(--radius);
    padding: 1.8rem 1rem; text-align: center; cursor: pointer;
    transition: all 0.3s; margin-bottom: 1rem; background: #fafafc;
  }
  .upload-area:hover, .upload-area.dragover { border-color: var(--accent); background: rgba(0,113,227,0.04); }
  .upload-area p { color: var(--text2); margin-bottom: 0.5rem; font-size: 0.9rem; }
  .upload-btn { background: var(--accent); color: #fff; border: none; padding: 0.5rem 1.2rem; border-radius: var(--radius-sm); font-size: 0.85rem; cursor: pointer; font-family: inherit; }
  .upload-progress { margin-top: 0.5rem; display: none; }
  .upload-progress.active { display: block; }
  .progress-track { height: 4px; background: #e8e8ed; border-radius: 2px; overflow: hidden; }
  .progress-fill { height: 100%; background: linear-gradient(90deg, var(--accent), var(--accent2)); width: 0%; transition: width 0.3s; }

  .checkbox { width: 16px; height: 16px; cursor: pointer; accent-color: var(--accent); }

  /* Toast */
  .toast {
    position: fixed; top: 1rem; right: 1rem; padding: 0.7rem 1.2rem;
    border-radius: var(--radius); color: #fff; font-size: 0.9rem; z-index: 2000;
    opacity: 0; transform: translateY(-10px); transition: opacity 0.3s, transform 0.3s;
    pointer-events: none; font-weight: 500;
  }
  .toast.show { opacity: 1; transform: translateY(0); }
  .toast.success { background: var(--success); }
  .toast.error { background: var(--danger); }

  .empty-state { text-align: center; padding: 3rem 1rem; color: var(--text2); }
  .empty-state .icon { font-size: 2.5rem; margin-bottom: 0.8rem; }
  .empty-state h3 { font-size: 1.1rem; font-weight: 600; color: var(--text); margin-bottom: 0.3rem; }

  .kv-info {
    background: rgba(0,113,227,0.06); border: 1px solid rgba(0,113,227,0.15);
    border-radius: var(--radius); padding: 0.7rem 0.9rem; margin-bottom: 1rem;
    font-size: 0.8rem; color: var(--accent); line-height: 1.5;
  }

  @media (max-width: 768px) {
    .col-prev, .col-tags, .col-date { display: none; }
    .stats-bar { grid-template-columns: repeat(2, 1fr); }
  }
</style>
</head>
<body>

<nav class="nav-bar">
  <div class="nav-inner">
    <div class="nav-brand">${siteName} · 后台</div>
    <div class="header-actions">
      <a href="/" class="btn">👁 查看前台</a>
      <button class="btn btn-danger" onclick="logout()">退出</button>
    </div>
  </div>
</nav>

<div class="container">
  <!-- 统计 -->
  <div class="stats-bar" id="statsBar">
    <div class="stat-card total"><div class="label">总计</div><div class="value" id="statTotal">-</div></div>
    <div class="stat-card images"><div class="label">图片</div><div class="value" id="statImages">-</div></div>
    <div class="stat-card videos"><div class="label">视频</div><div class="value" id="statVideos">-</div></div>
    <div class="stat-card texts"><div class="label">文字</div><div class="value" id="statTexts">-</div></div>
    <div class="stat-card storage"><div class="label">存储用量</div><div class="value" id="statStorage">-</div></div>
  </div>

  <!-- 工具栏 -->
  <div class="toolbar">
    <div class="search-box">
      <input type="text" id="searchInput" placeholder="搜索标题..." />
    </div>
    <select id="typeFilter">
      <option value="">全部类型</option>
      <option value="image">🖼 图片</option>
      <option value="video">🎬 视频</option>
      <option value="text">📝 文字</option>
    </select>
    <button class="btn btn-primary" onclick="openCreateModal()">＋ 添加内容</button>
    <button class="btn btn-danger" id="batchDeleteBtn" style="display:none" onclick="batchDelete()">🗑 批量删除</button>
  </div>

  <div id="tableContainer"><div class="empty-state"><div class="icon">⏳</div><h3>加载中...</h3></div></div>
</div>

<!-- 编辑模态框 -->
<div class="modal-overlay" id="editModal">
  <div class="modal-content">
    <div class="modal-header">
      <h2 id="modalTitle">添加内容</h2>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <div class="modal-body">
      <div class="kv-info" id="kvInfo">
        💡 <strong>图片</strong>上传到 KV 存储（单张 ≤25MB），删除时自动从 KV 彻底清除释放空间。<br>
        🎬 <strong>视频</strong>请直接填写外部链接（YouTube/B站/任意 mp4 直链）。
      </div>
      <form id="mediaForm">
        <input type="hidden" id="editId" />
        <div class="form-group">
          <label>类型 *</label>
          <select id="formType" onchange="onTypeChange()">
            <option value="image">🖼 图片（上传到 KV）</option>
            <option value="video">🎬 视频（外链 URL）</option>
            <option value="text">📝 文字</option>
          </select>
        </div>
        <div class="form-group">
          <label>标题 *</label>
          <input type="text" id="formTitle" placeholder="输入标题" />
        </div>

        <!-- 图片上传 -->
        <div id="uploadSection">
          <label style="display:block;margin-bottom:0.3rem;color:var(--text2);font-size:0.82rem;font-weight:500;">上传图片</label>
          <div class="upload-area" id="uploadArea"
               onclick="document.getElementById('fileInput').click()"
               ondragover="event.preventDefault();this.classList.add('dragover')"
               ondragleave="this.classList.remove('dragover')"
               ondrop="handleDrop(event)">
            <p>📁 拖拽图片到此处，或点击选择</p>
            <button type="button" class="upload-btn">选择文件</button>
            <p style="font-size:0.75rem;margin-top:0.5rem;color:var(--text2);">支持 JPG/PNG/GIF/WebP/AVIF/SVG，单张 ≤24MB</p>
          </div>
          <input type="file" id="fileInput" style="display:none" accept="image/*" onchange="handleFileSelect(event)" />
          <div class="upload-progress" id="uploadProgress">
            <div class="progress-track"><div class="progress-fill" id="progressFill"></div></div>
            <p style="font-size:0.78rem;color:var(--text2);margin-top:0.3rem;" id="progressText">上传中...</p>
          </div>
          <div class="form-group" id="fileKeyGroup" style="display:none;">
            <label>已上传文件 Key</label>
            <input type="text" id="formContent" readonly />
          </div>
        </div>

        <!-- 视频外链 -->
        <div class="form-group" id="videoUrlGroup" style="display:none;">
          <label>视频地址（外链 URL）*</label>
          <input type="text" id="formVideoUrl" placeholder="https://... 或 B站/YouTube 嵌入链接" />
          <small style="color:var(--text2);font-size:0.75rem;">支持 mp4 直链、YouTube/B站 iframe 链接</small>
        </div>

        <!-- 文字内容 -->
        <div class="form-group" id="textContentGroup" style="display:none;">
          <label>文字内容 *</label>
          <textarea id="formTextContent" placeholder="输入文字内容..."></textarea>
        </div>

        <div class="form-group">
          <label>描述</label>
          <textarea id="formDescription" placeholder="简短描述（可选）"></textarea>
        </div>
        <div class="form-group">
          <label>标签（逗号分隔）</label>
          <input type="text" id="formTags" placeholder="如: 旅行, 风景, 2026" />
        </div>
        <div style="display:flex;gap:0.8rem;">
          <div class="form-group" style="flex:1;">
            <label>排序权重</label>
            <input type="number" id="formSortOrder" value="0" />
          </div>
          <div class="form-group" style="flex:1;">
            <label>可见性</label>
            <select id="formIsPublic">
              <option value="1">公开</option>
              <option value="0">私有</option>
            </select>
          </div>
        </div>
      </form>
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">取消</button>
      <button class="btn btn-primary" id="saveBtn" onclick="saveMedia()">保存</button>
    </div>
  </div>
</div>

<div class="toast" id="toast"></div>

<script>
  let allItems = [], currentEditingId = null, uploadedFileKey = '';

  checkAuth(); loadStats(); loadMedia();

  async function checkAuth() {
    try { const r = await fetch('/api/auth/check'), d = await r.json();
      if (!d.authenticated) window.location.href = '/login';
    } catch { window.location.href = '/login'; }
  }
  async function logout() { await fetch('/api/logout',{method:'POST'}); window.location.href = '/login'; }

  async function loadStats() {
    try {
      const r = await fetch('/api/media?pageSize=1000'), d = await r.json();
      const items = d.items || [];
      document.getElementById('statTotal').textContent = items.length;
      document.getElementById('statImages').textContent = items.filter(i=>i.type==='image').length;
      document.getElementById('statVideos').textContent = items.filter(i=>i.type==='video').length;
      document.getElementById('statTexts').textContent = items.filter(i=>i.type==='text').length;
      // 估算 KV 用量（图片 content 的 key 存在 KV 中）
      const imgCount = items.filter(i=>i.type==='image').length;
      document.getElementById('statStorage').textContent = imgCount + ' 张';
    } catch {}
  }

  async function loadMedia() {
    const search = document.getElementById('searchInput').value.trim();
    const type = document.getElementById('typeFilter').value;
    const params = new URLSearchParams({ pageSize: 100 });
    if (search) params.set('search', search);
    if (type) params.set('type', type);
    try {
      const r = await fetch('/api/media?'+params), d = await r.json();
      allItems = d.items || []; renderTable();
    } catch {
      document.getElementById('tableContainer').innerHTML = '<div class="empty-state"><div class="icon">❌</div><h3>加载失败</h3></div>';
    }
  }

  function renderTable() {
    if (allItems.length === 0) {
      document.getElementById('tableContainer').innerHTML = '<div class="empty-state"><div class="icon">📭</div><h3>暂无内容</h3><p>点击"添加内容"开始</p></div>';
      return;
    }
    const html = '<div class="table-wrap"><table>'+
      '<thead><tr><th class="col-cb"><input type="checkbox" class="checkbox" id="selectAll" onchange="toggleSelectAll()"></th><th class="col-prev">预览</th><th>标题</th><th>类型</th><th class="col-tags">标签</th><th>状态</th><th class="col-date">更新时间</th><th class="col-act">操作</th></tr></thead><tbody>'+
      allItems.map(item => {
        const prev = item.type==='image' ? '<img class="preview-thumb" src="/file/'+esc(item.content)+'">' :
                     item.type==='video' ? '<div class="preview-placeholder">🎬</div>' :
                     '<div class="preview-placeholder">📝</div>';
        const tags = (item.tags||'').split(',').filter(t=>t.trim()).slice(0,3).join(', ') || '-';
        const status = item.is_public ? '<span class="status-dot public"></span>公开' : '<span class="status-dot private"></span>私有';
        const tLabel = {image:'🖼 图片',video:'🎬 视频',text:'📝 文字'}[item.type]||item.type;
        return '<tr>'+
          '<td><input type="checkbox" class="checkbox item-check" onchange="updateBatchBtn()" value="'+item.id+'"></td>'+
          '<td>'+prev+'</td>'+
          '<td>'+esc(item.title)+'</td>'+
          '<td><span class="type-badge '+item.type+'">'+tLabel+'</span></td>'+
          '<td class="col-tags">'+esc(tags)+'</td>'+
          '<td>'+status+'</td>'+
          '<td class="col-date" style="color:var(--text2);font-size:0.78rem;">'+formatDate(item.updated_at)+'</td>'+
          '<td><div class="action-btns">'+
            '<button class="btn" onclick="editItem('+item.id+')">编辑</button>'+
            '<button class="btn btn-danger" onclick="deleteItem('+item.id+')">删除</button>'+
          '</div></td></tr>';
      }).join('')+'</tbody></table></div>';
    document.getElementById('tableContainer').innerHTML = html;
  }

  let searchTimeout;
  document.getElementById('searchInput').addEventListener('input', ()=>{
    clearTimeout(searchTimeout); searchTimeout = setTimeout(loadMedia, 300);
  });
  document.getElementById('typeFilter').addEventListener('change', loadMedia);

  function openCreateModal() {
    currentEditingId = null; uploadedFileKey = '';
    document.getElementById('modalTitle').textContent = '添加内容';
    document.getElementById('mediaForm').reset();
    document.getElementById('formContent').value = '';
    document.getElementById('formTextContent').value = '';
    document.getElementById('formVideoUrl').value = '';
    document.getElementById('fileKeyGroup').style.display = 'none';
    document.getElementById('uploadSection').style.display = 'block';
    document.getElementById('videoUrlGroup').style.display = 'none';
    document.getElementById('textContentGroup').style.display = 'none';
    document.getElementById('uploadProgress').classList.remove('active');
    document.getElementById('editModal').classList.add('active');
  }

  async function openEditModal(item) {
    currentEditingId = item.id; uploadedFileKey = item.content||'';
    document.getElementById('modalTitle').textContent = '编辑内容';
    document.getElementById('formType').value = item.type;
    document.getElementById('formTitle').value = item.title;
    document.getElementById('formDescription').value = item.description||'';
    document.getElementById('formTags').value = item.tags||'';
    document.getElementById('formSortOrder').value = item.sort_order||0;
    document.getElementById('formIsPublic').value = item.is_public?'1':'0';
    onTypeChange();
    if (item.type==='text') document.getElementById('formTextContent').value = item.content;
    else if (item.type==='video') document.getElementById('formVideoUrl').value = item.content;
    else { document.getElementById('formContent').value = item.content||''; document.getElementById('fileKeyGroup').style.display = item.content?'block':'none'; }
    document.getElementById('editModal').classList.add('active');
  }

  function closeModal() { document.getElementById('editModal').classList.remove('active'); }

  function onTypeChange() {
    const t = document.getElementById('formType').value;
    document.getElementById('uploadSection').style.display = t==='image'?'block':'none';
    document.getElementById('videoUrlGroup').style.display = t==='video'?'block':'none';
    document.getElementById('textContentGroup').style.display = t==='text'?'block':'none';
  }

  // 文件上传 → KV
  function handleDrop(e) { e.preventDefault(); e.currentTarget.classList.remove('dragover'); if (e.dataTransfer.files[0]) uploadFile(e.dataTransfer.files[0]); }
  function handleFileSelect(e) { if (e.target.files[0]) uploadFile(e.target.files[0]); }

  function uploadFile(file) {
    const fd = new FormData(); fd.append('file', file);
    const prog = document.getElementById('uploadProgress');
    const fill = document.getElementById('progressFill');
    const txt = document.getElementById('progressText');
    prog.classList.add('active'); fill.style.width='0%'; txt.textContent='上传中...';
    const xhr = new XMLHttpRequest(); xhr.open('POST','/api/upload');
    xhr.upload.onprogress = e => { if(e.lengthComputable){ const p=Math.round(e.loaded/e.total*100); fill.style.width=p+'%'; txt.textContent='上传中... '+p+'%'; } };
    xhr.onload = () => {
      const r = JSON.parse(xhr.responseText);
      if (xhr.status===200 && r.success) {
        uploadedFileKey = r.key; document.getElementById('formContent').value = r.key;
        document.getElementById('fileKeyGroup').style.display='block'; fill.style.width='100%';
        txt.textContent='✅ 上传成功: '+r.name+' ('+(r.size/1024/1024).toFixed(1)+'MB)';
        showToast('上传成功','success');
      } else { txt.textContent='❌ '+ (r.error||'上传失败'); showToast(r.error||'上传失败','error'); }
    };
    xhr.onerror = () => { txt.textContent='❌ 网络错误'; showToast('网络错误','error'); };
    xhr.send(fd);
  }

  async function saveMedia() {
    const type = document.getElementById('formType').value;
    const title = document.getElementById('formTitle').value.trim();
    const desc = document.getElementById('formDescription').value.trim();
    const tags = document.getElementById('formTags').value.trim();
    const sort = parseInt(document.getElementById('formSortOrder').value)||0;
    const isPub = document.getElementById('formIsPublic').value==='1';
    if (!title) return showToast('请输入标题','error');

    let content = '';
    if (type==='text') { content = document.getElementById('formTextContent').value.trim(); if(!content) return showToast('请输入文字内容','error'); }
    else if (type==='video') { content = document.getElementById('formVideoUrl').value.trim(); if(!content) return showToast('请输入视频地址','error'); }
    else { content = uploadedFileKey || document.getElementById('formContent').value.trim(); if(!content) return showToast('请先上传图片','error'); }

    const payload = { type, title, description: desc, content, tags, sort_order: sort, is_public: isPub?1:0 };
    const btn = document.getElementById('saveBtn'); btn.disabled=true; btn.textContent='保存中...';
    try {
      const url = currentEditingId ? '/api/media/'+currentEditingId : '/api/media';
      const method = currentEditingId ? 'PUT' : 'POST';
      const r = await fetch(url,{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      const d = await r.json(); if(!r.ok) throw new Error(d.error||'保存失败');
      showToast(currentEditingId?'更新成功':'创建成功','success');
      closeModal(); loadStats(); loadMedia();
    } catch(err) { showToast(err.message,'error'); }
    finally { btn.disabled=false; btn.textContent='保存'; }
  }

  async function editItem(id) {
    try { const r = await fetch('/api/media/'+id), item = await r.json(); if(!r.ok) throw new Error(item.error); openEditModal(item); }
    catch(err){ showToast(err.message,'error'); }
  }

  // 删除（联动 KV 释放）
  async function deleteItem(id) {
    const item = allItems.find(i=>i.id===id);
    const name = item?item.title:'这条内容';
    if (!confirm('确定要删除「'+name+'」吗？\\n\\n图片将同时从 KV 存储中彻底删除释放空间。')) return;
    try {
      const r = await fetch('/api/media/'+id,{method:'DELETE'}), d = await r.json();
      if(!r.ok) throw new Error(d.error||'删除失败');
      const msg = d.kv_deleted ? '已删除并释放 KV 存储' : '已删除';
      showToast(msg,'success'); loadStats(); loadMedia();
    } catch(err) { showToast(err.message,'error'); }
  }

  function toggleSelectAll() { const c=document.getElementById('selectAll').checked; document.querySelectorAll('.item-check').forEach(cb=>cb.checked=c); updateBatchBtn(); }
  function updateBatchBtn() { const n=document.querySelectorAll('.item-check:checked').length; document.getElementById('batchDeleteBtn').style.display=n>0?'inline-flex':'none'; }

  async function batchDelete() {
    const ids = Array.from(document.querySelectorAll('.item-check:checked')).map(cb=>parseInt(cb.value));
    if(!ids.length) return;
    if(!confirm('确定要删除选中的 '+ids.length+' 条内容吗？\\n\\n图片将同时从 KV 中彻底删除释放空间。')) return;
    try {
      const r = await fetch('/api/media/batch-delete',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ids})});
      const d = await r.json(); if(!r.ok) throw new Error(d.error||'批量删除失败');
      showToast('已删除 '+d.deleted+' 条，释放 KV '+d.kv_deleted+' 张图片','success');
      loadStats(); loadMedia();
    } catch(err) { showToast(err.message,'error'); }
  }

  function showToast(msg, type) { const t=document.getElementById('toast'); t.textContent=msg; t.className='toast show '+type; setTimeout(()=>t.classList.remove('show'),3000); }
  function esc(s) { if(!s) return ''; const d=document.createElement('div'); d.textContent=s; return d.innerHTML; }
  function formatDate(s) { if(!s) return '-'; return s.replace('T',' ').substring(0,16); }

  document.addEventListener('keydown',e=>{ if(e.key==='Escape') closeModal(); });
  document.getElementById('editModal').addEventListener('click',e=>{ if(e.target===e.currentTarget) closeModal(); });
</script>
</body>
</html>`;
}

// ===================== Worker 入口 =====================

export default {
  async fetch(request, env, ctx) {
    return handleRequest(request, env);
  }
};
