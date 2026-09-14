import { createHash } from 'node:crypto';
import { access, copyFile, mkdir, open, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';

const root = process.env.BACKUP_ROOT || '/backup';
const supabaseUrl = required('SUPABASE_URL').replace(/\/$/, '');
const serviceKey = required('SUPABASE_SERVICE_ROLE_KEY');
const tables = (process.env.BACKUP_TABLES || 'posts,site_settings,daily_entries')
  .split(',').map((value) => value.trim()).filter(Boolean);
const retentionDays = positiveInt(process.env.RETENTION_DAYS, 30);
const sourceArchiveUrl = process.env.SOURCE_ARCHIVE_URL || '';
const mediaTimeoutMs = positiveInt(process.env.MEDIA_FETCH_TIMEOUT_MS, 15000);
const now = new Date();
const day = localDay(now);
const runId = `${day}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
const runTmp = join(root, 'database', `.tmp-${runId}`);
const runFinal = join(root, 'database', day);
const logPath = join(root, 'logs', `${day}.log`);
const mediaDir = join(root, 'media', 'originals');
const mediaManifestPath = join(root, 'media', 'manifest.json');

async function log(message) {
  const line = `${new Date().toISOString()} ${message}`;
  console.log(line);
  await mkdir(join(root, 'logs'), { recursive: true });
  const handle = await open(logPath, 'a');
  try { await handle.write(`${line}\n`); } finally { await handle.close(); }
}

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`缺少环境变量 ${name}`);
  return value;
}

function positiveInt(value, fallback) {
  const parsed = Number.parseInt(value || '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function localDay(date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: process.env.TZ || 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(date);
  const find = (type) => parts.find((part) => part.type === type)?.value;
  return `${find('year')}-${find('month')}-${find('day')}`;
}

async function fetchJsonTable(table) {
  const pageSize = 1000;
  const rows = [];
  for (let offset = 0; ; offset += pageSize) {
    const url = new URL(`${supabaseUrl}/rest/v1/${encodeURIComponent(table)}`);
    url.searchParams.set('select', '*');
    url.searchParams.set('limit', String(pageSize));
    url.searchParams.set('offset', String(offset));
    const response = await fetch(url, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, Accept: 'application/json' }
    });
    if (!response.ok) throw new Error(`${table} 导出失败：HTTP ${response.status} ${await response.text()}`);
    const page = await response.json();
    rows.push(...page);
    if (page.length < pageSize) break;
  }
  return rows;
}

async function fetchAuthUsers() {
  const users = [];
  for (let page = 1; ; page++) {
    const url = new URL(`${supabaseUrl}/auth/v1/admin/users`);
    url.searchParams.set('page', String(page));
    url.searchParams.set('per_page', '1000');
    const response = await fetch(url, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, Accept: 'application/json' }
    });
    if (!response.ok) throw new Error(`Auth 用户导出失败：HTTP ${response.status} ${await response.text()}`);
    const payload = await response.json();
    const batch = Array.isArray(payload) ? payload : (payload.users || []);
    users.push(...batch);
    if (batch.length < 1000) break;
  }
  return users;
}

function collectMediaUrls(dataByTable) {
  const urls = new Set();
  for (const post of dataByTable.posts || []) {
    if (typeof post.cover_image === 'string') urls.add(post.cover_image);
    if (typeof post.content !== 'string') continue;
    for (const match of post.content.matchAll(/(?:src|poster)=["'](https?:\/\/[^"']+)["']/gi)) urls.add(match[1].replaceAll('&amp;', '&'));
  }
  return [...urls].filter((url) => /^https?:\/\//i.test(url));
}

function extensionFor(url, contentType = '') {
  const fromPath = extname(new URL(url).pathname).toLowerCase();
  if (/^\.[a-z0-9]{1,5}$/.test(fromPath)) return fromPath;
  const map = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif', 'video/mp4': '.mp4', 'video/webm': '.webm' };
  return map[contentType.split(';')[0].toLowerCase()] || '.bin';
}

async function loadMediaManifest() {
  try { return JSON.parse(await readFile(mediaManifestPath, 'utf8')); } catch { return { version: 1, items: {} }; }
}

async function downloadMedia(urls) {
  await mkdir(mediaDir, { recursive: true });
  const manifest = await loadMediaManifest();
  let downloaded = 0;
  let skipped = 0;
  const failures = [];
  const downloadOne = async (url) => {
    const id = createHash('sha256').update(url).digest('hex');
    const known = manifest.items[id];
    if (known) {
      try { await access(join(mediaDir, known.file)); skipped++; return; } catch { /* redownload */ }
    }
    try {
      const response = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(mediaTimeoutMs) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const extension = extensionFor(url, response.headers.get('content-type') || '');
      const file = `${id}${extension}`;
      const bytes = new Uint8Array(await response.arrayBuffer());
      await writeFile(join(mediaDir, file), bytes);
      manifest.items[id] = { url, file, bytes: bytes.byteLength, savedAt: new Date().toISOString() };
      downloaded++;
    } catch (error) {
      failures.push({ url, error: String(error?.message || error) });
    }
  };
  const concurrency = positiveInt(process.env.MEDIA_DOWNLOAD_CONCURRENCY, 8);
  for (let index = 0; index < urls.length; index += concurrency) {
    await Promise.all(urls.slice(index, index + concurrency).map(downloadOne));
  }
  manifest.updatedAt = new Date().toISOString();
  await writeJson(mediaManifestPath, manifest);
  return { discovered: urls.length, downloaded, skipped, failures };
}

async function downloadSourceArchive() {
  if (!sourceArchiveUrl) return null;
  const sourceDir = join(root, 'source', 'daily');
  await mkdir(sourceDir, { recursive: true });
  const output = join(sourceDir, `${day}-main.zip`);
  const response = await fetch(sourceArchiveUrl, { redirect: 'follow', signal: AbortSignal.timeout(60000) });
  if (!response.ok) throw new Error(`源码归档下载失败：HTTP ${response.status}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  await writeFile(output, bytes);
  return { file: output.replace(`${root}/`, ''), bytes: bytes.byteLength };
}

