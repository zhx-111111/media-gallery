-- 新增字段：自定义 slug、SEO、发布时间、过期时间、置顶权重、隐藏、多图、附件、品牌名、主题色、暗色模式、公告(HTML)、页脚(HTML)、导航链接、关于页(HTML)、懒加载占位
ALTER TABLE media_items ADD COLUMN custom_slug TEXT DEFAULT NULL;
ALTER TABLE media_items ADD COLUMN seo_description TEXT DEFAULT '';
ALTER TABLE media_items ADD COLUMN seo_keywords TEXT DEFAULT '';
ALTER TABLE media_items ADD COLUMN publish_at TEXT DEFAULT NULL;
ALTER TABLE media_items ADD COLUMN expire_at TEXT DEFAULT NULL;
ALTER TABLE media_items ADD COLUMN sort_weight INTEGER DEFAULT 0;
ALTER TABLE media_items ADD COLUMN is_hidden INTEGER DEFAULT 0;
ALTER TABLE media_items ADD COLUMN gallery_keys TEXT DEFAULT '';
ALTER TABLE media_items ADD COLUMN attachment_key TEXT DEFAULT NULL;
ALTER TABLE media_items ADD COLUMN attachment_name TEXT DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_media_custom_slug ON media_items(custom_slug);
CREATE INDEX IF NOT EXISTS idx_media_publish_at ON media_items(publish_at);
CREATE INDEX IF NOT EXISTS idx_media_expire_at ON media_items(expire_at);
CREATE INDEX IF NOT EXISTS idx_media_hidden ON media_items(is_hidden);
CREATE INDEX IF NOT EXISTS idx_media_sort_weight ON media_items(sort_weight DESC);

-- site_settings 新增键（通过 handleUpdSiteSettings 写入）：
--   brand_name       品牌名（替换 Gallery）
--   brand_logo_key   Logo 图片 KV key
--   favicon_key      Favicon 图片 KV key
--   theme_accent    主题色 hex
--   theme_dark_mode  暗色模式 on/off/auto
--   hero_bg_type    none/gradient/image/video
--   hero_gradient   自定义渐变 css
--   hero_image_key   Hero 背景图 KV key
--   hero_video_url  Hero 背景视频 URL
--   footer_html     页脚 HTML
--   announcement_html 公告 HTML（支持 HTML）
--   nav_links       JSON 数组 [{label,url,external}]
--   about_html      关于页 HTML
--   copy_link_text  复制链接按钮文案
--   lazy_placeholder 懒加载占位图 KV key
--   rss_enabled     1/0
--   sitemap_enabled  1/0
