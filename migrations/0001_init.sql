-- 初始建表：media_items + admins
CREATE TABLE IF NOT EXISTS media_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    type TEXT NOT NULL DEFAULT 'image',
    content TEXT DEFAULT '',
    content_key TEXT DEFAULT NULL,
    cover_key TEXT DEFAULT NULL,
    slug TEXT UNIQUE DEFAULT NULL,
    tags TEXT DEFAULT '',
    category TEXT DEFAULT 'default',
    status TEXT DEFAULT 'published',
    is_hidden INTEGER DEFAULT 0,
    published_at TEXT DEFAULT (datetime('now','localtime')),
    expires_at TEXT DEFAULT NULL,
    weight INTEGER DEFAULT 0,
    custom_css_class TEXT DEFAULT '',
    meta_description TEXT DEFAULT '',
    meta_keywords TEXT DEFAULT '',
    gallery_images TEXT DEFAULT NULL,
    attachment_key TEXT DEFAULT NULL,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    updated_at TEXT DEFAULT (datetime('now','localtime'))
);

CREATE INDEX IF NOT EXISTS idx_media_items_type ON media_items(type);
CREATE INDEX IF NOT EXISTS idx_media_items_category ON media_items(category);
CREATE INDEX IF NOT EXISTS idx_media_items_status ON media_items(status);
CREATE INDEX IF NOT EXISTS idx_media_items_published_at ON media_items(published_at);
CREATE INDEX IF NOT EXISTS idx_media_items_is_hidden ON media_items(is_hidden);

CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now','localtime'))
);
