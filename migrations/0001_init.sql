-- 媒体项表：存储所有展示内容（图片、视频、文字）
CREATE TABLE IF NOT EXISTS media_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL CHECK (type IN ('image', 'video', 'text')),
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    -- image  : KV 中的 key（二进制存在 MEDIA_KV）
    -- video  : 外部直链 URL（YouTube/B站/任意 mp4 链接）
    -- text   : 纯文本内容
    content TEXT NOT NULL,
    -- 缩略图 key（可选，image 类型可存 KV key）
    thumbnail_key TEXT DEFAULT NULL,
    -- 标签，逗号分隔
    tags TEXT DEFAULT '',
    -- 排序权重，越大越靠前
    sort_order INTEGER DEFAULT 0,
    -- 是否公开（已发布）
    is_public INTEGER DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_media_type ON media_items(type);
CREATE INDEX IF NOT EXISTS idx_media_public ON media_items(is_public);
CREATE INDEX IF NOT EXISTS idx_media_sort ON media_items(sort_order DESC, created_at DESC);

-- 管理员表（支持多管理员）
CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 初始化默认管理员 (用户名: admin, 密码: admin123)
INSERT OR IGNORE INTO admins (username, password_hash) VALUES ('admin', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9');

-- 站点设置表：存储可自定义的标题、副标题、分类等
CREATE TABLE IF NOT EXISTS site_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 预置默认站点设置
INSERT OR IGNORE INTO site_settings (key, value) VALUES ('site_title', '精选作品');
INSERT OR IGNORE INTO site_settings (key, value) VALUES ('site_subtitle', '图片 · 视频 · 文字 — 一切精彩，尽收眼底');
INSERT OR IGNORE INTO site_settings (key, value) VALUES ('categories', '[{"key":"all","label":"全部","gradient":"linear-gradient(135deg,#0071e3,#5e5ce6)"},{"key":"photography","label":"摄影","gradient":"linear-gradient(135deg,#ff6b6b,#ee5a24)"},{"key":"design","label":"设计","gradient":"linear-gradient(135deg,#a29bfe,#6c5ce7)"},{"key":"video","label":"视频","gradient":"linear-gradient(135deg,#00b894,#00cec9)"},{"key":"essay","label":"随笔","gradient":"linear-gradient(135deg,#fdcb6e,#e17055)"}]');
