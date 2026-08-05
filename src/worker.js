/**
 * Media Gallery — 基于 Cloudflare Workers + D1 + R2 的媒体展示网站
 * 功能：前台展示图片/视频/文字 + 后台管理（登录、增删改查）
 */

// ==================== 工具函数 ====================

// SHA-256 哈希
async function sha256(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// 生成随机字符串
function randomStr(len = 16) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < len; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// 生成会话 token
async function createSession(env, username) {
  const token = randomStr(32);
  const expiry = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7天
  await env.CACHE.put(`session:${token}`, JSON.stringify({ username, expiry }), {
    expirationTtl: 7 * 24 * 60 * 60
  });
  return token;
}

// 验证会话
async function verifySession(env, token) {
  if (!token) return null;
  const data = await env.CACHE.get(`session:${token}`);
  if (!data) return null;
  try {
    const session = JSON.parse(data);
    if (session.expiry < Date.now()) return null;
    return session;
  } catch {
    return null;
  }
}

// 管理员鉴权中间件
async function requireAuth(request, env) {
  const cookie = request.headers.get('Cookie') || '';
  const tokenMatch = cookie.match(/admin_token=([^;]+)/);
  const token = tokenMatch ? tokenMatch[1] : null;
  return await verifySession(env, token);
}

// JSON 响应
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' }
  });
}

// 设置 Cookie
function setAuthCookie(token) {
  return `admin_token=${token}; Path=/; Max-Age=${7 * 24 * 60 * 60}; HttpOnly; SameSite=Strict`;
}

// 清除 Cookie
function clearAuthCookie() {
  return 'admin_token=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict';
}

// 分页参数
function getPagination(url) {
  const params = new URL(url).searchParams;
  const page = Math.max(1, parseInt(params.get('page') || '1'));
  const pageSize = Math.min(100, Math.max(1, parseInt(params.get('pageSize') || '24')));
  const offset = (page - 1) * pageSize;
  return { page, pageSize, offset };
}

// 安全获取表单字段
function getFormField(formData, name, defaultValue = '') {
  const val = formData.get(name);
  return val ? val.toString().trim() : defaultValue;
}

// ==================== 路由处理 ====================

async function handleRequest(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // CORS 预检
  if (method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }
    });
  }

  // ============ 页面路由 ============

  // 首页
  if (path === '/' && method === 'GET') {
    return new Response(renderGalleryPage(env), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }

  // 管理后台页面
  if (path === '/admin' && method === 'GET') {
    return new Response(renderAdminPage(env), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }

  // 登录页面
  if (path === '/login' && method === 'GET') {
    return new Response(renderLoginPage(), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }

  // ============ API 路由 ============

  // --- 认证 API ---
  if (path === '/api/login' && method === 'POST') {
    return handleLogin(request, env);
  }

  if (path === '/api/logout' && method === 'POST') {
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': clearAuthCookie()
      }
    });
  }

  // 检查登录状态
  if (path === '/api/auth/check' && method === 'GET') {
    const session = await requireAuth(request, env);
    return jsonResponse({ authenticated: !!session, user: session?.username || null });
  }

  // --- 公开媒体 API ---
  if (path === '/api/media' && method === 'GET') {
    return handleListMedia(request, env);
  }

  if (path.startsWith('/api/media/') && method === 'GET') {
    const id = path.split('/')[3];
    if (id && !isNaN(id)) {
      return handleGetMedia(id, env);
    }
  }

  // R2 文件代理（用于私有桶访问）
  if (path.startsWith('/file/') && method === 'GET') {
    const key = path.slice(6); // 去掉 /file/
    return handleFileProxy(key, env);
  }

  // ============ 以下需要管理员权限 ============

  const session = await requireAuth(request, env);
  const isAuthed = !!session;

  // --- 媒体管理 API（需鉴权）---
  if (path === '/api/media' && method === 'POST') {
    if (!isAuthed) return jsonResponse({ error: '未登录' }, 401);
    return handleCreateMedia(request, env);
  }

  if (path.startsWith('/api/media/') && method === 'PUT') {
    if (!isAuthed) return jsonResponse({ error: '未登录' }, 401);
    const id = path.split('/')[3];
    if (id && !isNaN(id)) {
      return handleUpdateMedia(request, id, env);
    }
  }

  if (path.startsWith('/api/media/') && method === 'DELETE') {
    if (!isAuthed) return jsonResponse({ error: '未登录' }, 401);
    const id = path.split('/')[3];
    if (id && !isNaN(id)) {
      return handleDeleteMedia(id, env);
    }
  }

  // 批量删除
  if (path === '/api/media/batch-delete' && method === 'POST') {
    if (!isAuthed) return jsonResponse({ error: '未登录' }, 401);
    return handleBatchDeleteMedia(request, env);
  }

  // --- 文件上传 API ---
  if (path === '/api/upload' && method === 'POST') {
    if (!isAuthed) return jsonResponse({ error: '未登录' }, 401);
    return handleFileUpload(request, env);
  }

  // 404
  return new Response('Not Found', { status: 404 });
}

// ==================== API 处理器 ====================

// 登录
async function handleLogin(request, env) {
  try {
    const body = await request.json();
    const username = (body.username || '').trim();
    const password = (body.password || '').trim();

    if (!username || !password) {
      return jsonResponse({ error: '请输入用户名和密码' }, 400);
    }

    const passwordHash = await sha256(password);
    const admin = await env.DB.prepare(
      'SELECT * FROM admins WHERE username = ? AND password_hash = ?'
    ).bind(username, passwordHash).first();

    if (!admin) {
      return jsonResponse({ error: '用户名或密码错误' }, 401);
    }

    const token = await createSession(env, username);
    return new Response(JSON.stringify({ success: true, username }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': setAuthCookie(token)
      }
    });
  } catch (err) {
    return jsonResponse({ error: '登录失败: ' + err.message }, 500);
  }
}

