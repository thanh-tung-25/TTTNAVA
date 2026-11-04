import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import express from 'express';
import dotenv from 'dotenv';
import { chromium } from '@playwright/test';
const root = fileURLToPath(new URL('../', import.meta.url));
dotenv.config({ path: path.join(root, '.env.supabase'), quiet: true });
process.env.DB_DRIVER = 'postgres';
process.env.PGPORT = '6543';
process.env.STORAGE_PROVIDER = 'supabase';
process.env.VERCEL = '1';
const { query, closePool } = await import('../src/config/db.js');
const { createApp } = await import('../src/app.js');
const { signToken } = await import('../src/utils/jwt.js');
const { storageClient, sha256 } = await import('../src/services/private-storage.js');
const { verifyUploadToken } = await import('../src/services/storage-upload.js');
const { default: env } = await import('../src/config/env.js');
const require = createRequire(import.meta.url);
const JSZip = createRequire(require.resolve('mammoth'))('jszip');
const original = await fs.readFile(path.join(root, '../frontend/assets/templates/mau-nhap-cau-hoi.docx'));
const zip = await JSZip.loadAsync(original);
zip.file('word/migration-test-padding.bin', Buffer.alloc(17 * 1024 * 1024));
const document = await zip.generateAsync({ type: 'nodebuffer', compression: 'STORE' });
const app = express();
app.get('/_migration-test.docx', (_req, res) => res.type('application/octet-stream').send(document));
const appPayloads = [];
app.use((req, _res, next) => {
  if (req.method === 'POST' && req.url.startsWith('/api/v1/admin/questions/import/')) appPayloads.push(Number(req.headers['content-length']));
  next();
});
app.use('/assets', express.static(path.join(root, '../public/assets')));
app.use(createApp());
const server = app.listen(0, '127.0.0.1');
await new Promise(resolve => server.once('listening', resolve));
const origin = 'http://127.0.0.1:' + server.address().port;
env.appOrigin = origin;
let browser, objectKey, stage = 'browser';
try {
  const [admin] = await query("SELECT * FROM profiles WHERE role='admin' AND (banned_until IS NULL OR banned_until<=CURRENT_TIMESTAMP) LIMIT 1");
  assert.ok(admin);
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  await context.addCookies([{ name: env.cookie.name, value: signToken(admin), url: origin }]);
  const page = await context.newPage();
  await page.goto(origin + '/pages/admin/courses/', { waitUntil: 'domcontentloaded' });
  stage = 'direct-upload';
  const ticketPromise = page.waitForResponse(response => new URL(response.url()).pathname === '/api/v1/storage/word-upload', { timeout: 120000 });
  const importPromise = page.evaluate(async () => {
    const { api } = await import('/assets/js/api.js');
    const blob = await fetch('/_migration-test.docx').then(response => response.blob());
    const file = new File([blob], 'migration-large.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    const body = new FormData(); body.append('file', file);
    const result = await api('/api/v1/admin/questions/import/docx', { method: 'POST', body });
    return { questions: result.data.questions.length, bytes: file.size };
  });
  const ticketResponse = await ticketPromise;
  assert.equal(ticketResponse.status(), 200);
  const ticket = (await ticketResponse.json()).data;
  objectKey = verifyUploadToken(ticket.fileToken, admin.id).objectKey;
  const result = await importPromise;
  assert.ok(result.questions > 0);
  assert.ok(result.bytes > 16 * 1024 * 1024);
  assert.equal(appPayloads.length, 1);
  assert.ok(appPayloads[0] < 10000);
  stage = 'private-download';
  const publicResponse = await fetch(env.storage.url + '/storage/v1/object/public/' + env.storage.bucket + '/' + objectKey);
  assert.notEqual(publicResponse.status, 200);
  await publicResponse.arrayBuffer();
  const { data, error } = await storageClient().from(env.storage.bucket).createSignedUrl(objectKey, 60);
  assert.equal(error, null);
  const signedResponse = await fetch(data.signedUrl);
  assert.equal(signedResponse.status, 200);
  assert.equal(sha256(Buffer.from(await signedResponse.arrayBuffer())), sha256(document));
  console.log(JSON.stringify({ ok: true, directBrowserUpload: true, bytes: result.bytes, applicationPayloadBytes: appPayloads[0], parsedQuestions: result.questions, publicReadBlocked: true, signedDownloadVerified: true, published: false }));
} catch (error) {
  console.error(JSON.stringify({ ok: false, stage, code: error.code || 'LIVE_STORAGE_CHECK_FAILED', errorType: error.name }));
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  if (objectKey) {
    const result = await storageClient().from(env.storage.bucket).remove([objectKey]);
    if (result.error) { console.error(JSON.stringify({ cleanupFailed: true })); process.exitCode = 1; }
  }
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
  await closePool();
}
