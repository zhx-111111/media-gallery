# 🚀 GitHub 上传指南

## 问题说明

当前使用的 GitHub Token 权限不足（缺少 `repo` 权限），无法通过 API 自动创建仓库。

## 方案一：手动创建仓库（30秒搞定）✅

1. 打开 https://github.com/new
2. **Repository name** 填 `media-gallery`
3. 选 **Public**
4. **不要**勾选 "Add a README file"（已有 README）
5. 点击 **Create repository**

然后告诉我仓库已创建，我会自动帮你推送代码上去！

## 方案二：重新生成 Token

1. 打开 https://github.com/settings/tokens?type=beta
2. 点击 **Generate new token (fine-grained)**
3. 设置：
   - **Repository access** → 选 **All repositories**
   - **Permissions** → **Contents** → 选 **Read and write**
4. 生成后把新 token 发给我，我会自动完成所有操作

## 方案三：使用经典 Token

1. 打开 https://github.com/settings/tokens
2. 点击 **Generate new token (classic)**
3. 勾选 `repo` 权限（全选即可）
4. 生成后发给我

---

> 💡 **推荐方案一**，最快最简单，创建空仓库后告诉我一声就行！
