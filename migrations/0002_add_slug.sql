-- 添加自定义 slug 字段（如已存在则忽略）
ALTER TABLE media_items ADD COLUMN slug TEXT UNIQUE DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_media_items_slug ON media_items(slug);