// 列出媒体（公开）
async function handleListMedia(request, env) {
  const url = new URL(request.url);
  const { page, pageSize, offset } = getPagination(request.url);
  const type = url.searchParams.get('type') || '';
  const tag = url.searchParams.get('tag') || '';
  const search = url.searchParams.get('search') || '';

  let whereClause = 'WHERE is_public = 1';
  const bindings = [];

  if (type) {
    whereClause += ' AND type = ?';
    bindings.push(type);
  }
  if (tag) {
    whereClause += ' AND tags LIKE ?';
    bindings.push(`%${tag}%`);
  }
  if (search) {
    whereClause += ' AND (title LIKE ? OR description LIKE ?)';
    bindings.push(`%${search}%`, `%${search}%`);
  }

  // 总数
  const countStmt = await env.DB.prepare(
    `SELECT COUNT(*) as total FROM media_items ${whereClause}`
  ).bind(...bindings).first();

  const total = countStmt?.total || 0;

  // 分页数据
  const itemsStmt = await env.DB.prepare(
    `SELECT * FROM media_items ${whereClause} ORDER BY sort_order DESC, created_at DESC LIMIT ? OFFSET ?`
  ).bind(...bindings, pageSize, offset).all();

  return jsonResponse({
    items: itemsStmt.results || [],
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize)
    }
  });
}

// 获取单个媒体
async function handleGetMedia(id, env) {
  const item = await env.DB.prepare(
    'SELECT * FROM media_items WHERE id = ? AND is_public = 1'
  ).bind(id).first();

  if (!item) return jsonResponse({ error: '未找到' }, 404);
  return jsonResponse(item);
}

