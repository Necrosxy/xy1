# 多设备同步部署配置

这个项目的题库仍然是静态 JSON。多设备同步只把用户练习状态写入 Postgres。

## Vercel + Neon

1. 在 Vercel Marketplace 添加 Neon Postgres 到当前项目，或在 Neon 控制台创建数据库。
2. 确认 Vercel 项目环境变量里有 `DATABASE_URL`。
3. 重新部署 Vercel。
4. 打开网页的「统计」页，生成同步码。
5. 另一台设备打开同一个网页，在「统计」页输入同步码并绑定。

API 会在首次同步时自动创建表：

```sql
CREATE TABLE IF NOT EXISTS omnimedia_practice_sync (
  sync_key_hash text PRIMARY KEY,
  state jsonb NOT NULL,
  updated_at timestamptz NOT NULL
);
```

同步码是访问同一份云端记录的凭证。不要公开分享。
