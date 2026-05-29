# 全媒体运营师刷题微信小程序

这是网页版旁边的原生微信小程序版本，独立放在 `miniprogram/`，不会影响 Next.js 网页项目。

## 使用方式

1. 在项目根目录运行 `npm run build:miniprogram-data` 生成 `miniprogram/data/question-bank.js`。
2. 打开微信开发者工具，选择导入项目。
3. 项目目录选择 `/Users/bytedance/Desktop/work/xy33/miniprogram`。
4. AppID 可先使用测试号或 `touristappid`，发布前替换成真实 AppID。

## 数据与本地记录

- 题库来自 `src/data/question-bank.json`，生成后随小程序包发布。
- 小程序端使用 `wx.setStorageSync` 保存答题记录、错题、收藏和统计。
- 本地记录 7 天过期自动清空，题库不会被清空。
