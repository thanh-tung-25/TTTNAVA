import { createClient } from '@supabase/supabase-js';
import { createHash } from 'node:crypto';
import env from '../config/env.js';
import { query, dialectSql } from '../config/db.js';
import { AppError } from '../utils/errors.js';

export const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
export const MAX_WORD_BYTES = 20 * 1024 * 1024;
export const sha256 = buffer => createHash('sha256').update(buffer).digest('hex');
let client;
export function storageClient(settings = env.storage) {
  if (!/^https:\/\/[a-z0-9]+\.supabase\.co\/?$/.test(settings.url) || !settings.key.startsWith('sb_secret_')) {
    throw new AppError(503, 'STORAGE_NOT_CONFIGURED', 'Chưa cấu hình Supabase Storage.');
  }
  if (!client) client = createClient(settings.url, settings.key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: (input, init = {}) => fetch(input, { ...init, signal: init.signal || AbortSignal.timeout(30000) }) },
  });
  return client.storage;
}
function storageError() { return new AppError(502, 'STORAGE_UNAVAILABLE', 'Kho tệp đang bận. Vui lòng thử lại.'); }
export async function downloadObject(objectKey, expectedBytes) {
  const { data, error } = await storageClient().from(env.storage.bucket).download(objectKey);
  if (error || !data || data.size > MAX_WORD_BYTES || (expectedBytes !== undefined && data.size !== expectedBytes)) throw storageError();
  return Buffer.from(await data.arrayBuffer());
}
export async function archiveFile(assetKey, buffer, mime, originalName, run = query) {
  if (!env.storage.enabled) return;
  const digest = sha256(buffer);
  const objectKey = 'archive/' + assetKey + '/' + digest;
  const storage = storageClient().from(env.storage.bucket);
  const { error } = await storage.upload(objectKey, buffer, { contentType: mime, upsert: false });
  // An immutable object may already exist after a retried DB transaction.
  if (error && String(error.statusCode) !== '409' && error.error !== 'Duplicate') throw storageError();
  const verified = await downloadObject(objectKey, buffer.length);
  if (sha256(verified) !== digest) throw storageError();
  await run(dialectSql(
    'INSERT INTO file_assets(asset_key,object_key,sha256,byte_size,mime_type,filename) VALUES (?,?,?,?,?,?) ON DUPLICATE KEY UPDATE object_key=VALUES(object_key),sha256=VALUES(sha256),byte_size=VALUES(byte_size),mime_type=VALUES(mime_type),filename=VALUES(filename)',
    'INSERT INTO file_assets(asset_key,object_key,sha256,byte_size,mime_type,filename) VALUES (?,?,?,?,?,?) ON CONFLICT(asset_key) DO UPDATE SET object_key=EXCLUDED.object_key,sha256=EXCLUDED.sha256,byte_size=EXCLUDED.byte_size,mime_type=EXCLUDED.mime_type,filename=EXCLUDED.filename',
  ), [assetKey, objectKey, digest, buffer.length, mime, originalName.slice(0, 255)]);
}
export async function readArchive(assetKey, fallback, run = query) {
  if (!env.storage.enabled) return fallback;
  const [asset] = await run('SELECT object_key,byte_size,sha256 FROM file_assets WHERE asset_key=?', [assetKey]);
  if (!asset) return fallback;
  const bytes = await downloadObject(asset.object_key, Number(asset.byte_size));
  if (sha256(bytes) !== asset.sha256) throw storageError();
  return bytes;
}
export async function sendArchive(response, assetKey, fallback, mime, filename) {
  response.set('Cache-Control', 'private, no-store');
  response.set('X-Content-Type-Options', 'nosniff');
  if (env.storage.enabled) {
    const [asset] = await query('SELECT object_key FROM file_assets WHERE asset_key=?', [assetKey]);
    if (asset) {
      const { data, error } = await storageClient().from(env.storage.bucket).createSignedUrl(asset.object_key, 60, filename ? { download: filename } : {});
      if (error || !data) throw storageError();
      response.redirect(302, data.signedUrl);
      return;
    }
  }
  response.type(mime);
  if (filename) response.attachment(filename);
  response.send(fallback);
}
