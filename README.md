# Media Gallery — Cloudflare Workers

深度毛玻璃风格的轻量作品集站点，跑在 Cloudflare Workers + D1 + KV 上。

## 功能

- 图片 / 视频 / 文字 三种内容类型
- 独立封面图（与正文解耦）
- 自定义 Slug、SEO 字段、发布/过期时间、隐藏、置顶权重
- 多图画廊（竖向滑动）、附件下载、自定义 CSS 类
- 暗色模式、Hero 背景自定义、Logo/Favicon
- 富文本页脚/公告/关于页、导航链接、品牌名
- RSS、Sitemap、复制链接、懒加载占位
- 分类管理、统计仪表盘、批量操作

## 部署

参考 `DEPLOY_FIX.md`。核心步骤：

1. 建 D1 数据库 `media_gallery_db` + 两个 KV `CACHE` / `MEDIA_KV`
2. 在 GitHub Secrets 填入 4 个值（API Token + 3 个 ID）
3. Push 到 main 分支，GitHub Actions 自动跑迁移 + 部署

## 技术说明

- `wrangler.toml` 使用占位符 `__D1_DB_ID__` 等，由 Actions 运行时替换为真实值
- 锁定 `wrangler@4.86.0`（4.120+ 对大文件有回归 bug）
- `worker.js` 是单文件 Worker，内含全部 UI 与 API
