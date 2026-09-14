import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const projectRoot = resolve(import.meta.dirname, '..');
const source = join(projectRoot, 'nas-backup');
const output = join(projectRoot, 'fnos-backup-deploy', '博客备份服务');

function parseEnv(text) {
  const values = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const index = line.indexOf('=');
    if (index < 1) continue;
    const key = line.slice(0, index).trim();
    let value = line.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    values[key] = value;
  }
  return values;
}

const localEnv = parseEnv(await readFile(join(projectRoot, '.env.local'), 'utf8'));
const url = localEnv.NEXT_PUBLIC_SUPABASE_URL || localEnv.SUPABASE_URL;
const key = localEnv.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('.env.local 缺少 NEXT_PUBLIC_SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY');

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(source, output, {
  recursive: true,
  filter: (path) => {
    const normalized = path.replaceAll('\\', '/');
    return !normalized.endsWith('/.env.example')
      && !normalized.endsWith('/fnos_backup_key')
      && !normalized.endsWith('/fnos_backup_key.pub');
  },
});
await cp(join(projectRoot, 'supabase', 'schema.sql'), join(output, 'schema.sql'));
const env = [
  `SUPABASE_URL=${url}`,
  `SUPABASE_SERVICE_ROLE_KEY=${key}`,
  'BACKUP_TABLES=posts,site_settings,daily_entries',
  'BACKUP_INTERVAL_SECONDS=86400',
  'MEDIA_DOWNLOAD_CONCURRENCY=4',
  'MEDIA_FETCH_TIMEOUT_MS=60000',
  'RETENTION_DAYS=30',
  'SOURCE_ARCHIVE_URL=https://github.com/wjsHd/my-blog/archive/refs/heads/main.zip',
  ''
].join('\n');
await writeFile(join(output, '.env'), env, { encoding: 'utf8', mode: 0o600 });
console.log(`已生成部署包：${output}`);
console.log('敏感配置已写入被 Git 忽略的 .env，未输出任何密钥。');
