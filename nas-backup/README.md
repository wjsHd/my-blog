# 博客 NAS 自动备份

该服务启动后立即执行一次备份，此后每 24 小时执行一次。它不会开放任何网络端口。

备份内容：

- Supabase 的 `posts`、`site_settings`、`daily_entries` 全量 JSON，以及 Auth 用户清单
- 数据库结构 `schema.sql`
- 正文与封面引用的远程图片、视频（按 URL 哈希增量保存）
- GitHub `main` 分支源码归档
- 每次运行的清单、状态和日志

备份结果写入 `data/`。数据库、源码快照默认保留 30 天；媒体采用去重的长期增量保存。

## 飞牛 fnOS Docker

1. 将整个目录上传到 NAS。
2. 复制 `.env.example` 为 `.env` 并填写 Supabase URL 和 service-role key。
3. 在 Docker Compose 项目中选择本目录的 `docker-compose.yml` 并启动。
4. 检查 `data/status.json`，其中 `ok: true` 表示最近一次备份成功。

恢复时可按 `id` 将 JSON 数据重新写入同名表；媒体清单位于 `data/media/manifest.json`。正式恢复前应先在临时 Supabase 项目验证。
