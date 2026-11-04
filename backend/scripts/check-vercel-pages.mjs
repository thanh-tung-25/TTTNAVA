import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import dotenv from 'dotenv';
import express from 'express';
import { chromium } from '@playwright/test';
const root = fileURLToPath(new URL('../', import.meta.url));
dotenv.config({ path: path.join(root, '.env.supabase'), quiet: true });
process.env.DB_DRIVER = 'postgres';
process.env.PGPORT = '6543';
process.env.PG_READ_ONLY = 'true';
process.env.VERCEL = '1';
// Local browser smoke check uses generated public assets and private Express
// HTML. It does not publish anything or pretend to verify a live Vercel deploy.
const { query, closePool } = await import('../src/config/db.js');
const { createApp } = await import('../src/app.js');
const { signToken } = await import('../src/utils/jwt.js');
const { default: env } = await import('../src/config/env.js');
const app = express();
app.use('/assets', express.static(path.join(root, '../public/assets')));
app.use(createApp());
const server = app.listen(0, '127.0.0.1');
await new Promise(resolve => server.once('listening', resolve));
const origin = 'http://127.0.0.1:' + server.address().port;
let browser, stage = 'browser';
try {
  browser = await chromium.launch({ headless: true });
  const output = path.join(root, '../test-results/vercel-pages');
  await fs.mkdir(output, { recursive: true });
  for (const role of ['student', 'admin']) {
    stage = role;
    const [profile] = await query('SELECT * FROM profiles WHERE role=? AND (banned_until IS NULL OR banned_until<=CURRENT_TIMESTAMP) LIMIT 1', [role]);
    assert.ok(profile);
    const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
    await context.addCookies([{ name: env.cookie.name, value: signToken(profile), url: origin }]);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.name));
    await page.goto(origin + '/pages/' + role + '/courses/', { waitUntil: 'domcontentloaded' });
    const selector = role === 'student' ? '#course-grid .course-tile' : '#admin-course-catalog .course-form';
    await page.locator(selector).first().waitFor({ timeout: 60000, state: 'attached' });
    assert.equal(await page.locator(selector).count(), 14);
    assert.deepEqual(errors, []);
    await page.screenshot({ path: path.join(output, role + '.png'), fullPage: true });
    await context.close();
  }
  stage = 'anonymous';
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(origin + '/pages/admin/courses/');
  assert.ok(new URL(page.url()).pathname.startsWith('/pages/login/'));
  await context.close();
  console.log(JSON.stringify({ ok: true, checked: ['student-courses', 'admin-courses', 'anonymous-redirect'], generatedAssets: true, published: false, dataChanged: false }));
} catch (error) {
  console.error(JSON.stringify({ ok: false, stage, errorType: error.name }));
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
  await closePool();
}
