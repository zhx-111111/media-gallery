/**
 * Media Gallery — Cloudflare Workers + D1 + KV
 *  - 图片 → KV (≤25MB)，删除时同步 KV.delete 彻底释放
 *  - 视频 → 外链 URL（YouTube / B站 / 任意 mp4）
 *  - 文字 → D1 直接存
 *  - 站点标题/副标题/分类 → D1 site_settings 表，后台可自定义
 *  - 预览 → 发布 工作流：默认 is_public=0，发布后才上前台
 *  UI：Apple 风格 + 渐变立体卡片
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

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...extraHeaders }
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

function escapeHtml(s) {
  if (!s) return '';
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

// ===================== 站点设置读写 =====================

async function getSetting(env, key, fallback = '') {
  const row = await env.DB.prepare('SELECT value FROM site_settings WHERE key = ?').bind(key).first();
  return row ? row.value : fallback;
}

async function getAllSettings(env) {
  const rows = await env.DB.prepare('SELECT key, value FROM site_settings').all();
  const map = {};
  for (const r of (rows.results || [])) map[r.key] = r.value;
  return map;
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
    return new Response(await renderGalleryPage(env), { headers: { 'Content-Type': 'text/html; charset=utf-8' }});
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
  // 前台拉取站点设置（标题、分类等）
  if (path === '/api/site-settings' && method === 'GET') return handleGetSiteSettings(env);
  // 前台拉取已发布内容
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

  // 站点设置更新（后台）
  if (path === '/api/site-settings' && method === 'PUT') {
    if (!authed) return json({ error: '未登录' }, 401);
    return handleUpdateSiteSettings(request, env);
  }
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
  // 发布 / 取消发布
  if (path.startsWith('/api/media/') && path.endsWith('/publish') && method === 'POST') {
    if (!authed) return json({ error: '未登录' }, 401);
    const id = path.split('/')[3]; if (id && !isNaN(id)) return handlePublish(id, 1, env);
  }
  if (path.startsWith('/api/media/') && path.endsWith('/unpublish') && method === 'POST') {
    if (!authed) return json({ error: '未登录' }, 401);
    const id = path.split('/')[3]; if (id && !isNaN(id)) return handlePublish(id, 0, env);
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

// 站点设置 — 公开读取
async function handleGetSiteSettings(env) {
  const settings = await getAllSettings(env);
  let categories = [];
  try { categories = JSON.parse(settings.categories || '[]'); } catch {}
  return json({
    site_title: settings.site_title || '精选作品',
    site_subtitle: settings.site_subtitle || '',
    categories: categories
  });
}

// 站点设置 — 后台更新
async function handleUpdateSiteSettings(request, env) {
  try {
    const b = await request.json();
    const updates = [];
    const binds = [];
    if (b.site_title !== undefined) { updates.push('site_title'); binds.push(b.site_title); }
    if (b.site_subtitle !== undefined) { updates.push('site_subtitle'); binds.push(b.site_subtitle); }
    if (b.categories !== undefined) {
      const catJson = typeof b.categories === 'string' ? b.categories : JSON.stringify(b.categories);
      updates.push('categories'); binds.push(catJson);
    }
    for (const key of updates) {
      await env.DB.prepare('INSERT INTO site_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime(\'now\')')
        .bind(key, binds[updates.indexOf(key)]).run();
    }
    return json({ success: true });
  } catch (err) { return json({ error: '更新失败: ' + err.message }, 500); }
}

async function handleListMedia(request, env) {
  const url = new URL(request.url);
  const { page, pageSize, offset } = getPagination(request.url);
  const type = url.searchParams.get('type') || '';
  const tag = url.searchParams.get('tag') || '';
  const search = url.searchParams.get('search') || '';
  const includePrivate = url.searchParams.get('all') === '1';

  let where = includePrivate ? '' : 'WHERE is_public = 1';
  const binds = [];
  if (!where) where = 'WHERE 1=1';
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

// 创建时默认 is_public=0（草稿），需手动发布
async function handleCreateMedia(request, env) {
  try {
    const b = await request.json();
    const { type, title, description, content, thumbnail_key, tags, sort_order, is_public, category } = b;
    if (!type || !['image','video','text'].includes(type)) return json({ error: '类型必须是 image/video/text' }, 400);
    if (!title || !content) return json({ error: '标题和内容不能为空' }, 400);

    const r = await env.DB.prepare(
      `INSERT INTO media_items (type,title,description,content,thumbnail_key,tags,sort_order,is_public)
       VALUES (?,?,?,?,?,?,?,?)`
    ).bind(type, title, description||'', content, thumbnail_key||null, tags||'', sort_order||0, is_public===true?1:0).run();

    return json({ success: true, id: r.meta?.last_row_id, is_draft: is_public!==true }, 201);
  } catch (err) { return json({ error: '创建失败: ' + err.message }, 500); }
}

async function handleUpdateMedia(request, id, env) {
  try {
    const b = await request.json();
    const fields = []; const binds = [];
    for (const f of ['type','title','description','content','thumbnail_key','tags','sort_order','is_public','category']) {
      if (b[f] !== undefined) { fields.push(`${f} = ?`); binds.push(b[f]); }
    }
    if (fields.length === 0) return json({ error: '没有可更新的字段' }, 400);
    fields.push(`updated_at = datetime('now')`);
    binds.push(id);
    await env.DB.prepare(`UPDATE media_items SET ${fields.join(', ')} WHERE id = ?`).bind(...binds).run();
    return json({ success: true });
  } catch (err) { return json({ error: '更新失败: ' + err.message }, 500); }
}

// 发布 / 取消发布
async function handlePublish(id, val, env) {
  try {
    await env.DB.prepare(`UPDATE media_items SET is_public = ?, updated_at = datetime('now') WHERE id = ?`).bind(val, id).run();
    return json({ success: true, published: !!val });
  } catch (err) { return json({ error: '操作失败: ' + err.message }, 500); }
}

// ===== 删除：D1 + KV 联动，彻底释放存储 =====
async function handleDeleteMedia(id, env) {
  try {
    const item = await env.DB.prepare('SELECT * FROM media_items WHERE id = ?').bind(id).first();
    if (item) {
      if (item.type === 'image' && item.content) {
        try { await env.MEDIA_KV.delete(item.content); } catch(e) { console.warn('KV delete failed:', e.message); }
      }
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

// ===== 上传到 KV =====
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

// ===================== 前台页面（渐变立体 + 动态分类） =====================

async function renderGalleryPage(env) {
  const settings = await getAllSettings(env);
  const siteTitle = settings.site_title || '精选作品';
  const siteSubtitle = settings.site_subtitle || '图片 · 视频 · 文字 — 一切精彩，尽收眼底';
  let categories = [];
  try { categories = JSON.parse(settings.categories || '[]'); } catch {}
  // 确保有"全部"
  if (!categories.find(c => c.key === 'all')) {
    categories.unshift({ key: 'all', label: '全部', gradient: 'linear-gradient(135deg,#0071e3,#5e5ce6)' });
  }
  const catNavHtml = categories.map((c, i) =>
    `<a href="#" class="nav-link ${i===0?'active':''}" data-cat="${c.key}" style="${c.gradient?'--cat-grad:'+c.gradient:''}">${c.label}</a>`
  ).join('');

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(siteTitle)}</title>
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
    --shadow-sm: 0 2px 8px rgba(0,0,0,0.06);
    --shadow-md: 0 8px 24px rgba(0,0,0,0.10);
    --shadow-lg: 0 16px 48px rgba(0,0,0,0.14);
    --shadow-xl: 0 24px 60px rgba(0,0,0,0.18);
    --radius-sm: 10px;
    --radius-md: 14px;
    --radius-lg: 20px;
    --radius-xl: 28px;
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

  /* ===== 导航栏 ===== */
  .nav-bar {
    position: sticky; top: 0; z-index: 100;
    background: rgba(245,245,247,0.75);
    backdrop-filter: saturate(180%) blur(24px);
    -webkit-backdrop-filter: saturate(180%) blur(24px);
    border-bottom: 1px solid var(--border);
    padding: 0.7rem 1.5rem;
  }
  .nav-inner {
    max-width: 1200px; margin: 0 auto;
    display: flex; align-items: center; justify-content: space-between;
    gap: 1rem;
  }
  .nav-brand {
    font-size: 1.2rem; font-weight: 700; letter-spacing: -0.02em;
    background: linear-gradient(135deg, #0071e3, #5e5ce6, #ff2d55);
    background-size: 200% 200%;
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    animation: brandShine 6s ease infinite;
  }
  @keyframes brandShine { 0%,100%{background-position:0% 50%} 50%{background-position:100% 50%} }
  .nav-links { display: flex; gap: 0.3rem; align-items: center; flex-wrap: wrap; }
  .nav-link {
    color: var(--text-secondary); text-decoration: none;
    font-size: 0.85rem; padding: 0.4rem 0.9rem;
    border-radius: var(--radius-sm); transition: all 0.25s cubic-bezier(0.4,0,0.2,1);
    font-weight: 500; position: relative; overflow: hidden;
  }
  .nav-link::before {
    content: ''; position: absolute; inset: 0; border-radius: inherit;
    background: var(--cat-grad, linear-gradient(135deg,#0071e3,#5e5ce6));
    opacity: 0; transition: opacity 0.25s; z-index: -1;
  }
  .nav-link:hover { color: var(--text); transform: translateY(-1px); }
  .nav-link.active { color: #fff; box-shadow: 0 4px 12px rgba(0,113,227,0.35); }
  .nav-link.active::before { opacity: 1; }

  /* ===== Hero 区域 ===== */
  .hero {
    text-align: center; padding: 5rem 1rem 3rem;
    max-width: 800px; margin: 0 auto;
    position: relative;
  }
  .hero::before {
    content: ''; position: absolute; top: -2rem; left: 50%; transform: translateX(-50%);
    width: 300px; height: 300px; border-radius: 50%;
    background: radial-gradient(circle, rgba(0,113,227,0.08) 0%, transparent 70%);
    z-index: -1;
  }
  .hero h1 {
    font-size: clamp(2.2rem, 6vw, 4rem);
    font-weight: 800; letter-spacing: -0.04em;
    line-height: 1.1; margin-bottom: 1rem;
    background: linear-gradient(135deg, #1d1d1f 0%, #43434a 50%, #0071e3 100%);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    background-size: 200% 200%;
    animation: titleShine 8s ease infinite;
  }
  @keyframes titleShine { 0%,100%{background-position:0% 50%} 50%{background-position:100% 50%} }
  .hero p {
    font-size: 1.15rem; color: var(--text-secondary);
    line-height: 1.6; font-weight: 400;
  }

  /* ===== 容器 ===== */
  .container { max-width: 1200px; margin: 0 auto; padding: 0 1.5rem 3rem; }

  /* ===== 搜索框 ===== */
  .search-box {
    max-width: 480px; margin: 0 auto 2rem; position: relative;
  }
  .search-box input {
    width: 100%; padding: 0.8rem 1rem 0.8rem 2.6rem;
    background: var(--surface-solid); border: 1px solid var(--border);
    border-radius: var(--radius-md); font-size: 0.95rem;
    color: var(--text); outline: none; transition: all 0.25s;
    font-family: inherit;
    box-shadow: var(--shadow-sm);
  }
  .search-box input:focus { border-color: var(--accent); box-shadow: 0 0 0 4px rgba(0,113,227,0.1), var(--shadow-md); transform: translateY(-1px); }
  .search-box::before {
    content: '🔍'; position: absolute; left: 0.9rem; top: 50%;
    transform: translateY(-50%); font-size: 0.95rem; opacity: 0.45;
  }

  /* ===== 瀑布流卡片 ===== */
  .gallery-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 1.2rem;
  }
  .gallery-item {
    background: var(--surface-solid);
    border-radius: var(--radius-lg);
    overflow: hidden;
    box-shadow: var(--shadow-sm), inset 0 1px 0 rgba(255,255,255,0.6);
    transition: transform 0.35s cubic-bezier(0.25,0.8,0.25,1), box-shadow 0.35s;
    cursor: pointer;
    border: 1px solid var(--border);
    position: relative;
  }
  .gallery-item:hover {
    transform: translateY(-6px);
    box-shadow: var(--shadow-xl), inset 0 1px 0 rgba(255,255,255,0.8);
  }
  .item-media-wrap {
    position: relative; width: 100%; aspect-ratio: 4/3; overflow: hidden;
    background: linear-gradient(135deg, #e8e8ed, #f5f5f7);
  }
  .item-media {
    width: 100%; height: 100%; object-fit: cover;
    transition: transform 0.6s cubic-bezier(0.25,0.8,0.25,1);
  }
  .gallery-item:hover .item-media { transform: scale(1.05); }

  /* 渐变占位（图片/视频/文字各有不同渐变） */
  .item-placeholder {
    width: 100%; height: 100%;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    gap: 0.6rem; color: #fff; font-weight: 600;
  }
  .item-placeholder.image-placeholder {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  }
  .item-placeholder.video-placeholder {
    background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  }
  .item-placeholder.text-placeholder {
    background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  }
  .item-placeholder .icon { font-size: 2.5rem; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2)); }
  .item-placeholder .label { font-size: 0.85rem; opacity: 0.9; }

  /* 类型角标 — 渐变立体 */
  .type-badge {
    position: absolute; top: 0.7rem; right: 0.7rem;
    padding: 0.25rem 0.65rem; border-radius: 8px;
    font-size: 0.7rem; font-weight: 600; color: #fff;
    box-shadow: 0 2px 8px rgba(0,0,0,0.18);
    backdrop-filter: blur(8px);
  }
  .type-badge.image { background: linear-gradient(135deg, #667eea, #764ba2); }
  .type-badge.video { background: linear-gradient(135deg, #f093fb, #f5576c); }
  .type-badge.text  { background: linear-gradient(135deg, #4facfe, #00f2fe); }

  /* 分类标签条（卡片顶部彩色条） */
  .item-category-bar {
    position: absolute; top: 0; left: 0; right: 0; height: 4px;
    background: var(--cat-grad, linear-gradient(90deg,#0071e3,#5e5ce6));
    opacity: 0.85;
  }

  .item-body { padding: 1rem 1.1rem 1.1rem; }
  .item-title {
    font-size: 1rem; font-weight: 600;
    margin-bottom: 0.35rem; color: var(--text);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .item-desc {
    font-size: 0.84rem; color: var(--text-secondary);
    line-height: 1.5; display: -webkit-box;
    -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
  }
  .item-tags { margin-top: 0.6rem; display: flex; flex-wrap: wrap; gap: 0.35rem; }
  .item-tag {
    padding: 0.18rem 0.6rem; border-radius: 6px; font-size: 0.72rem; font-weight: 500;
    background: rgba(0,113,227,0.08); color: var(--accent);
    border: 1px solid rgba(0,113,227,0.12);
  }

  /* ===== 分页 ===== */
  .pagination {
    display: flex; justify-content: center; align-items: center;
    gap: 0.8rem; margin: 2.5rem 0 1rem;
  }
  .pagination button {
    padding: 0.55rem 1.2rem; border-radius: var(--radius-md);
    border: 1px solid var(--border); background: var(--surface-solid);
    color: var(--text); font-size: 0.9rem; cursor: pointer;
    transition: all 0.25s; font-family: inherit;
    box-shadow: var(--shadow-sm);
  }
  .pagination button:hover:not(:disabled) { background: var(--accent); color: #fff; border-color: var(--accent); transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,113,227,0.3); }
  .pagination button:disabled { opacity: 0.35; cursor: not-allowed; }
  .pagination span { color: var(--text-secondary); font-size: 0.85rem; }

  /* ===== 空状态 ===== */
  .empty-state { text-align: center; padding: 5rem 1rem; color: var(--text-secondary); }
  .empty-state .icon { font-size: 3rem; margin-bottom: 1rem; }
  .empty-state h3 { font-size: 1.2rem; font-weight: 600; margin-bottom: 0.4rem; color: var(--text); }

  /* ===== 后台入口 FAB ===== */
  .admin-fab {
    position: fixed; bottom: 1.5rem; right: 1.5rem;
    width: 56px; height: 56px; border-radius: 50%;
    background: linear-gradient(135deg, #0071e3, #5e5ce6);
    color: #fff;
    display: flex; align-items: center; justify-content: center;
    text-decoration: none; font-size: 1.4rem;
    box-shadow: 0 6px 20px rgba(0,113,227,0.4);
    transition: transform 0.25s, box-shadow 0.25s;
    z-index: 50;
  }
  .admin-fab:hover { transform: scale(1.1); box-shadow: 0 8px 28px rgba(0,113,227,0.5); }

  /* ===== 模态框 ===== */
  .modal-overlay {
    display: none; position: fixed;
    inset: 0; background: rgba(0,0,0,0.45);
    backdrop-filter: blur(6px); z-index: 1000;
    align-items: center; justify-content: center; padding: 1rem;
    opacity: 0; transition: opacity 0.3s;
  }
  .modal-overlay.active { display: flex; opacity: 1; }
  .modal-content {
    background: var(--surface-solid); border-radius: var(--radius-xl);
    max-width: 720px; width: 100%; max-height: 85vh; overflow-y: auto;
    box-shadow: var(--shadow-xl); border: 1px solid var(--border);
    transform: scale(0.95) translateY(10px); transition: transform 0.35s cubic-bezier(0.25,0.8,0.25,1);
  }
  .modal-overlay.active .modal-content { transform: scale(1) translateY(0); }
  .modal-header {
    display: flex; justify-content: space-between; align-items: center;
    padding: 1.3rem 1.6rem; border-bottom: 1px solid var(--border);
  }
  .modal-header h2 { font-size: 1.2rem; font-weight: 700; }
  .modal-close {
    background: #f0f0f3; border: none; width: 34px; height: 34px;
    border-radius: 50%; font-size: 1.1rem; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    color: var(--text-secondary); transition: all 0.2s;
  }
  .modal-close:hover { background: #e0e0e5; color: var(--text); transform: rotate(90deg); }
  .modal-body { padding: 1.5rem; }
  .modal-body img, .modal-body video {
    width: 100%; border-radius: var(--radius-md); margin-bottom: 1rem;
    box-shadow: var(--shadow-md);
  }
  .modal-body p { color: var(--text-secondary); line-height: 1.7; white-space: pre-wrap; font-size: 0.95rem; }
  .modal-meta { margin-top: 1rem; display: flex; flex-wrap: wrap; gap: 0.4rem; }

  @media (max-width: 600px) {
    .gallery-grid { grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 0.8rem; }
    .hero { padding: 3rem 1rem 1.5rem; }
    .nav-links { gap: 0.15rem; }
    .nav-link { padding: 0.35rem 0.6rem; font-size: 0.78rem; }
  }
</style>
</head>
<body>

<nav class="nav-bar">
  <div class="nav-inner">
    <div class="nav-brand">${escapeHtml(siteTitle)}</div>
    <div class="nav-links" id="navLinks">
      ${catNavHtml}
    </div>
  </div>
</nav>

<div class="hero">
  <h1>${escapeHtml(siteTitle)}</h1>
  <p>${escapeHtml(siteSubtitle)}</p>
</div>

<div class="container">
  <div class="search-box">
    <input type="text" id="searchInput" placeholder="搜索标题或描述..." />
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

  // 动态分类导航
  document.getElementById('navLinks').addEventListener('click', e => {
    const a = e.target.closest('.nav-link'); if (!a) return;
    e.preventDefault();
    document.querySelectorAll('.nav-link').forEach(x => x.classList.remove('active'));
    a.classList.add('active');
    const cat = a.dataset.cat;
    // 映射分类 key → 媒体 type
    const map = { 'all':'', 'photography':'image', 'design':'image', 'video':'video', 'essay':'text' };
    currentType = map[cat] || '';
    // 用 tag 过滤子分类
    currentSearch = ''; searchInput.value = '';
    currentPage = 1;
    fetchMedia(cat);
  });

  async function fetchMedia(activeCat) {
    const params = new URLSearchParams({ page: currentPage, pageSize: 24 });
    if (currentType) params.set('type', currentType);
    if (currentSearch) params.set('search', currentSearch);
    // 子分类用 tag 匹配
    if (activeCat && !['all','photography','design','video','essay'].includes(activeCat||'')) {
      // 自定义分类作为 tag 过滤
    }
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

    // 渐变预设池（给无图卡片用）
    const grads = [
      'linear-gradient(135deg,#667eea,#764ba2)',
      'linear-gradient(135deg,#f093fb,#f5576c)',
      'linear-gradient(135deg,#4facfe,#00f2fe)',
      'linear-gradient(135deg,#43e97b,#38f9d7)',
      'linear-gradient(135deg,#fa709a,#fee140)',
      'linear-gradient(135deg,#a18cd1,#fbc2eb)',
      'linear-gradient(135deg,#ff9a9e,#fad0c4)',
      'linear-gradient(135deg,#667eea,#764ba2)',
    ];

    container.innerHTML = '<div class="gallery-grid">' + items.map((item,idx) => {
      let mediaHtml = '';
      const grad = grads[idx % grads.length];
      if (item.type === 'image') {
        mediaHtml = '<div class="item-media-wrap"><div class="item-category-bar" style="--cat-grad:'+grad+'"></div><img class="item-media" src="/file/'+escapeHtml(item.content)+'" alt="'+escapeHtml(item.title)+'" loading="lazy" /><span class="type-badge image">🖼 图片</span></div>';
      } else if (item.type === 'video') {
        mediaHtml = '<div class="item-media-wrap"><div class="item-category-bar" style="--cat-grad:'+grad+'"></div><div class="item-placeholder video-placeholder"><span class="icon">🎬</span><span class="label">视频</span></div><span class="type-badge video">🎬 视频</span></div>';
      } else {
        mediaHtml = '<div class="item-media-wrap"><div class="item-category-bar" style="--cat-grad:'+grad+'"></div><div class="item-placeholder text-placeholder"><span class="icon">📝</span><span class="label">文字</span></div><span class="type-badge text">📝 文字</span></div>';
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

  fetchMedia('all');
</script>
</body>
</html>`;
}

// ===================== 登录页 =====================

function renderLoginPage() {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>登录 — 管理后台</title>
<style>
  :root { --bg:#f5f5f7; --text:#1d1d1f; --text2:#6e6e73; --accent:#0071e3; --border:rgba(0,0,0,0.08); --radius:18px; --radius-sm:12px; --shadow:0 8px 30px rgba(0,0,0,0.08); }
  *{margin:0;padding:0;box-sizing:border-box;}
  body{font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display','PingFang SC',sans-serif;background:var(--bg);color:var(--text);min-height:100vh;display:flex;align-items:center;justify-content:center;-webkit-font-smoothing:antialiased;}
  .login-card{background:rgba(255,255,255,0.85);backdrop-filter:blur(24px);border:1px solid var(--border);border-radius:var(--radius);padding:2.8rem;width:100%;max-width:400px;box-shadow:var(--shadow);}
  .login-card h1{font-size:1.5rem;font-weight:700;text-align:center;margin-bottom:0.3rem;background:linear-gradient(135deg,#0071e3,#5e5ce6);-webkit-background-clip:text;-webkit-text-fill-color:transparent;}
  .login-card p{text-align:center;color:var(--text2);font-size:0.9rem;margin-bottom:2rem;}
  .form-group{margin-bottom:1rem;}
  .form-group label{display:block;margin-bottom:0.35rem;color:var(--text2);font-size:0.85rem;font-weight:500;}
  .form-group input{width:100%;padding:0.8rem 1rem;background:#fff;border:1px solid var(--border);border-radius:var(--radius-sm);font-size:1rem;color:var(--text);outline:none;transition:all 0.25s;font-family:inherit;box-shadow:0 1px 3px rgba(0,0,0,0.04);}
  .form-group input:focus{border-color:var(--accent);box-shadow:0 0 0 3px rgba(0,113,227,0.1);}
  .btn-primary{width:100%;padding:0.85rem;background:linear-gradient(135deg,#0071e3,#5e5ce6);color:#fff;border:none;border-radius:var(--radius-sm);font-size:1rem;font-weight:600;cursor:pointer;transition:all 0.25s;font-family:inherit;margin-top:0.5rem;box-shadow:0 4px 14px rgba(0,113,227,0.3);}
  .btn-primary:hover{transform:translateY(-2px);box-shadow:0 6px 20px rgba(0,113,227,0.4);}
  .btn-primary:disabled{opacity:0.5;cursor:not-allowed;transform:none;}
  .error-msg{color:#ff3b30;font-size:0.85rem;margin-top:0.8rem;text-align:center;min-height:1.2em;}
  .back-link{display:block;text-align:center;margin-top:1.5rem;color:var(--text2);text-decoration:none;font-size:0.85rem;}
  .back-link:hover{color:var(--accent);}
</style></head>
<body>
<div class="login-card">
  <h1>管理后台</h1>
  <p>请输入管理员凭据</p>
  <form id="loginForm">
    <div class="form-group"><label for="username">用户名</label><input type="text" id="username" placeholder="admin" autocomplete="username" required /></div>
    <div class="form-group"><label for="password">密码</label><input type="password" id="password" placeholder="••••••••" autocomplete="current-password" required /></div>
    <button type="submit" class="btn-primary" id="loginBtn">登 录</button>
    <div class="error-msg" id="errorMsg"></div>
  </form>
  <a href="/" class="back-link">← 返回首页</a>
</div>
<script>
  document.getElementById('loginForm').addEventListener('submit', async e => {
    e.preventDefault();
    const btn = document.getElementById('loginBtn'); const errEl = document.getElementById('errorMsg');
    btn.disabled = true; btn.textContent = '登录中...'; errEl.textContent = '';
    try {
      const res = await fetch('/api/login', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ username:document.getElementById('username').value.trim(), password:document.getElementById('password').value.trim() }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error||'登录失败');
      window.location.href = '/admin';
    } catch (err) { errEl.textContent = err.message; }
    finally { btn.disabled = false; btn.textContent = '登 录'; }
  });
</script></body></html>`;
}

// ===================== 后台管理页（含预览→发布 + 站点设置） =====================

function renderAdminPage(env) {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>管理后台</title>
<style>
  :root {
    --bg:#f5f5f7; --surface:rgba(255,255,255,0.72); --surface-solid:#ffffff;
    --text:#1d1d1f; --text2:#6e6e73; --accent:#0071e3; --accent2:#5e5ce6;
    --danger:#ff3b30; --success:#34c759; --warning:#ff9500;
    --border:rgba(0,0,0,0.08); --shadow:0 4px 16px rgba(0,0,0,0.06);
    --shadow-lg:0 16px 48px rgba(0,0,0,0.12);
    --radius:12px; --radius-lg:18px; --radius-xl:24px;
  }
  *{margin:0;padding:0;box-sizing:border-box;}
  body{font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display','PingFang SC',sans-serif;background:var(--bg);color:var(--text);min-height:100vh;-webkit-font-smoothing:antialiased;letter-spacing:-0.01em;}

  /* Nav */
  .nav-bar{position:sticky;top:0;z-index:100;background:rgba(245,245,247,0.8);backdrop-filter:saturate(180%) blur(20px);border-bottom:1px solid var(--border);padding:0.7rem 1.5rem;}
  .nav-inner{max-width:1200px;margin:0 auto;display:flex;justify-content:space-between;align-items:center;}
  .nav-brand{font-size:1.1rem;font-weight:700;background:linear-gradient(135deg,var(--accent),var(--accent2));-webkit-background-clip:text;-webkit-text-fill-color:transparent;}
  .header-actions{display:flex;gap:0.6rem;align-items:center;}

  /* Buttons */
  .btn{padding:0.5rem 1rem;border-radius:var(--radius);border:1px solid var(--border);background:var(--surface-solid);color:var(--text);font-size:0.85rem;cursor:pointer;transition:all 0.2s;text-decoration:none;display:inline-flex;align-items:center;gap:0.3rem;font-family:inherit;font-weight:500;box-shadow:0 1px 3px rgba(0,0,0,0.04);}
  .btn:hover{border-color:#c0c0c5;transform:translateY(-1px);box-shadow:var(--shadow);}
  .btn-primary{background:linear-gradient(135deg,var(--accent),var(--accent2));color:#fff;border-color:transparent;box-shadow:0 4px 14px rgba(0,113,227,0.3);}
  .btn-primary:hover{background:linear-gradient(135deg,#0077ed,#6c5ce7);box-shadow:0 6px 20px rgba(0,113,227,0.4);}
  .btn-danger{background:#fff;border-color:rgba(255,59,48,0.3);color:var(--danger);}
  .btn-danger:hover{background:var(--danger);color:#fff;border-color:var(--danger);}
  .btn-success{background:#f0faf4;border-color:rgba(52,199,89,0.3);color:var(--success);}
  .btn-success:hover{background:var(--success);color:#fff;}
  .btn-warning{background:#fff8ed;border-color:rgba(255,149,0,0.3);color:var(--warning);}
  .btn-warning:hover{background:var(--warning);color:#fff;}
  .btn:disabled{opacity:0.4;cursor:not-allowed;transform:none;}

  .container{max-width:1200px;margin:0 auto;padding:1.5rem;}

  /* Stats */
  .stats-bar{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:0.8rem;margin-bottom:1.5rem;}
  .stat-card{background:var(--surface-solid);border:1px solid var(--border);border-radius:var(--radius-lg);padding:1rem 1.2rem;box-shadow:var(--shadow);position:relative;overflow:hidden;}
  .stat-card::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:var(--bar-grad,linear-gradient(90deg,var(--accent),var(--accent2)));}
  .stat-card .label{color:var(--text2);font-size:0.78rem;font-weight:500;margin-bottom:0.2rem;}
  .stat-card .value{font-size:1.6rem;font-weight:700;}
  .stat-card.total .value{color:var(--text);}
  .stat-card.drafts .value{color:var(--warning);}
  .stat-card.published .value{color:var(--success);}
  .stat-card.images .value{color:var(--accent);}
  .stat-card.videos .value{color:var(--accent2);}
  .stat-card.texts .value{color:var(--warning);}
  .stat-card.storage .value{color:var(--success);font-size:1.2rem;}

  /* Tabs */
  .tab-bar{display:flex;gap:0.3rem;margin-bottom:1.2rem;border-bottom:1px solid var(--border);padding-bottom:-1px;}
  .tab-btn{padding:0.6rem 1.2rem;background:none;border:none;border-bottom:2px solid transparent;font-size:0.9rem;font-weight:500;color:var(--text2);cursor:pointer;transition:all 0.2s;font-family:inherit;margin-bottom:-1px;}
  .tab-btn:hover{color:var(--text);}
  .tab-btn.active{color:var(--accent);border-bottom-color:var(--accent);}

  /* Toolbar */
  .toolbar{display:flex;flex-wrap:wrap;gap:0.6rem;margin-bottom:1.2rem;align-items:center;}
  .toolbar .search-box{flex:1;min-width:180px;position:relative;}
  .toolbar input[type="text"]{width:100%;padding:0.6rem 1rem 0.6rem 2.2rem;background:var(--surface-solid);border:1px solid var(--border);border-radius:var(--radius);font-size:0.9rem;outline:none;transition:all 0.2s;font-family:inherit;color:var(--text);box-shadow:0 1px 3px rgba(0,0,0,0.04);}
  .toolbar input:focus{border-color:var(--accent);box-shadow:0 0 0 3px rgba(0,113,227,0.1);}
  .toolbar .search-box::before{content:'🔍';position:absolute;left:0.7rem;top:50%;transform:translateY(-50%);opacity:0.4;font-size:0.85rem;}
  .toolbar select{padding:0.6rem 0.8rem;background:var(--surface-solid);border:1px solid var(--border);border-radius:var(--radius);font-size:0.85rem;color:var(--text);outline:none;font-family:inherit;box-shadow:0 1px 3px rgba(0,0,0,0.04);}
  .toolbar select:focus{border-color:var(--accent);}

  /* Table */
  .table-wrap{background:var(--surface-solid);border:1px solid var(--border);border-radius:var(--radius-lg);overflow:hidden;box-shadow:var(--shadow);}
  table{width:100%;border-collapse:collapse;}
  th{background:#fafafc;padding:0.7rem 1rem;text-align:left;color:var(--text2);font-size:0.75rem;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid var(--border);}
  td{padding:0.7rem 1rem;border-bottom:1px solid var(--border);font-size:0.85rem;vertical-align:middle;}
  tr:last-child td{border-bottom:none;}
  tr:hover{background:#fafafc;}
  .col-cb{width:36px;} .col-prev{width:72px;} .col-act{width:200px;text-align:right;}
  .preview-thumb{width:56px;height:38px;object-fit:cover;border-radius:8px;background:#f0f0f3;box-shadow:0 2px 6px rgba(0,0,0,0.08);}
  .preview-placeholder{width:56px;height:38px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#667eea,#764ba2);border-radius:8px;font-size:0.9rem;color:#fff;}
  .type-badge{display:inline-block;padding:0.15rem 0.55rem;border-radius:6px;font-size:0.75rem;font-weight:500;color:#fff;}
  .type-badge.image{background:linear-gradient(135deg,#667eea,#764ba2);}
  .type-badge.video{background:linear-gradient(135deg,#f093fb,#f5576c);}
  .type-badge.text{background:linear-gradient(135deg,#4facfe,#00f2fe);}
  .status-dot{display:inline-block;width:7px;height:7px;border-radius:50%;margin-right:0.3rem;vertical-align:middle;}
  .status-dot.public{background:var(--success);box-shadow:0 0 6px rgba(52,199,89,0.4);}
  .status-dot.private{background:var(--warning);box-shadow:0 0 6px rgba(255,149,0,0.4);}
  .action-btns{display:flex;gap:0.3rem;justify-content:flex-end;flex-wrap:wrap;}
  .action-btns .btn{padding:0.3rem 0.6rem;font-size:0.75rem;}

  /* Modal */
  .modal-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,0.45);backdrop-filter:blur(6px);z-index:1000;align-items:center;justify-content:center;padding:1rem;opacity:0;transition:opacity 0.3s;}
  .modal-overlay.active{display:flex;opacity:1;}
  .modal-content{background:var(--surface-solid);border-radius:var(--radius-xl);max-width:600px;width:100%;border:1px solid var(--border);box-shadow:var(--shadow-lg);overflow:hidden;transform:scale(0.95) translateY(10px);transition:transform 0.35s cubic-bezier(0.25,0.8,0.25,1);}
  .modal-overlay.active .modal-content{transform:scale(1) translateY(0);}
  .modal-header{display:flex;justify-content:space-between;align-items:center;padding:1.2rem 1.5rem;border-bottom:1px solid var(--border);}
  .modal-header h2{font-size:1.1rem;font-weight:600;}
  .modal-close{background:#f0f0f3;border:none;width:32px;height:32px;border-radius:50%;font-size:1rem;cursor:pointer;color:var(--text2);transition:all 0.2s;}
  .modal-close:hover{background:#e0e0e5;transform:rotate(90deg);}
  .modal-body{padding:1.5rem;max-height:70vh;overflow-y:auto;}
  .modal-footer{padding:1rem 1.5rem;border-top:1px solid var(--border);display:flex;justify-content:flex-end;gap:0.6rem;}

  /* Form */
  .form-group{margin-bottom:1rem;}
  .form-group label{display:block;margin-bottom:0.3rem;color:var(--text2);font-size:0.82rem;font-weight:500;}
  .form-group input,.form-group select,.form-group textarea{width:100%;padding:0.65rem 0.9rem;background:#fafafc;border:1px solid var(--border);border-radius:var(--radius);font-size:0.9rem;color:var(--text);outline:none;transition:all 0.2s;font-family:inherit;box-shadow:inset 0 1px 2px rgba(0,0,0,0.03);}
  .form-group textarea{min-height:80px;resize:vertical;}
  .form-group input:focus,.form-group select:focus,.form-group textarea:focus{border-color:var(--accent);box-shadow:0 0 0 3px rgba(0,113,227,0.1);background:#fff;}

  /* Upload */
  .upload-area{border:2px dashed var(--border);border-radius:var(--radius);padding:1.8rem 1rem;text-align:center;cursor:pointer;transition:all 0.3s;margin-bottom:1rem;background:linear-gradient(135deg,#fafafc,#f0f0f3);}
  .upload-area:hover,.upload-area.dragover{border-color:var(--accent);background:rgba(0,113,227,0.04);}
  .upload-area p{color:var(--text2);margin-bottom:0.5rem;font-size:0.9rem;}
  .upload-btn{background:linear-gradient(135deg,var(--accent),var(--accent2));color:#fff;border:none;padding:0.5rem 1.2rem;border-radius:var(--radius-sm);font-size:0.85rem;cursor:pointer;font-family:inherit;box-shadow:0 2px 8px rgba(0,113,227,0.25);}
  .upload-progress{margin-top:0.5rem;display:none;}
  .upload-progress.active{display:block;}
  .progress-track{height:5px;background:#e8e8ed;border-radius:3px;overflow:hidden;}
  .progress-fill{height:100%;background:linear-gradient(90deg,var(--accent),var(--accent2));width:0%;transition:width 0.3s;border-radius:3px;}

  .checkbox{width:16px;height:16px;cursor:pointer;accent-color:var(--accent);}

  /* Toast */
  .toast{position:fixed;top:1rem;right:1rem;padding:0.7rem 1.2rem;border-radius:var(--radius);color:#fff;font-size:0.9rem;z-index:2000;opacity:0;transform:translateY(-10px);transition:opacity 0.3s,transform 0.3s;pointer-events:none;font-weight:500;box-shadow:var(--shadow-lg);}
  .toast.show{opacity:1;transform:translateY(0);}
  .toast.success{background:linear-gradient(135deg,#34c759,#30d158);}
  .toast.error{background:linear-gradient(135deg,#ff3b30,#ff453a);}
  .toast.warning{background:linear-gradient(135deg,#ff9500,#ffb340);}

  /* 预览面板 */
  .preview-panel{background:linear-gradient(135deg,#f8f9ff,#fff);border:1px solid var(--border);border-radius:var(--radius-lg);padding:1.5rem;margin-bottom:1.2rem;box-shadow:var(--shadow);}
  .preview-panel h3{font-size:0.95rem;font-weight:600;margin-bottom:0.8rem;color:var(--text);display:flex;align-items:center;gap:0.4rem;}
  .preview-content{background:#fff;border-radius:var(--radius);padding:1rem;border:1px solid var(--border);min-height:100px;}
  .preview-empty{color:var(--text2);font-size:0.85rem;text-align:center;padding:2rem 1rem;}
  .preview-card{display:flex;gap:1rem;align-items:flex-start;}
  .preview-card img,.preview-card video{max-width:200px;border-radius:var(--radius-sm);box-shadow:var(--shadow);}
  .preview-card .info h4{font-size:1rem;font-weight:600;margin-bottom:0.3rem;}
  .preview-card .info p{font-size:0.85rem;color:var(--text2);line-height:1.5;}
  .preview-actions{display:flex;gap:0.5rem;margin-top:1rem;justify-content:flex-end;}

  /* 设置面板 */
  .settings-section{background:var(--surface-solid);border:1px solid var(--border);border-radius:var(--radius-lg);padding:1.5rem;margin-bottom:1.2rem;box-shadow:var(--shadow);}
  .settings-section h3{font-size:1rem;font-weight:600;margin-bottom:1rem;color:var(--text);}
  .cat-list{display:flex;flex-direction:column;gap:0.6rem;margin-bottom:1rem;}
  .cat-item{display:flex;gap:0.5rem;align-items:center;padding:0.5rem 0.8rem;background:#fafafc;border:1px solid var(--border);border-radius:var(--radius-sm);}
  .cat-color{width:24px;height:24px;border-radius:6px;border:1px solid var(--border);cursor:pointer;}
  .cat-item input{flex:1;padding:0.4rem 0.7rem;background:#fff;border:1px solid var(--border);border-radius:6px;font-size:0.85rem;outline:none;font-family:inherit;color:var(--text);}
  .cat-item input:focus{border-color:var(--accent);}

  .empty-state{text-align:center;padding:3rem 1rem;color:var(--text2);}
  .empty-state .icon{font-size:2.5rem;margin-bottom:0.8rem;}
  .empty-state h3{font-size:1.1rem;font-weight:600;color:var(--text);margin-bottom:0.3rem;}

  .kv-info{background:rgba(0,113,227,0.06);border:1px solid rgba(0,113,227,0.15);border-radius:var(--radius);padding:0.7rem 0.9rem;margin-bottom:1rem;font-size:0.8rem;color:var(--accent);line-height:1.5;}

  @media(max-width:768px){.col-prev,.col-tags,.col-date{display:none;}.stats-bar{grid-template-columns:repeat(2,1fr);}}
</style>
</head>
<body>

<nav class="nav-bar">
  <div class="nav-inner">
    <div class="nav-brand">⚙ 管理后台</div>
    <div class="header-actions">
      <a href="/" class="btn">👁 查看前台</a>
      <button class="btn btn-danger" onclick="logout()">退出</button>
    </div>
  </div>
</nav>

<div class="container">
  <!-- Tabs -->
  <div class="tab-bar">
    <button class="tab-btn active" data-tab="content" onclick="switchTab('content',this)">📂 内容管理</button>
    <button class="tab-btn" data-tab="settings" onclick="switchTab('settings',this)">⚙ 站点设置</button>
  </div>

  <!-- ===== 内容管理 Tab ===== -->
  <div id="tab-content">
    <!-- 统计 -->
    <div class="stats-bar" id="statsBar">
      <div class="stat-card total" style="--bar-grad:linear-gradient(90deg,#0071e3,#5e5ce6);"><div class="label">总计</div><div class="value" id="statTotal">-</div></div>
      <div class="stat-card drafts" style="--bar-grad:linear-gradient(90deg,#ff9500,#ffb340);"><div class="label">草稿</div><div class="value" id="statDrafts">-</div></div>
      <div class="stat-card published" style="--bar-grad:linear-gradient(90deg,#34c759,#30d158);"><div class="label">已发布</div><div class="value" id="statPublished">-</div></div>
      <div class="stat-card images" style="--bar-grad:linear-gradient(90deg,#667eea,#764ba2);"><div class="label">图片</div><div class="value" id="statImages">-</div></div>
      <div class="stat-card videos" style="--bar-grad:linear-gradient(90deg,#f093fb,#f5576c);"><div class="label">视频</div><div class="value" id="statVideos">-</div></div>
      <div class="stat-card texts" style="--bar-grad:linear-gradient(90deg,#4facfe,#00f2fe);"><div class="label">文字</div><div class="value" id="statTexts">-</div></div>
      <div class="stat-card storage" style="--bar-grad:linear-gradient(90deg,#34c759,#30d158);"><div class="label">存储</div><div class="value" id="statStorage">-</div></div>
    </div>

    <!-- 工具栏 -->
    <div class="toolbar">
      <div class="search-box"><input type="text" id="searchInput" placeholder="搜索标题..." /></div>
      <select id="typeFilter"><option value="">全部类型</option><option value="image">🖼 图片</option><option value="video">🎬 视频</option><option value="text">📝 文字</option></select>
      <select id="statusFilter"><option value="">全部状态</option><option value="draft">📄 草稿</option><option value="published">✅ 已发布</option></select>
      <button class="btn btn-primary" onclick="openCreateModal()">＋ 添加内容</button>
      <button class="btn btn-danger" id="batchDeleteBtn" style="display:none" onclick="batchDelete()">🗑 批量删除</button>
    </div>

    <div id="tableContainer"><div class="empty-state"><div class="icon">⏳</div><h3>加载中...</h3></div></div>
  </div>

  <!-- ===== 站点设置 Tab ===== -->
  <div id="tab-settings" style="display:none;">
    <div class="settings-section">
      <h3>🏷 站点标题与副标题</h3>
      <div class="form-group"><label>站点标题（前台大标题）</label><input type="text" id="setSiteTitle" placeholder="精选作品" /></div>
      <div class="form-group"><label>站点副标题（标题下方描述）</label><input type="text" id="setSiteSubtitle" placeholder="一句话描述你的站点" /></div>
    </div>
    <div class="settings-section">
      <h3>📂 分类导航（前台顶部标签）</h3>
      <div class="cat-list" id="catList"></div>
      <button class="btn btn-primary" onclick="addCategory()">＋ 添加分类</button>
    </div>
    <div style="display:flex;gap:0.6rem;justify-content:flex-end;">
      <button class="btn" onclick="resetSettings()">重置</button>
      <button class="btn btn-primary" onclick="saveSettings()">💾 保存设置</button>
    </div>
  </div>
</div>

<!-- 编辑/添加模态框（含预览） -->
<div class="modal-overlay" id="editModal">
  <div class="modal-content" style="max-width:640px;">
    <div class="modal-header">
      <h2 id="modalTitle">添加内容</h2>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <div class="modal-body">
      <div class="kv-info" id="kvInfo">
        💡 <strong>图片</strong>上传到 KV 存储（单张 ≤25MB），删除时自动从 KV 彻底清除释放空间。<br>
        🎬 <strong>视频</strong>请直接填写外部链接（YouTube/B站/任意 mp4 直链）。<br>
        📝 保存后进入<strong>草稿状态</strong>，预览满意后点击「发布」才会在前台展示。
      </div>

      <!-- 预览区域 -->
      <div class="preview-panel" id="previewPanel">
        <h3>👁 实时预览</h3>
        <div class="preview-content" id="previewContent">
          <div class="preview-empty">填写右侧内容后，点击「预览」查看效果</div>
        </div>
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
          <input type="text" id="formTitle" placeholder="输入标题" oninput="updatePreview()" />
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
          <input type="text" id="formVideoUrl" placeholder="https://... 或 B站/YouTube 嵌入链接" oninput="updatePreview()" />
          <small style="color:var(--text2);font-size:0.75rem;">支持 mp4 直链、YouTube/B站 iframe 链接</small>
        </div>

        <!-- 文字内容 -->
        <div class="form-group" id="textContentGroup" style="display:none;">
          <label>文字内容 *</label>
          <textarea id="formTextContent" placeholder="输入文字内容..." oninput="updatePreview()"></textarea>
        </div>

        <div class="form-group">
          <label>描述</label>
          <textarea id="formDescription" placeholder="简短描述（可选）" oninput="updatePreview()"></textarea>
        </div>
        <div class="form-group">
          <label>标签（逗号分隔）</label>
          <input type="text" id="formTags" placeholder="如: 旅行, 风景, 2026" oninput="updatePreview()" />
        </div>
        <div style="display:flex;gap:0.8rem;">
          <div class="form-group" style="flex:1;"><label>排序权重</label><input type="number" id="formSortOrder" value="0" /></div>
          <div class="form-group" style="flex:1;"><label>分类</label>
            <select id="formCategory">
              <option value="">无</option>
            </select>
          </div>
        </div>
      </form>
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">取消</button>
      <button class="btn btn-warning" id="previewBtn" onclick="updatePreview()">👁 预览</button>
      <button class="btn btn-primary" id="saveBtn" onclick="saveMedia()">💾 保存草稿</button>
    </div>
  </div>
</div>

<div class="toast" id="toast"></div>

<script>
  let allItems=[],currentEditingId=null,uploadedFileKey='',settings={categories:[]};

  checkAuth(); loadStats(); loadMedia(); loadSettings();

  async function checkAuth(){
    try{const r=await fetch('/api/auth/check'),d=await r.json();if(!d.authenticated)window.location.href='/login';}catch{window.location.href='/login';}
  }
  async function logout(){await fetch('/api/logout',{method:'POST'});window.location.href='/login';}

  // ===== Tab 切换 =====
  function switchTab(name,btn){
    document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-content').style.display = name==='content'?'':'none';
    document.getElementById('tab-settings').style.display = name==='settings'?'':'none';
  }

  // ===== 统计 =====
  async function loadStats(){
    try{
      const r=await fetch('/api/media?pageSize=1000&all=1'),d=await r.json();
      const items=d.items||[];
      document.getElementById('statTotal').textContent=items.length;
      document.getElementById('statDrafts').textContent=items.filter(i=>!i.is_public).length;
      document.getElementById('statPublished').textContent=items.filter(i=>i.is_public).length;
      document.getElementById('statImages').textContent=items.filter(i=>i.type==='image').length;
      document.getElementById('statVideos').textContent=items.filter(i=>i.type==='video').length;
      document.getElementById('statTexts').textContent=items.filter(i=>i.type==='text').length;
      const imgCount=items.filter(i=>i.type==='image').length;
      document.getElementById('statStorage').textContent=imgCount+' 张';
    }catch{}
  }

  // ===== 媒体列表 =====
  async function loadMedia(){
    const search=document.getElementById('searchInput').value.trim();
    const type=document.getElementById('typeFilter').value;
    const status=document.getElementById('statusFilter').value;
    const params=new URLSearchParams({pageSize:100,all:1});
    if(search)params.set('search',search);
    if(type)params.set('type',type);
    try{
      const r=await fetch('/api/media?'+params),d=await r.json();
      let items=d.items||[];
      if(status==='draft') items=items.filter(i=>!i.is_public);
      else if(status==='published') items=items.filter(i=>i.is_public);
      allItems=items; renderTable();
    }catch{
      document.getElementById('tableContainer').innerHTML='<div class="empty-state"><div class="icon">❌</div><h3>加载失败</h3></div>';
    }
  }

  function renderTable(){
    if(allItems.length===0){
      document.getElementById('tableContainer').innerHTML='<div class="empty-state"><div class="icon">📭</div><h3>暂无内容</h3><p>点击"添加内容"开始</p></div>';
      return;
    }
    const html='<div class="table-wrap"><table>'+
      '<thead><tr><th class="col-cb"><input type="checkbox" class="checkbox" id="selectAll" onchange="toggleSelectAll()"></th><th class="col-prev">预览</th><th>标题</th><th>类型</th><th>状态</th><th class="col-act">操作</th></tr></thead><tbody>'+
      allItems.map(item=>{
        const prev=item.type==='image'?'<img class="preview-thumb" src="/file/'+esc(item.content)+'">':
                  item.type==='video'?'<div class="preview-placeholder">🎬</div>':
                  '<div class="preview-placeholder">📝</div>';
        const tLabel={image:'🖼 图片',video:'🎬 视频',text:'📝 文字'}[item.type]||item.type;
        const status=item.is_public?
          '<span class="status-dot public"></span><span style="color:var(--success);font-size:0.8rem;">已发布</span>':
          '<span class="status-dot private"></span><span style="color:var(--warning);font-size:0.8rem;">草稿</span>';
        return '<tr>'+
          '<td><input type="checkbox" class="checkbox item-check" onchange="updateBatchBtn()" value="'+item.id+'"></td>'+
          '<td>'+prev+'</td>'+
          '<td>'+esc(item.title)+'</td>'+
          '<td><span class="type-badge '+item.type+'">'+tLabel+'</span></td>'+
          '<td>'+status+'</td>'+
          '<td><div class="action-btns">'+
            (item.is_public
              ?'<button class="btn btn-warning" onclick="unpublishItem('+item.id+')">取消发布</button>'
              :'<button class="btn btn-success" onclick="publishItem('+item.id+')">🚀 发布</button>')+
            '<button class="btn" onclick="editItem('+item.id+')">编辑</button>'+
            '<button class="btn btn-danger" onclick="deleteItem('+item.id+')">删除</button>'+
          '</div></td></tr>';
      }).join('')+'</tbody></table></div>';
    document.getElementById('tableContainer').innerHTML=html;
  }

  let searchTimeout;
  document.getElementById('searchInput').addEventListener('input',()=>{clearTimeout(searchTimeout);searchTimeout=setTimeout(loadMedia,300);});
  document.getElementById('typeFilter').addEventListener('change',loadMedia);
  document.getElementById('statusFilter').addEventListener('change',loadMedia);

  // ===== 预览→发布 工作流 =====

  function openCreateModal(){
    currentEditingId=null;uploadedFileKey='';
    document.getElementById('modalTitle').textContent='添加内容';
    document.getElementById('mediaForm').reset();
    document.getElementById('formContent').value='';
    document.getElementById('formTextContent').value='';
    document.getElementById('formVideoUrl').value='';
    document.getElementById('fileKeyGroup').style.display='none';
    document.getElementById('uploadSection').style.display='block';
    document.getElementById('videoUrlGroup').style.display='none';
    document.getElementById('textContentGroup').style.display='none';
    document.getElementById('uploadProgress').classList.remove('active');
    document.getElementById('previewContent').innerHTML='<div class="preview-empty">填写内容后，点击「预览」查看效果</div>';
    document.getElementById('saveBtn').textContent='💾 保存草稿';
    // 填充分类下拉
    renderCategorySelect();
    document.getElementById('editModal').classList.add('active');
  }

  async function openEditModal(item){
    currentEditingId=item.id;uploadedFileKey=item.content||'';
    document.getElementById('modalTitle').textContent='编辑内容';
    document.getElementById('formType').value=item.type;
    document.getElementById('formTitle').value=item.title;
    document.getElementById('formDescription').value=item.description||'';
    document.getElementById('formTags').value=item.tags||'';
    document.getElementById('formSortOrder').value=item.sort_order||0;
    onTypeChange();
    if(item.type==='text')document.getElementById('formTextContent').value=item.content;
    else if(item.type==='video')document.getElementById('formVideoUrl').value=item.content;
    else{document.getElementById('formContent').value=item.content||'';document.getElementById('fileKeyGroup').style.display=item.content?'block':'none';}
    renderCategorySelect(item.category||'');
    // 渲染已有预览
    renderPreviewFromItem(item);
    document.getElementById('editModal').classList.add('active');
  }

  function closeModal(){document.getElementById('editModal').classList.remove('active');}

  function onTypeChange(){
    const t=document.getElementById('formType').value;
    document.getElementById('uploadSection').style.display=t==='image'?'block':'none';
    document.getElementById('videoUrlGroup').style.display=t==='video'?'block':'none';
    document.getElementById('textContentGroup').style.display=t==='text'?'block':'none';
  }

  // 实时预览渲染
  function updatePreview(){
    const type=document.getElementById('formType').value;
    const title=document.getElementById('formTitle').value.trim()||'标题预览';
    const desc=document.getElementById('formDescription').value.trim()||'描述预览...';
    const tags=document.getElementById('formTags').value.trim();
    const tagArr=tags.split(',').filter(t=>t.trim());
    let mediaHtml='';
    if(type==='image' && uploadedFileKey){
      mediaHtml='<img src="/file/'+esc(uploadedFileKey)+'" alt="'+esc(title)+'" />';
    }else if(type==='video' && document.getElementById('formVideoUrl').value.trim()){
      mediaHtml='<video src="'+esc(document.getElementById('formVideoUrl').value.trim())+'" controls muted style="max-width:200px;border-radius:8px;"></video>';
    }else if(type==='text' && document.getElementById('formTextContent').value.trim()){
      const txt=document.getElementById('formTextContent').value.trim().substring(0,120);
      mediaHtml='<div style="padding:0.5rem;background:#f8f9ff;border-radius:8px;font-size:0.85rem;color:var(--text2);line-height:1.5;">'+esc(txt)+'...</div>';
    }
    const tagHtml=tagArr.length?'<div style="display:flex;gap:0.3rem;margin-top:0.5rem;flex-wrap:wrap;">'+tagArr.map(t=>'<span class="item-tag" style="padding:0.15rem 0.5rem;background:rgba(0,113,227,0.08);color:var(--accent);border-radius:4px;font-size:0.72rem;">'+esc(t.trim())+'</span>').join('')+'</div>':'';
    const typeLabel={image:'🖼 图片',video:'🎬 视频',text:'📝 文字'}[type];
    const typeClass={image:'image',video:'video',text:'text'}[type];
    document.getElementById('previewContent').innerHTML=
      '<div class="preview-card">'+
        (mediaHtml?mediaHtml:'<div style="width:80px;height:60px;background:linear-gradient(135deg,#667eea,#764ba2);border-radius:8px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:1.2rem;">'+(type==='image'?'🖼':type==='video'?'🎬':'📝')+'</div>')+
        '<div class="info"><h4>'+esc(title)+'</h4><p>'+esc(desc)+'</p>'+tagHtml+'</div>'+
      '</div>'+
      '<div style="margin-top:0.8rem;display:flex;align-items:center;gap:0.5rem;"><span class="type-badge '+typeClass+'">'+typeLabel+'</span><span style="font-size:0.75rem;color:var(--text2);">预览模式 — 保存后不会立即发布</span></div>';
  }

  function renderPreviewFromItem(item){
    const typeLabel={image:'🖼 图片',video:'🎬 视频',text:'📝 文字'}[item.type];
    const typeClass={image:'image',video:'video',text:'text'}[item.type];
    let mediaHtml='';
    if(item.type==='image')mediaHtml='<img src="/file/'+esc(item.content)+'" alt="'+esc(item.title)+'" />';
    else if(item.type==='video')mediaHtml='<video src="'+esc(item.content)+'" controls muted style="max-width:200px;border-radius:8px;"></video>';
    else mediaHtml='<div style="padding:0.5rem;background:#f8f9ff;border-radius:8px;font-size:0.85rem;color:var(--text2);line-height:1.5;">'+esc((item.content||'').substring(0,120))+'...</div>';
    const tagArr=(item.tags||'').split(',').filter(t=>t.trim());
    const tagHtml=tagArr.length?'<div style="display:flex;gap:0.3rem;margin-top:0.5rem;flex-wrap:wrap;">'+tagArr.map(t=>'<span style="padding:0.15rem 0.5rem;background:rgba(0,113,227,0.08);color:var(--accent);border-radius:4px;font-size:0.72rem;">'+esc(t.trim())+'</span>').join('')+'</div>':'';
    document.getElementById('previewContent').innerHTML=
      '<div class="preview-card">'+mediaHtml+'<div class="info"><h4>'+esc(item.title)+'</h4><p>'+esc(item.description||'')+'</p>'+tagHtml+'</div></div>'+
      '<div style="margin-top:0.8rem;display:flex;align-items:center;gap:0.5rem;"><span class="type-badge '+typeClass+'">'+typeLabel+'</span><span style="font-size:0.75rem;color:'+(item.is_public?'var(--success)':'var(--warning)')+';">'+(' — '+(item.is_public?'已发布':'草稿'))+'</span></div>';
  }

  // 文件上传
  function handleDrop(e){e.preventDefault();e.currentTarget.classList.remove('dragover');if(e.dataTransfer.files[0])uploadFile(e.dataTransfer.files[0]);}
  function handleFileSelect(e){if(e.target.files[0])uploadFile(e.target.files[0]);}

  function uploadFile(file){
    const fd=new FormData();fd.append('file',file);
    const prog=document.getElementById('uploadProgress');
    const fill=document.getElementById('progressFill');
    const txt=document.getElementById('progressText');
    prog.classList.add('active');fill.style.width='0%';txt.textContent='上传中...';
    const xhr=new XMLHttpRequest();xhr.open('POST','/api/upload');
    xhr.upload.onprogress=e=>{if(e.lengthComputable){const p=Math.round(e.loaded/e.total*100);fill.style.width=p+'%';txt.textContent='上传中... '+p+'%';}};
    xhr.onload=()=>{
      const r=JSON.parse(xhr.responseText);
      if(xhr.status===200&&r.success){
        uploadedFileKey=r.key;document.getElementById('formContent').value=r.key;
        document.getElementById('fileKeyGroup').style.display='block';fill.style.width='100%';
        txt.textContent='✅ 上传成功: '+r.name+' ('+(r.size/1024/1024).toFixed(1)+'MB)';
        showToast('上传成功','success');updatePreview();
      }else{txt.textContent='❌ '+(r.error||'上传失败');showToast(r.error||'上传失败','error');}
    };
    xhr.onerror=()=>{txt.textContent='❌ 网络错误';showToast('网络错误','error');};
    xhr.send(fd);
  }

  // 保存（默认草稿）
  async function saveMedia(){
    const type=document.getElementById('formType').value;
    const title=document.getElementById('formTitle').value.trim();
    const desc=document.getElementById('formDescription').value.trim();
    const tags=document.getElementById('formTags').value.trim();
    const sort=parseInt(document.getElementById('formSortOrder').value)||0;
    const category=document.getElementById('formCategory').value;
    if(!title)return showToast('请输入标题','error');

    let content='';
    if(type==='text'){content=document.getElementById('formTextContent').value.trim();if(!content)return showToast('请输入文字内容','error');}
    else if(type==='video'){content=document.getElementById('formVideoUrl').value.trim();if(!content)return showToast('请输入视频地址','error');}
    else{content=uploadedFileKey||document.getElementById('formContent').value.trim();if(!content)return showToast('请先上传图片','error');}

    // 新建默认 is_public=0（草稿），编辑时保留原状态
    const wasPublished = currentEditingId ? allItems.find(i=>i.id===currentEditingId)?.is_public : false;
    const payload={type,title,description:desc,content,tags,sort_order:sort,category,is_public:wasPublished?1:0};
    const btn=document.getElementById('saveBtn');btn.disabled=true;btn.textContent='保存中...';
    try{
      const url=currentEditingId?'/api/media/'+currentEditingId:'/api/media';
      const method=currentEditingId?'PUT':'POST';
      const r=await fetch(url,{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      const d=await r.json();if(!r.ok)throw new Error(d.error||'保存失败');
      if(currentEditingId){
        showToast('更新成功（'+ (wasPublished?'已发布':'草稿') +'）','success');
      }else{
        showToast('已保存为草稿，可预览后发布','warning');
      }
      closeModal();loadStats();loadMedia();
    }catch(err){showToast(err.message,'error');}
    finally{btn.disabled=false;btn.textContent='💾 保存草稿';}
  }

  // 发布
  async function publishItem(id){
    try{
      const r=await fetch('/api/media/'+id+'/publish',{method:'POST'}),d=await r.json();
      if(!r.ok)throw new Error(d.error||'发布失败');
      showToast('✅ 已发布到前台','success');loadStats();loadMedia();
    }catch(err){showToast(err.message,'error');}
  }
  async function unpublishItem(id){
    try{
      const r=await fetch('/api/media/'+id+'/unpublish',{method:'POST'}),d=await r.json();
      if(!r.ok)throw new Error(d.error||'操作失败');
      showToast('已取消发布，转为草稿','warning');loadStats();loadMedia();
    }catch(err){showToast(err.message,'error');}
  }

  async function editItem(id){
    try{const r=await fetch('/api/media/'+id),item=await r.json();if(!r.ok)throw new Error(item.error);openEditModal(item);}
    catch(err){showToast(err.message,'error');}
  }

  // 删除（联动 KV 释放）
  async function deleteItem(id){
    const item=allItems.find(i=>i.id===id);
    const name=item?item.title:'这条内容';
    if(!confirm('确定要删除「'+name+'」吗？\\n\\n图片将同时从 KV 存储中彻底删除释放空间。'))return;
    try{
      const r=await fetch('/api/media/'+id,{method:'DELETE'}),d=await r.json();
      if(!r.ok)throw new Error(d.error||'删除失败');
      showToast(d.kv_deleted?'已删除并释放 KV 存储':'已删除','success');loadStats();loadMedia();
    }catch(err){showToast(err.message,'error');}
  }

  function toggleSelectAll(){const c=document.getElementById('selectAll').checked;document.querySelectorAll('.item-check').forEach(cb=>cb.checked=c);updateBatchBtn();}
  function updateBatchBtn(){const n=document.querySelectorAll('.item-check:checked').length;document.getElementById('batchDeleteBtn').style.display=n>0?'inline-flex':'none';}

  async function batchDelete(){
    const ids=Array.from(document.querySelectorAll('.item-check:checked')).map(cb=>parseInt(cb.value));
    if(!ids.length)return;
    if(!confirm('确定要删除选中的 '+ids.length+' 条内容吗？\\n\\n图片将同时从 KV 中彻底删除释放空间。'))return;
    try{
      const r=await fetch('/api/media/batch-delete',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ids})});
      const d=await r.json();if(!r.ok)throw new Error(d.error||'批量删除失败');
      showToast('已删除 '+d.deleted+' 条，释放 KV '+d.kv_deleted+' 张图片','success');loadStats();loadMedia();
    }catch(err){showToast(err.message,'error');}
  }

  // ===== 站点设置 =====
  async function loadSettings(){
    try{
      const r=await fetch('/api/site-settings'),d=await r.json();
      settings={site_title:d.site_title||'',site_subtitle:d.site_subtitle||'',categories:d.categories||[]};
      document.getElementById('setSiteTitle').value=settings.site_title;
      document.getElementById('setSiteSubtitle').value=settings.site_subtitle;
      renderCatList();
    }catch{}
  }

  function renderCatList(){
    const colors=['#0071e3','#ff6b6b','#a29bfe','#00b894','#fdcb6e','#e17055','#6c5ce7','#0984e3'];
    const html=settings.categories.map((c,i)=>
      '<div class="cat-item">'+
        '<input type="color" class="cat-color" value="'+esc((c.color||colors[i%colors.length]))+'" data-i="'+i+'" onchange="onCatColorChange(this)" />'+
        '<input type="text" value="'+esc(c.label)+'" placeholder="分类名称" data-i="'+i+'" oninput="onCatLabelChange(this)" />'+
        '<button class="btn btn-danger" style="padding:0.3rem 0.5rem;font-size:0.75rem;" onclick="removeCategory('+i+')">删除</button>'+
      '</div>'
    ).join('');
    document.getElementById('catList').innerHTML=html||'<div class="preview-empty">暂无分类，点击"添加分类"创建</div>';
  }

  function onCatColorChange(input){
    const i=parseInt(input.dataset.i);
    settings.categories[i].color=input.value;
  }
  function onCatLabelChange(input){
    const i=parseInt(input.dataset.i);
    settings.categories[i].label=input.value;
  }

  function addCategory(){
    const colors=['#0071e3','#ff6b6b','#a29bfe','#00b894','#fdcb6e','#e17055','#6c5ce7','#0984e3'];
    const usedCount=settings.categories.length;
    settings.categories.push({key:'cat_'+Date.now(),label:'新分类',color:colors[usedCount%colors.length]});
    renderCatList();
  }

  function removeCategory(i){
    if(!confirm('确定删除该分类？'))return;
    settings.categories.splice(i,1);
    renderCatList();
  }

  function renderCategorySelect(selectedKey){
    const sel=document.getElementById('formCategory');
    sel.innerHTML='<option value="">无</option>'+settings.categories
      .filter(c=>c.key!=='all')
      .map(c=>'<option value="'+esc(c.key)+'" '+(c.key===selectedKey?'selected':'')+'>'+esc(c.label)+'</option>').join('');
  }

  async function saveSettings(){
    const title=document.getElementById('setSiteTitle').value.trim();
    const subtitle=document.getElementById('setSiteSubtitle').value.trim();
    // 构建 categories JSON（含 gradient）
    const cats=settings.categories.map(c=>({
      key:c.key,label:c.label,color:c.color||'#0071e3',
      gradient:'linear-gradient(135deg,'+(c.color||'#0071e3')+','+lighten(c.color||'#0071e3')+')'
    }));
    try{
      const r=await fetch('/api/site-settings',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({site_title:title,site_subtitle:subtitle,categories:cats})});
      const d=await r.json();if(!r.ok)throw new Error(d.error||'保存失败');
      showToast('站点设置已保存','success');
      // 刷新前台标题
      setTimeout(()=>location.reload(),800);
    }catch(err){showToast(err.message,'error');}
  }

  function resetSettings(){
    if(!confirm('确定重置为默认设置？'))return;
    document.getElementById('setSiteTitle').value='精选作品';
    document.getElementById('setSiteSubtitle').value='图片 · 视频 · 文字 — 一切精彩，尽收眼底';
    settings.categories=[
      {key:'all',label:'全部',color:'#0071e3'},
      {key:'photography',label:'摄影',color:'#ff6b6b'},
      {key:'design',label:'设计',color:'#a29bfe'},
      {key:'video',label:'视频',color:'#00b894'},
      {key:'essay',label:'随笔',color:'#fdcb6e'}
    ];
    renderCatList();
  }

  // 颜色变亮（用于生成渐变对色）
  function lighten(hex){
    const c=hex.replace('#','');
    const r=parseInt(c.substring(0,2),16),g=parseInt(c.substring(2,4),16),b=parseInt(c.substring(4,6),16);
    const lr=Math.min(255,r+80),lg=Math.min(255,g+80),lb=Math.min(255,b+80);
    return '#'+lr.toString(16).padStart(2,'0')+lg.toString(16).padStart(2,'0')+lb.toString(16).padStart(2,'0');
  }

  // Toast & util
  function showToast(msg,type){const t=document.getElementById('toast');t.textContent=msg;t.className='toast show '+type;setTimeout(()=>t.classList.remove('show'),3000);}
  function esc(s){if(!s)return '';const d=document.createElement('div');d.textContent=s;return d.innerHTML;}
  function formatDate(s){if(!s)return '-';return s.replace('T',' ').substring(0,16);}

  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal();});
  document.getElementById('editModal').addEventListener('click',e=>{if(e.target===e.currentTarget)closeModal();});
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
