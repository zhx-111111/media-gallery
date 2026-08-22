# media-gallery v40.0

## 修复内容
- 修复 `NOT NULL constraint failed: media_items.title` 错误
- CREATE TABLE: title 改为 `TEXT NOT NULL DEFAULT ''`
- INSERT 语句加上 title 列

## 部署
1. `npm install && npm run build`
2. `npx wrangler deploy`
3. 在 CF Dashboard → Settings 绑定 D1/KV/环境变量
4. 访问 `/api/init/zhx20101229` 初始化数据库
