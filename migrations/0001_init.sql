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
    -- 是否公开
    is_public INTEGER DEFAULT 1,
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
-- 密码哈希使用 SHA-256，实际部署请修改
INSERT OR IGNORE INTO admins (username, password_hash) VALUES ('admin', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9');
