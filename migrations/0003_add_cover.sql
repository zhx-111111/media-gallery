-- 新增 cover_key：独立的封面图（存于 MEDIA_KV）
-- 与 content / thumbnail_key 解耦，专门用作列表卡 & 详情页顶部封面
ALTER TABLE media_items ADD COLUMN cover_key TEXT DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_media_cover ON media_items(cover_key);