// 创建媒体
async function handleCreateMedia(request, env) {
  try {
    const body = await request.json();
    const { type, title, description, content, thumbnail_key, tags, sort_order, is_public } = body;

    if (!type || !['image', 'video', 'text'].includes(type)) {
      return jsonResponse({ error: '类型必须是 image/video/text' }, 400);
    }
    if (!title || !content) {
      return jsonResponse({ error: '标题和内容不能为空' }, 400);
    }

    const result = await env.DB.prepare(
      `INSERT INTO media_items (type, title, description, content, thumbnail_key, tags, sort_order, is_public)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      type,
      title,
      description || '',
      content,
      thumbnail_key || null,
      tags || '',
      sort_order || 0,
      is_public !== false ? 1 : 0
    ).run();

    const newId = result.meta?.last_row_id;
    return jsonResponse({ success: true, id: newId }, 201);
  } catch (err) {
    return jsonResponse({ error: '创建失败: ' + err.message }, 500);
  }
}

// 更新媒体
async function handleUpdateMedia(request, id, env) {
  try {
    const body = await request.json();
    const fields = [];
    const bindings = [];

    const updatableFields = ['type', 'title', 'description', 'content', 'thumbnail_key', 'tags', 'sort_order', 'is_public'];
    for (const field of updatableFields) {
      if (body[field] !== undefined) {
        fields.push(`${field} = ?`);
        bindings.push(body[field]);
      }
    }

    if (fields.length === 0) {
      return jsonResponse({ error: '没有可更新的字段' }, 400);
    }

    fields.push(`updated_at = datetime('now')`);
    bindings.push(id);

    await env.DB.prepare(
      `UPDATE media_items SET ${fields.join(', ')} WHERE id = ?`
    ).bind(...bindings).run();

    return jsonResponse({ success: true });
  } catch (err) {
    return jsonResponse({ error: '更新失败: ' + err.message }, 500);
  }
}

// 删除媒体
async function handleDeleteMedia(id, env) {
  try {
    // 获取要删除的项（清理 R2 文件）
    const item = await env.DB.prepare('SELECT * FROM media_items WHERE id = ?').bind(id).first();
    if (item) {
      // 删除 R2 中的文件
      if (item.content && item.type !== 'text') {
        try { await env.MEDIA_BUCKET.delete(item.content); } catch {}
      }
      if (item.thumbnail_key) {
        try { await env.MEDIA_BUCKET.delete(item.thumbnail_key); } catch {}
      }
    }

    await env.DB.prepare('DELETE FROM media_items WHERE id = ?').bind(id).run();
    return jsonResponse({ success: true });
  } catch (err) {
    return jsonResponse({ error: '删除失败: ' + err.message }, 500);
  }
}

// 批量删除
async function handleBatchDeleteMedia(request, env) {
  try {
    const body = await request.json();
    const ids = body.ids || [];
    if (!Array.isArray(ids) || ids.length === 0) {
      return jsonResponse({ error: '请选择要删除的项' }, 400);
    }

    for (const id of ids) {
      const item = await env.DB.prepare('SELECT * FROM media_items WHERE id = ?').bind(id).first();
      if (item) {
        if (item.content && item.type !== 'text') {
          try { await env.MEDIA_BUCKET.delete(item.content); } catch {}
        }
        if (item.thumbnail_key) {
          try { await env.MEDIA_BUCKET.delete(item.thumbnail_key); } catch {}
        }
      }
    }

    const placeholders = ids.map(() => '?').join(',');
    await env.DB.prepare(`DELETE FROM media_items WHERE id IN (${placeholders})`).bind(...ids).run();
    return jsonResponse({ success: true, deleted: ids.length });
  } catch (err) {
    return jsonResponse({ error: '批量删除失败: ' + err.message }, 500);
  }
}

// 文件上传到 R2
async function handleFileUpload(request, env) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    if (!file || !(file instanceof File)) {
      return jsonResponse({ error: '未选择文件' }, 400);
    }

    // 验证文件类型
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
      'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'
    ];
    if (!allowedTypes.includes(file.type)) {
      return jsonResponse({ error: `不支持的文件类型: ${file.type}` }, 400);
    }

    // 验证文件大小 (最大 100MB)
    const maxSize = 100 * 1024 * 1024;
    if (file.size > maxSize) {
      return jsonResponse({ error: '文件大小不能超过 100MB' }, 400);
    }

    // 生成唯一文件名
    const ext = file.name.split('.').pop() || 'bin';
    const key = `${Date.now()}_${randomStr(8)}.${ext}`;

    // 上传到 R2
    const arrayBuffer = await file.arrayBuffer();
    await env.MEDIA_BUCKET.put(key, arrayBuffer, {
      httpMetadata: { contentType: file.type },
      customMetadata: {
        originalName: file.name,
        uploadedAt: new Date().toISOString()
      }
    });

    return jsonResponse({
      success: true,
      key,
      url: `/file/${key}`,
      name: file.name,
      size: file.size,
      type: file.type
    });
  } catch (err) {
    return jsonResponse({ error: '上传失败: ' + err.message }, 500);
  }
}

// R2 文件代理
async function handleFileProxy(key, env) {
  try {
    const object = await env.MEDIA_BUCKET.get(key);
    if (!object) {
      return new Response('File not found', { status: 404 });
    }

    const headers = new Headers();
    headers.set('Content-Type', object.httpMetadata?.contentType || 'application/octet-stream');
    headers.set('Cache-Control', 'public, max-age=31536000');
    if (object.httpMetadata?.contentDisposition) {
      headers.set('Content-Disposition', object.httpMetadata.contentDisposition);
    }

    return new Response(object.body, { headers });
  } catch (err) {
    return new Response('Error: ' + err.message, { status: 500 });
  }
}

// ==================== 前端页面渲染 ====================

function renderGalleryPage(env) {
  const siteName = env.SITE_NAME || '媒体画廊';
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${siteName}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
    background: #0f0f0f;
    color: #e0e0e0;
    min-height: 100vh;
  }
  header {
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
    padding: 2rem 1rem;
    text-align: center;
    border-bottom: 1px solid #333;
  }
  header h1 {
    font-size: clamp(1.5rem, 4vw, 2.5rem);
    background: linear-gradient(135deg, #e94560, #0f3460);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  header p {
    color: #888;
    margin-top: 0.5rem;
    font-size: 0.9rem;
  }
  .container {
    max-width: 1400px;
    margin: 0 auto;
    padding: 1.5rem;
  }
  .controls {
    display: flex;
    flex-wrap: wrap;
    gap: 0.8rem;
    margin-bottom: 2rem;
    align-items: center;
  }
  .controls input, .controls select {
    background: #1a1a1a;
    border: 1px solid #333;
    color: #e0e0e0;
    padding: 0.6rem 1rem;
    border-radius: 8px;
    font-size: 0.9rem;
    outline: none;
    transition: border-color 0.3s;
  }
  .controls input:focus, .controls select:focus {
    border-color: #e94560;
  }
  .controls input { flex: 1; min-width: 200px; }
  .filter-btn {
    background: #1a1a1a;
    border: 1px solid #333;
    color: #ccc;
    padding: 0.6rem 1.2rem;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.3s;
    font-size: 0.9rem;
  }
  .filter-btn:hover, .filter-btn.active {
    background: #e94560;
    color: #fff;
    border-color: #e94560;
  }
  .gallery-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 1.2rem;
  }
  .gallery-item {
    background: #1a1a1a;
    border-radius: 12px;
    overflow: hidden;
    transition: transform 0.3s, box-shadow 0.3s;
    cursor: pointer;
    border: 1px solid #2a2a2a;
  }
  .gallery-item:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 30px rgba(233, 69, 96, 0.15);
    border-color: #444;
  }
  .item-media {
    width: 100%;
    aspect-ratio: 16/10;
    object-fit: cover;
    display: block;
    background: #222;
  }
  .item-placeholder {
    width: 100%;
    aspect-ratio: 16/10;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #1a1a2e, #16213e);
    color: #666;
    font-size: 2rem;
  }
  .item-body {
    padding: 1rem;
  }
  .item-title {
    font-size: 1rem;
    font-weight: 600;
    margin-bottom: 0.4rem;
    color: #fff;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .item-desc {
    font-size: 0.85rem;
    color: #888;
    line-height: 1.4;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .item-tags {
    margin-top: 0.6rem;
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
  }
  .item-tag {
    background: #2a2a3e;
    color: #aaa;
    padding: 0.2rem 0.6rem;
    border-radius: 4px;
    font-size: 0.75rem;
  }
  .item-type-badge {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    background: rgba(0,0,0,0.7);
    color: #fff;
    padding: 0.2rem 0.5rem;
    border-radius: 4px;
    font-size: 0.7rem;
  }
  .gallery-item { position: relative; }
  .pagination {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 1rem;
    margin: 2rem 0;
  }
  .pagination button {
    background: #1a1a1a;
    border: 1px solid #333;
    color: #ccc;
    padding: 0.5rem 1rem;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.3s;
  }
  .pagination button:hover:not(:disabled) {
    background: #e94560;
    color: #fff;
    border-color: #e94560;
  }
  .pagination button:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
  .pagination span {
    color: #888;
    font-size: 0.9rem;
  }
  .empty-state {
    text-align: center;
    padding: 4rem 1rem;
    color: #666;
  }
  .empty-state h3 { font-size: 1.2rem; margin-bottom: 0.5rem; }
  .admin-link {
    position: fixed;
    bottom: 1.5rem;
    right: 1.5rem;
    background: #e94560;
    color: #fff;
    width: 50px;
    height: 50px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    text-decoration: none;
    font-size: 1.3rem;
    box-shadow: 0 4px 15px rgba(233, 69, 96, 0.4);
    transition: transform 0.3s;
  }
  .admin-link:hover { transform: scale(1.1); }

  /* 模态框 */
  .modal-overlay {
    display: none;
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.85);
    z-index: 1000;
    align-items: center;
    justify-content: center;
    padding: 1rem;
  }
  .modal-overlay.active { display: flex; }
  .modal-content {
    background: #1a1a1a;
    border-radius: 12px;
    max-width: 800px;
    width: 100%;
    max-height: 90vh;
    overflow-y: auto;
    border: 1px solid #333;
  }
  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 1.5rem;
    border-bottom: 1px solid #333;
  }
  .modal-header h2 { font-size: 1.2rem; }
  .modal-close {
    background: none;
    border: none;
    color: #888;
    font-size: 1.5rem;
    cursor: pointer;
    padding: 0.2rem 0.5rem;
  }
  .modal-body { padding: 1.5rem; }
  .modal-body img, .modal-body video {
    width: 100%;
    border-radius: 8px;
    margin-bottom: 1rem;
  }
  .modal-body p {
    color: #bbb;
    line-height: 1.6;
    white-space: pre-wrap;
  }

  @media (max-width: 600px) {
    .gallery-grid { grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 0.8rem; }
    .controls { gap: 0.5rem; }
  }
</style>
</head>
<body>
<header>
  <h1>${siteName}</h1>
  <p>图片 · 视频 · 文字 — 一切精彩，尽收眼底</p>
</header>

<div class="container">
  <div class="controls">
    <input type="text" id="searchInput" placeholder="🔍 搜索标题或描述..." />
    <select id="typeFilter">
      <option value="">全部类型</option>
      <option value="image">🖼️ 图片</option>
      <option value="video">🎬 视频</option>
      <option value="text">📝 文字</option>
    </select>
  </div>

  <div id="galleryContainer">
    <div class="empty-state">
      <h3>⏳ 加载中...</h3>
    </div>
  </div>

  <div class="pagination" id="pagination"></div>
</div>

<a href="/admin" class="admin-link" title="管理后台">⚙️</a>

<!-- 详情模态框 -->
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
  let currentPage = 1;
  let currentType = '';
  let currentSearch = '';
  let totalPages = 1;

  const container = document.getElementById('galleryContainer');
  const paginationEl = document.getElementById('pagination');
  const searchInput = document.getElementById('searchInput');
  const typeFilter = document.getElementById('typeFilter');

  async function fetchMedia() {
    const params = new URLSearchParams({
      page: currentPage,
      pageSize: 24,
      ...(currentType && { type: currentType }),
      ...(currentSearch && { search: currentSearch })
    });

    try {
      const res = await fetch('/api/media?' + params);
      const data = await res.json();
      renderGallery(data);
    } catch (err) {
      container.innerHTML = '<div class="empty-state"><h3>❌ 加载失败</h3><p>' + err.message + '</p></div>';
    }
  }

  function renderGallery(data) {
    const items = data.items || [];
    totalPages = data.pagination?.totalPages || 1;

    if (items.length === 0) {
      container.innerHTML = '<div class="empty-state"><h3>📭 暂无内容</h3><p>还没有添加任何媒体内容</p></div>';
      paginationEl.innerHTML = '';
      return;
    }

    container.innerHTML = '<div class="gallery-grid">' + items.map(item => {
      let mediaHtml = '';
      if (item.type === 'image') {
        mediaHtml = '<img class="item-media" src="/file/' + escapeHtml(item.content) + '" alt="' + escapeHtml(item.title) + '" loading="lazy" />';
      } else if (item.type === 'video') {
        mediaHtml = '<video class="item-media" src="/file/' + escapeHtml(item.content) + '" muted preload="metadata"></video>';
      } else {
        mediaHtml = '<div class="item-placeholder">📝</div>';
      }

      const tagsHtml = (item.tags || '').split(',').filter(t => t.trim()).map(t =>
        '<span class="item-tag">' + escapeHtml(t.trim()) + '</span>'
      ).join('');

      const typeLabel = { image: '🖼️', video: '🎬', text: '📝' }[item.type] || '';

      return '<div class="gallery-item" onclick="openItem(' + item.id + ')">' +
        mediaHtml +
        '<span class="item-type-badge">' + typeLabel + '</span>' +
        '<div class="item-body">' +
          '<div class="item-title">' + escapeHtml(item.title) + '</div>' +
          (item.description ? '<div class="item-desc">' + escapeHtml(item.description) + '</div>' : '') +
          (tagsHtml ? '<div class="item-tags">' + tagsHtml + '</div>' : '') +
        '</div>' +
      '</div>';
    }).join('') + '</div>';

    renderPagination();
  }

  function renderPagination() {
    if (totalPages <= 1) { paginationEl.innerHTML = ''; return; }
    paginationEl.innerHTML =
      '<button ' + (currentPage <= 1 ? 'disabled' : '') + ' onclick="changePage(' + (currentPage - 1) + ')">← 上一页</button>' +
      '<span>第 ' + currentPage + ' / ' + totalPages + ' 页</span>' +
      '<button ' + (currentPage >= totalPages ? 'disabled' : '') + ' onclick="changePage(' + (currentPage + 1) + ')">下一页 →</button>';
  }

  function changePage(page) {
    currentPage = page;
    fetchMedia();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function openItem(id) {
    try {
      const res = await fetch('/api/media/' + id);
      const item = await res.json();
      if (!res.ok) throw new Error(item.error || '加载失败');

      document.getElementById('modalTitle').textContent = item.title;
      let bodyHtml = '';

      if (item.type === 'image') {
        bodyHtml = '<img src="/file/' + escapeHtml(item.content) + '" alt="' + escapeHtml(item.title) + '" />';
      } else if (item.type === 'video') {
        bodyHtml = '<video src="/file/' + escapeHtml(item.content) + '" controls autoplay></video>';
      }

      if (item.description) {
        bodyHtml += '<p><strong>描述：</strong>' + escapeHtml(item.description) + '</p>';
      }
      if (item.type === 'text') {
        bodyHtml += '<p>' + escapeHtml(item.content).replace(/\\n/g, '<br>') + '</p>';
      }
      if (item.tags) {
        bodyHtml += '<p><strong>标签：</strong>' + escapeHtml(item.tags) + '</p>';
      }

      document.getElementById('modalBody').innerHTML = bodyHtml;
      document.getElementById('modal').classList.add('active');
    } catch (err) {
      alert('加载详情失败: ' + err.message);
    }
  }

  function closeModal() {
    document.getElementById('modal').classList.remove('active');
  }

  // 搜索防抖
  let searchTimeout;
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      currentSearch = searchInput.value.trim();
      currentPage = 1;
      fetchMedia();
    }, 300);
  });

  typeFilter.addEventListener('change', () => {
    currentType = typeFilter.value;
    currentPage = 1;
    fetchMedia();
  });

  // ESC 关闭模态框
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });

  // 点击遮罩关闭
  document.getElementById('modal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeModal();
  });

  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // 初始加载
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
<title>登录 - 管理后台</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: linear-gradient(135deg, #0f0f0f 0%, #1a1a2e 50%, #16213e 100%);
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #e0e0e0;
  }
  .login-box {
    background: #1a1a1a;
    border: 1px solid #333;
    border-radius: 16px;
    padding: 2.5rem;
    width: 100%;
    max-width: 400px;
    box-shadow: 0 20px 60px rgba(0,0,0,0.5);
  }
  .login-box h1 {
    text-align: center;
    margin-bottom: 0.5rem;
    font-size: 1.5rem;
    color: #fff;
  }
  .login-box p {
    text-align: center;
    color: #888;
    margin-bottom: 2rem;
    font-size: 0.9rem;
  }
  .form-group { margin-bottom: 1.2rem; }
  .form-group label {
    display: block;
    margin-bottom: 0.4rem;
    color: #aaa;
    font-size: 0.9rem;
  }
  .form-group input {
    width: 100%;
    padding: 0.8rem 1rem;
    background: #0f0f0f;
    border: 1px solid #333;
    border-radius: 8px;
    color: #e0e0e0;
    font-size: 1rem;
    outline: none;
    transition: border-color 0.3s;
  }
  .form-group input:focus { border-color: #e94560; }
  .btn {
    width: 100%;
    padding: 0.8rem;
    background: linear-gradient(135deg, #e94560, #c23152);
    color: #fff;
    border: none;
    border-radius: 8px;
    font-size: 1rem;
    cursor: pointer;
    transition: opacity 0.3s;
  }
  .btn:hover { opacity: 0.9; }
  .btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .error-msg {
    color: #e94560;
    font-size: 0.85rem;
    margin-top: 0.8rem;
    text-align: center;
    min-height: 1.2em;
  }
  .back-link {
    display: block;
    text-align: center;
    margin-top: 1.5rem;
    color: #888;
    text-decoration: none;
    font-size: 0.9rem;
  }
  .back-link:hover { color: #ccc; }
</style>
</head>
<body>
<div class="login-box">
  <h1>🔐 管理后台登录</h1>
  <p>请输入管理员凭据</p>
  <form id="loginForm">
    <div class="form-group">
      <label for="username">用户名</label>
      <input type="text" id="username" name="username" placeholder="admin" required />
    </div>
    <div class="form-group">
      <label for="password">密码</label>
      <input type="password" id="password" name="password" placeholder="••••••••" required />
    </div>
    <button type="submit" class="btn" id="loginBtn">登 录</button>
    <div class="error-msg" id="errorMsg"></div>
  </form>
  <a href="/" class="back-link">← 返回首页</a>
</div>
<script>
  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('loginBtn');
    const errEl = document.getElementById('errorMsg');
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();

    btn.disabled = true;
    btn.textContent = '登录中...';
    errEl.textContent = '';

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || '登录失败');

      window.location.href = '/admin';
    } catch (err) {
      errEl.textContent = err.message;
    } finally {
      btn.disabled = false;
      btn.textContent = '登 录';
    }
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
<title>管理后台 - ${siteName}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: #0f0f0f;
    color: #e0e0e0;
    min-height: 100vh;
  }
  .admin-header {
    background: linear-gradient(135deg, #1a1a2e, #16213e);
    padding: 1rem 1.5rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #333;
    flex-wrap: wrap;
    gap: 0.8rem;
  }
  .admin-header h1 { font-size: 1.2rem; color: #fff; }
  .header-actions { display: flex; gap: 0.8rem; align-items: center; }
  .btn {
    padding: 0.5rem 1rem;
    border-radius: 8px;
    border: 1px solid #333;
    background: #1a1a1a;
    color: #ccc;
    cursor: pointer;
    font-size: 0.85rem;
    transition: all 0.3s;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
  }
  .btn:hover { border-color: #555; color: #fff; }
  .btn-primary {
    background: linear-gradient(135deg, #e94560, #c23152);
    border-color: #e94560;
    color: #fff;
  }
  .btn-primary:hover { opacity: 0.9; }
  .btn-danger { background: #2a1a1a; border-color: #5a2a2a; color: #e94560; }
  .btn-danger:hover { background: #e94560; color: #fff; }
  .btn-success { background: #1a2a1a; border-color: #2a5a2a; color: #4caf50; }
  .btn-success:hover { background: #4caf50; color: #fff; }

  .container { max-width: 1400px; margin: 0 auto; padding: 1.5rem; }

  .stats-bar {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 1rem;
    margin-bottom: 1.5rem;
  }
  .stat-card {
    background: #1a1a1a;
    border: 1px solid #2a2a2a;
    border-radius: 10px;
    padding: 1rem 1.2rem;
  }
  .stat-card .label { color: #888; font-size: 0.8rem; margin-bottom: 0.3rem; }
  .stat-card .value { font-size: 1.5rem; font-weight: 700; color: #fff; }
  .stat-card.images .value { color: #4fc3f7; }
  .stat-card.videos .value { color: #e94560; }
  .stat-card.texts .value { color: #ffd54f; }

  .toolbar {
    display: flex;
    flex-wrap: wrap;
    gap: 0.8rem;
    margin-bottom: 1.5rem;
    align-items: center;
  }
  .toolbar input, .toolbar select {
    background: #1a1a1a;
    border: 1px solid #333;
    color: #e0e0e0;
    padding: 0.5rem 0.8rem;
    border-radius: 6px;
    font-size: 0.85rem;
    outline: none;
  }
  .toolbar input:focus, .toolbar select:focus { border-color: #e94560; }
  .toolbar input { flex: 1; min-width: 180px; }

  .media-table {
    width: 100%;
    border-collapse: collapse;
    background: #1a1a1a;
    border-radius: 10px;
    overflow: hidden;
    border: 1px solid #2a2a2a;
  }
  .media-table th {
    background: #222;
    padding: 0.8rem 1rem;
    text-align: left;
    color: #888;
    font-size: 0.8rem;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .media-table td {
    padding: 0.8rem 1rem;
    border-top: 1px solid #2a2a2a;
    font-size: 0.85rem;
    vertical-align: middle;
  }
  .media-table tr:hover { background: #1f1f1f; }
  .media-table .col-checkbox { width: 40px; }
  .media-table .col-preview { width: 80px; }
  .media-table .col-actions { width: 160px; text-align: right; }

  .preview-thumb {
    width: 60px;
    height: 40px;
    object-fit: cover;
    border-radius: 4px;
    background: #222;
  }
  .preview-placeholder {
    width: 60px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #222;
    border-radius: 4px;
    font-size: 1rem;
  }

  .type-badge {
    display: inline-block;
    padding: 0.2rem 0.5rem;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 500;
  }
  .type-badge.image { background: #1a3a4a; color: #4fc3f7; }
  .type-badge.video { background: #3a1a2a; color: #e94560; }
  .type-badge.text { background: #3a3a1a; color: #ffd54f; }

  .status-badge {
    display: inline-block;
    padding: 0.2rem 0.5rem;
    border-radius: 4px;
    font-size: 0.75rem;
  }
  .status-badge.public { background: #1a3a1a; color: #4caf50; }
  .status-badge.private { background: #3a3a1a; color: #ff9800; }

  .action-btns { display: flex; gap: 0.4rem; justify-content: flex-end; }
  .action-btns .btn { padding: 0.3rem 0.6rem; font-size: 0.8rem; }

  /* 模态框 */
  .modal-overlay {
    display: none;
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.85);
    z-index: 1000;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    overflow-y: auto;
  }
  .modal-overlay.active { display: flex; }
  .modal-content {
    background: #1a1a1a;
    border-radius: 12px;
    max-width: 600px;
    width: 100%;
    border: 1px solid #333;
    margin: auto;
  }
  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 1.5rem;
    border-bottom: 1px solid #333;
  }
  .modal-header h2 { font-size: 1.1rem; }
  .modal-close {
    background: none; border: none; color: #888;
    font-size: 1.5rem; cursor: pointer;
  }
  .modal-body { padding: 1.5rem; }
  .modal-footer {
    padding: 1rem 1.5rem;
    border-top: 1px solid #333;
    display: flex;
    justify-content: flex-end;
    gap: 0.8rem;
  }

  .form-group { margin-bottom: 1rem; }
  .form-group label {
    display: block;
    margin-bottom: 0.3rem;
    color: #aaa;
    font-size: 0.85rem;
  }
  .form-group input,
  .form-group select,
  .form-group textarea {
    width: 100%;
    padding: 0.6rem 0.8rem;
    background: #0f0f0f;
    border: 1px solid #333;
    border-radius: 6px;
    color: #e0e0e0;
    font-size: 0.9rem;
    outline: none;
    font-family: inherit;
  }
  .form-group textarea { min-height: 80px; resize: vertical; }
  .form-group input:focus,
  .form-group select:focus,
  .form-group textarea:focus { border-color: #e94560; }

  .upload-area {
    border: 2px dashed #333;
    border-radius: 8px;
    padding: 2rem 1rem;
    text-align: center;
    cursor: pointer;
    transition: border-color 0.3s;
    margin-bottom: 1rem;
  }
  .upload-area:hover, .upload-area.dragover {
    border-color: #e94560;
    background: #1f1f1f;
  }
  .upload-area p { color: #888; margin-bottom: 0.5rem; }
  .upload-area .upload-btn {
    background: #e94560;
    color: #fff;
    border: none;
    padding: 0.5rem 1.2rem;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.85rem;
  }
  .upload-progress {
    margin-top: 0.5rem;
    display: none;
  }
  .upload-progress.active { display: block; }
  .progress-bar {
    height: 4px;
    background: #333;
    border-radius: 2px;
    overflow: hidden;
  }
  .progress-bar .fill {
    height: 100%;
    background: #e94560;
    width: 0%;
    transition: width 0.3s;
  }

  .checkbox { width: 18px; height: 18px; cursor: pointer; }

  .toast {
    position: fixed;
    top: 1rem;
    right: 1rem;
    padding: 0.8rem 1.2rem;
    border-radius: 8px;
    color: #fff;
    font-size: 0.9rem;
    z-index: 2000;
    opacity: 0;
    transform: translateY(-10px);
    transition: opacity 0.3s, transform 0.3s;
    pointer-events: none;
  }
  .toast.show { opacity: 1; transform: translateY(0); }
  .toast.success { background: #4caf50; }
  .toast.error { background: #e94560; }

  .empty-state {
    text-align: center;
    padding: 3rem 1rem;
    color: #666;
  }

  @media (max-width: 768px) {
    .media-table .col-preview,
    .media-table .col-tags,
    .media-table .col-date { display: none; }
    .admin-header h1 { font-size: 1rem; }
  }
</style>
</head>
<body>
<div class="admin-header">
  <h1>⚙️ 管理后台</h1>
  <div class="header-actions">
    <a href="/" class="btn">🏠 查看前台</a>
    <button class="btn btn-danger" onclick="logout()">🚪 退出</button>
  </div>
</div>

<div class="container">
  <!-- 统计卡片 -->
  <div class="stats-bar" id="statsBar">
    <div class="stat-card"><div class="label">总计</div><div class="value" id="statTotal">-</div></div>
    <div class="stat-card images"><div class="label">图片</div><div class="value" id="statImages">-</div></div>
    <div class="stat-card videos"><div class="label">视频</div><div class="value" id="statVideos">-</div></div>
    <div class="stat-card texts"><div class="label">文字</div><div class="value" id="statTexts">-</div></div>
  </div>

  <!-- 工具栏 -->
  <div class="toolbar">
    <input type="text" id="searchInput" placeholder="🔍 搜索..." />
    <select id="typeFilter">
      <option value="">全部类型</option>
      <option value="image">图片</option>
      <option value="video">视频</option>
      <option value="text">文字</option>
    </select>
    <button class="btn btn-primary" onclick="openCreateModal()">➕ 添加内容</button>
    <button class="btn btn-danger" id="batchDeleteBtn" style="display:none" onclick="batchDelete()">🗑️ 批量删除</button>
  </div>

  <!-- 数据表格 -->
  <div id="tableContainer">
    <div class="empty-state">⏳ 加载中...</div>
  </div>
</div>

<!-- 添加/编辑模态框 -->
<div class="modal-overlay" id="editModal">
  <div class="modal-content">
    <div class="modal-header">
      <h2 id="modalTitle">添加内容</h2>
      <button class="modal-close" onclick="closeModal('editModal')">✕</button>
    </div>
    <div class="modal-body">
      <form id="mediaForm">
        <input type="hidden" id="editId" />
        <div class="form-group">
          <label>类型 *</label>
          <select id="formType" onchange="onTypeChange()" required>
            <option value="image">🖼️ 图片</option>
            <option value="video">🎬 视频</option>
            <option value="text">📝 文字</option>
          </select>
        </div>
        <div class="form-group">
          <label>标题 *</label>
          <input type="text" id="formTitle" placeholder="输入标题" required />
        </div>

        <!-- 文件上传区域（图片/视频时显示） -->
        <div id="uploadSection">
          <label style="display:block;margin-bottom:0.3rem;color:#aaa;font-size:0.85rem;">上传文件</label>
          <div class="upload-area" id="uploadArea"
               onclick="document.getElementById('fileInput').click()"
               ondragover="event.preventDefault();this.classList.add('dragover')"
               ondragleave="this.classList.remove('dragover')"
               ondrop="handleDrop(event)">
            <p>📁 拖拽文件到此处，或点击选择</p>
            <button type="button" class="upload-btn">选择文件</button>
            <p style="font-size:0.75rem;margin-top:0.5rem;color:#666;">支持 JPG/PNG/GIF/WebP/MP4/WebM，最大 100MB</p>
          </div>
          <input type="file" id="fileInput" style="display:none"
                 accept="image/*,video/*" onchange="handleFileSelect(event)" />
          <div class="upload-progress" id="uploadProgress">
            <div class="progress-bar"><div class="fill" id="progressFill"></div></div>
            <p style="font-size:0.8rem;color:#888;margin-top:0.3rem;" id="progressText">上传中...</p>
          </div>
          <div class="form-group" id="fileKeyGroup" style="display:none;">
            <label>已上传文件</label>
            <input type="text" id="formContent" placeholder="上传后自动填充" readonly />
          </div>
        </div>

        <!-- 文字内容区域（文字类型时显示） -->
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
        <div style="display:flex;gap:1rem;">
          <div class="form-group" style="flex:1;">
            <label>排序权重</label>
            <input type="number" id="formSortOrder" value="0" placeholder="越大越靠前" />
          </div>
          <div class="form-group" style="flex:1;">
            <label>可见性</label>
            <select id="formIsPublic">
              <option value="1">🌐 公开</option>
              <option value="0">🔒 私有</option>
            </select>
          </div>
        </div>
      </form>
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal('editModal')">取消</button>
      <button class="btn btn-primary" id="saveBtn" onclick="saveMedia()">💾 保存</button>
    </div>
  </div>
</div>

<div class="toast" id="toast"></div>

<script>
  // ============ 全局状态 ============
  let allItems = [];
  let currentEditingId = null;
  let uploadedFileKey = '';

  // ============ 初始化 ============
  checkAuth();
  loadStats();
  loadMedia();

  async function checkAuth() {
    try {
      const res = await fetch('/api/auth/check');
      const data = await res.json();
      if (!data.authenticated) {
        window.location.href = '/login';
      }
    } catch {
      window.location.href = '/login';
    }
  }

  async function logout() {
    await fetch('/api/logout', { method: 'POST' });
    window.location.href = '/login';
  }

  // ============ 数据加载 ============
  async function loadStats() {
    try {
      const res = await fetch('/api/media?pageSize=1000');
      const data = await res.json();
      const items = data.items || [];
      document.getElementById('statTotal').textContent = items.length;
      document.getElementById('statImages').textContent = items.filter(i => i.type === 'image').length;
      document.getElementById('statVideos').textContent = items.filter(i => i.type === 'video').length;
      document.getElementById('statTexts').textContent = items.filter(i => i.type === 'text').length;
    } catch {}
  }

  async function loadMedia() {
    const search = document.getElementById('searchInput').value.trim();
    const type = document.getElementById('typeFilter').value;
    const params = new URLSearchParams({ pageSize: 100 });
    if (search) params.set('search', search);
    if (type) params.set('type', type);

    try {
      const res = await fetch('/api/media?' + params);
      const data = await res.json();
      allItems = data.items || [];
      renderTable();
    } catch {
      document.getElementById('tableContainer').innerHTML =
        '<div class="empty-state">❌ 加载失败</div>';
    }
  }

  function renderTable() {
    if (allItems.length === 0) {
      document.getElementById('tableContainer').innerHTML =
        '<div class="empty-state">📭 暂无内容，点击"添加内容"开始</div>';
      return;
    }

    const html = '<table class="media-table">' +
      '<thead><tr>' +
        '<th class="col-checkbox"><input type="checkbox" class="checkbox" id="selectAll" onchange="toggleSelectAll()" /></th>' +
        '<th class="col-preview">预览</th>' +
        '<th>标题</th>' +
        '<th>类型</th>' +
        '<th class="col-tags">标签</th>' +
        '<th>状态</th>' +
        '<th class="col-date">更新时间</th>' +
        '<th class="col-actions">操作</th>' +
      '</tr></thead><tbody>' +
      allItems.map(item => {
        const preview = item.type === 'image'
          ? '<img class="preview-thumb" src="/file/' + esc(item.content) + '" />'
          : item.type === 'video'
          ? '<div class="preview-placeholder">🎬</div>'
          : '<div class="preview-placeholder">📝</div>';

        const tags = (item.tags || '').split(',').filter(t => t.trim()).slice(0, 3).join(', ') || '-';
        const status = item.is_public ? '<span class="status-badge public">公开</span>' : '<span class="status-badge private">私有</span>';
        const typeLabel = { image: '🖼️ 图片', video: '🎬 视频', text: '📝 文字' }[item.type] || item.type;

        return '<tr>' +
          '<td><input type="checkbox" class="checkbox item-check" onchange="updateBatchBtn()" value="' + item.id + '" /></td>' +
          '<td>' + preview + '</td>' +
          '<td>' + esc(item.title) + '</td>' +
          '<td><span class="type-badge ' + item.type + '">' + typeLabel + '</span></td>' +
          '<td class="col-tags">' + esc(tags) + '</td>' +
          '<td>' + status + '</td>' +
          '<td class="col-date">' + formatDate(item.updated_at) + '</td>' +
          '<td><div class="action-btns">' +
            '<button class="btn" onclick="editItem(' + item.id + ')">✏️ 编辑</button>' +
            '<button class="btn btn-danger" onclick="deleteItem(' + item.id + ')">🗑️</button>' +
          '</div></td>' +
        '</tr>';
      }).join('') +
      '</tbody></table>';

    document.getElementById('tableContainer').innerHTML = html;
  }

  // ============ 搜索和筛选 ============
  let searchTimeout;
  document.getElementById('searchInput').addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(loadMedia, 300);
  });
  document.getElementById('typeFilter').addEventListener('change', loadMedia);

  // ============ 模态框 ============
  function openCreateModal() {
    currentEditingId = null;
    uploadedFileKey = '';
    document.getElementById('modalTitle').textContent = '添加内容';
    document.getElementById('editId').value = '';
    document.getElementById('mediaForm').reset();
    document.getElementById('formContent').value = '';
    document.getElementById('formTextContent').value = '';
    document.getElementById('fileKeyGroup').style.display = 'none';
    document.getElementById('uploadSection').style.display = 'block';
    document.getElementById('textContentGroup').style.display = 'none';
    document.getElementById('uploadProgress').classList.remove('active');
    closeModal('editModal', true);
    document.getElementById('editModal').classList.add('active');
  }

  function openEditModal(item) {
    currentEditingId = item.id;
    uploadedFileKey = item.content || '';
    document.getElementById('modalTitle').textContent = '编辑内容';
    document.getElementById('formType').value = item.type;
    document.getElementById('formTitle').value = item.title;
    document.getElementById('formDescription').value = item.description || '';
    document.getElementById('formTags').value = item.tags || '';
    document.getElementById('formSortOrder').value = item.sort_order || 0;
    document.getElementById('formIsPublic').value = item.is_public ? '1' : '0';

    onTypeChange();

    if (item.type === 'text') {
      document.getElementById('formTextContent').value = item.content;
    } else {
      document.getElementById('formContent').value = item.content;
      document.getElementById('fileKeyGroup').style.display = item.content ? 'block' : 'none';
    }

    document.getElementById('editModal').classList.add('active');
  }

  function closeModal(id, silent) {
    document.getElementById(id || 'editModal').classList.remove('active');
  }

  function onTypeChange() {
    const type = document.getElementById('formType').value;
    if (type === 'text') {
      document.getElementById('uploadSection').style.display = 'none';
      document.getElementById('textContentGroup').style.display = 'block';
      document.getElementById('fileKeyGroup').style.display = 'none';
    } else {
      document.getElementById('uploadSection').style.display = 'block';
      document.getElementById('textContentGroup').style.display = 'none';
    }
  }

  // ============ 文件上传 ============
  function handleDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0) uploadFile(files[0]);
  }

  function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) uploadFile(file);
  }

  async function uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);

    const progressEl = document.getElementById('uploadProgress');
    const fillEl = document.getElementById('progressFill');
    const textEl = document.getElementById('progressText');

    progressEl.classList.add('active');
    fillEl.style.width = '0%';
    textEl.textContent = '上传中...';

    try {
      // 使用 XMLHttpRequest 以支持进度
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/upload');

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const pct = Math.round(e.loaded / e.total * 100);
          fillEl.style.width = pct + '%';
          textEl.textContent = '上传中... ' + pct + '%';
        }
      };

      xhr.onload = () => {
        const res = JSON.parse(xhr.responseText);
        if (xhr.status === 200 && res.success) {
          uploadedFileKey = res.key;
          document.getElementById('formContent').value = res.key;
          document.getElementById('fileKeyGroup').style.display = 'block';
          fillEl.style.width = '100%';
          textEl.textContent = '✅ 上传成功: ' + res.name;
          showToast('上传成功', 'success');
        } else {
          textEl.textContent = '❌ 上传失败: ' + (res.error || '未知错误');
          showToast(res.error || '上传失败', 'error');
        }
      };

      xhr.onerror = () => {
        textEl.textContent = '❌ 网络错误';
        showToast('网络错误', 'error');
      };

      xhr.send(formData);
    } catch (err) {
      textEl.textContent = '❌ ' + err.message;
      showToast(err.message, 'error');
    }
  }

  // ============ 保存 ============
  async function saveMedia() {
    const type = document.getElementById('formType').value;
    const title = document.getElementById('formTitle').value.trim();
    const description = document.getElementById('formDescription').value.trim();
    const tags = document.getElementById('formTags').value.trim();
    const sortOrder = parseInt(document.getElementById('formSortOrder').value) || 0;
    const isPublic = document.getElementById('formIsPublic').value === '1';

    if (!title) return showToast('请输入标题', 'error');

    let content = '';
    if (type === 'text') {
      content = document.getElementById('formTextContent').value.trim();
      if (!content) return showToast('请输入文字内容', 'error');
    } else {
      content = uploadedFileKey || document.getElementById('formContent').value.trim();
      if (!content) return showToast('请先上传文件', 'error');
    }

    const payload = {
      type, title, description, content, tags,
      sort_order: sortOrder,
      is_public: isPublic ? 1 : 0
    };

    const btn = document.getElementById('saveBtn');
    btn.disabled = true;
    btn.textContent = '保存中...';

    try {
      let res;
      if (currentEditingId) {
        res = await fetch('/api/media/' + currentEditingId, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch('/api/media', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '保存失败');

      showToast(currentEditingId ? '更新成功' : '创建成功', 'success');
      closeModal('editModal');
      loadStats();
      loadMedia();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = '💾 保存';
    }
  }

  // ============ 编辑 ============
  async function editItem(id) {
    try {
      const res = await fetch('/api/media/' + id);
      const item = await res.json();
      if (!res.ok) throw new Error(item.error || '加载失败');
      openEditModal(item);
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  // ============ 删除 ============
  async function deleteItem(id) {
    if (!confirm('确定要删除这条内容吗？')) return;
    try {
      const res = await fetch('/api/media/' + id, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '删除失败');
      showToast('删除成功', 'success');
      loadStats();
      loadMedia();
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  // ============ 批量操作 ============
  function toggleSelectAll() {
    const checked = document.getElementById('selectAll').checked;
    document.querySelectorAll('.item-check').forEach(cb => cb.checked = checked);
    updateBatchBtn();
  }

  function updateBatchBtn() {
    const checked = document.querySelectorAll('.item-check:checked').length;
    document.getElementById('batchDeleteBtn').style.display = checked > 0 ? 'inline-flex' : 'none';
  }

  async function batchDelete() {
    const ids = Array.from(document.querySelectorAll('.item-check:checked')).map(cb => parseInt(cb.value));
    if (ids.length === 0) return;
    if (!confirm('确定要删除选中的 ' + ids.length + ' 条内容吗？')) return;

    try {
      const res = await fetch('/api/media/batch-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '批量删除失败');
      showToast('已删除 ' + data.deleted + ' 条内容', 'success');
      loadStats();
      loadMedia();
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  // ============ 工具函数 ============
  function showToast(msg, type) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.className = 'toast show ' + type;
    setTimeout(() => toast.classList.remove('show'), 3000);
  }

  function esc(str) {
    if (!str) return '';
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  function formatDate(s) {
    if (!s) return '-';
    return s.replace('T', ' ').substring(0, 16);
  }

  // ESC 关闭模态框
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal('editModal');
  });
  document.getElementById('editModal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeModal('editModal');
  });
</script>
</body>
</html>`;
}

// ==================== Worker 入口 ====================

export default {
  async fetch(request, env, ctx) {
    return handleRequest(request, env);
  }
};
