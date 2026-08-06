-- 为 media_items 表添加 slug 字段（独立 URL 用）
ALTER TABLE media_items ADD COLUMN slug TEXT UNIQUE;
ALTER TABLE media_items ADD COLUMN views INTEGER DEFAULT 0 NOT NULL;

-- 为已有数据生成初始 slug（用 id 做兜底）
UPDATE media_items SET slug = 'item-' || id WHERE slug IS NULL;
