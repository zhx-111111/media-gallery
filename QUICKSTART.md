# Quick Start

## 首次部署后

1. 访问 `https://yoursite.com/api/init/zhx20101229` → 初始化数据库（含自动迁移）
2. 访问 `/admin` → 登录 `admin / admin123`
3. 点 "新建内容" → 上传图片/视频/写文字 → 发布

## 数据库迁移

v36.0+ 支持自动迁移。如果数据库是从旧版升级的，访问 `/api/init/zhx20101229` 会自动补上缺失的列（`custom_link`, `link_target`, `gallery_keys`, `video_url`）。

## 上传故障排查

打开 F12 控制台，上传时会看到日志：
- `[upload] start` — 开始
- `[upload] content-type: multipart/form-data` — 请求格式正确
- `[upload] file: name=xxx size=xxx` — 文件信息
- `[upload] binary bytes: xxx` — 二进制大小
- `[upload] stored: file_xxx` — KV 存储成功

如果看到 `[upload] ERROR`，把错误信息截图发给我。
