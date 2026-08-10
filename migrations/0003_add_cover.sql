-- 添加独立封面图字段
ALTER TABLE media_items ADD COLUMN cover_key TEXT DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_media_items_cover ON media_items(cover_key);
