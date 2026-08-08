-- 为 media_items 表添加 slug 字段（独立 URL 用）
-- SQLite 不支持 ADD COLUMN ... UNIQUE，所以拆成两步
ALTER TABLE media_items ADD COLUMN slug TEXT;

ALTER TABLE media_items ADD COLUMN views INTEGER DEFAULT 0 NOT NULL;

-- 为已有数据生成初始 slug（用 id 做兜底）
UPDATE media_items SET slug = 'item-' || id WHERE slug IS NULL;

-- 创建唯一索引来替代 UNIQUE 约束
CREATE UNIQUE INDEX IF NOT EXISTS idx_media_slug ON media_items(slug);
