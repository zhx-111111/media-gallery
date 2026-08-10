-- v5 自定义字段扩展
ALTER TABLE media_items ADD COLUMN is_hidden INTEGER DEFAULT 0;
ALTER TABLE media_items ADD COLUMN expires_at TEXT DEFAULT NULL;
ALTER TABLE media_items ADD COLUMN weight INTEGER DEFAULT 0;
ALTER TABLE media_items ADD COLUMN custom_css_class TEXT DEFAULT '';
ALTER TABLE media_items ADD COLUMN meta_description TEXT DEFAULT '';
ALTER TABLE media_items ADD COLUMN meta_keywords TEXT DEFAULT '';
ALTER TABLE media_items ADD COLUMN gallery_images TEXT DEFAULT NULL;
ALTER TABLE media_items ADD COLUMN attachment_key TEXT DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_media_items_is_hidden ON media_items(is_hidden);
CREATE INDEX IF NOT EXISTS idx_media_items_weight ON media_items(weight);