async function writeJson(path, value) {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function removeExpired(parent, pattern) {
  let names = [];
  try { names = await readdir(parent); } catch { return; }
  const cutoff = Date.now() - retentionDays * 86400000;
  for (const name of names) {
    const match = name.match(pattern);
    if (!match) continue;
    const timestamp = Date.parse(`${match[1]}T00:00:00+08:00`);
    if (Number.isFinite(timestamp) && timestamp < cutoff) await rm(join(parent, name), { recursive: true, force: true });
  }
}

async function main() {
  await mkdir(runTmp, { recursive: true });
  await log(`开始备份：${runId}`);
  const dataByTable = {};
  for (const table of tables) {
    const rows = await fetchJsonTable(table);
    dataByTable[table] = rows;
    await writeJson(join(runTmp, `${table}.json`), rows);
    await log(`已导出 ${table}：${rows.length} 条`);
  }
  const authUsers = await fetchAuthUsers();
  await writeJson(join(runTmp, 'auth_users.json'), authUsers);
  await log(`已导出 auth.users：${authUsers.length} 条`);
  try { await copyFile(process.env.SCHEMA_PATH || '/app/schema.sql', join(runTmp, 'schema.sql')); } catch { await log('未找到 schema.sql，已跳过'); }
  const media = await downloadMedia(collectMediaUrls(dataByTable));
  await log(`媒体：发现 ${media.discovered}，新下载 ${media.downloaded}，复用 ${media.skipped}，失败 ${media.failures.length}`);
  const source = await downloadSourceArchive();
  if (source) await log(`源码归档：${source.bytes} 字节`);
  const manifest = {
    version: 1, runId, createdAt: new Date().toISOString(),
    format: 'Supabase REST JSON + schema SQL',
    tables: { ...Object.fromEntries(Object.entries(dataByTable).map(([name, rows]) => [name, rows.length])), 'auth.users': authUsers.length },
    media, source
  };
  await writeJson(join(runTmp, 'manifest.json'), manifest);
  await rm(runFinal, { recursive: true, force: true });
  await rename(runTmp, runFinal);
  await writeJson(join(root, 'status.json'), { ok: true, lastSuccessAt: new Date().toISOString(), runId, manifest });
  await removeExpired(join(root, 'database'), /^(\d{4}-\d{2}-\d{2})$/);
  await removeExpired(join(root, 'source', 'daily'), /^(\d{4}-\d{2}-\d{2})-main\.zip$/);
  await removeExpired(join(root, 'logs'), /^(\d{4}-\d{2}-\d{2})\.log$/);
  await log('备份完成');
}

main().catch(async (error) => {
  const message = String(error?.stack || error);
  try {
    await writeJson(join(root, 'status.json'), { ok: false, lastFailureAt: new Date().toISOString(), runId, error: message });
    await log(`备份失败：${message}`);
    await rm(runTmp, { recursive: true, force: true });
  } catch { console.error(message); }
  process.exitCode = 1;
});
