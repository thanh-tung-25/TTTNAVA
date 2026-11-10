import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import dotenv from 'dotenv';
import express from 'express';
import { chromium } from '@playwright/test';
const root = fileURLToPath(new URL('../', import.meta.url));
dotenv.config({ path: path.join(root, '.env.supabase'), quiet: true });
dotenv.config({ path: path.join(root, '.env.vercel'), quiet: true });
process.env.DB_DRIVER = 'postgres';
process.env.PGPORT = '6543';
process.env.PG_READ_ONLY = 'true';
process.env.VERCEL = '1';
// Pass an HTTPS Vercel URL to verify an existing deployment. Without a URL,
// check generated assets locally. Neither mode publishes the site.
const { query, closePool } = await import('../src/config/db.js');
const { createApp } = await import('../src/app.js');
const { signToken } = await import('../src/utils/jwt.js');
const { default: env } = await import('../src/config/env.js');
const target = process.argv[2];
if (target && !/^https:\/\/[a-z0-9-]+\.vercel\.app\/?$/.test(target)) throw Error('Expected a Vercel HTTPS origin');
let server;
if (!target) {
  const app = express();
  app.use('/assets', express.static(path.join(root, '../public/assets')));
  app.use(createApp());
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
}
const origin = target ? new URL(target).origin : 'http://127.0.0.1:' + server.address().port;
let browser, stage = 'browser';
try {
  browser = await chromium.launch({ headless: true });
  const output = path.join(root, target ? '../test-results/live-vercel' : '../test-results/vercel-pages');
  await fs.mkdir(output, { recursive: true });
  for (const role of ['student', 'admin']) {
    stage = role;
    const [profile] = await query("SELECT * FROM profiles WHERE role=? AND (role<>'admin' OR admin_scope='super') AND (banned_until IS NULL OR banned_until<=CURRENT_TIMESTAMP) LIMIT 1", [role]);
    assert.ok(profile);
    const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
    await context.addCookies([{ name: env.cookie.name, value: signToken(profile), url: origin }]);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.name));
    if (target) {
      for (const route of role === 'admin'
        ? ['/api/v1/auth/me', '/api/v1/courses/admin/catalog', '/api/v1/chinese/stats', '/api/v1/admin/content/word-documents']
        : ['/api/v1/auth/me', '/api/v1/courses']) {
        const response = await context.request.get(origin + route);
        assert.equal(response.status(), 200, route);
      }
      if (role === 'student') assert.equal((await context.request.get(origin + '/api/v1/courses/admin/catalog')).status(), 403);
      if (role === 'admin') {
        const [document] = await query('SELECT id,byte_size FROM word_import_documents LIMIT 1');
        const [asset] = await query('SELECT sha256 FROM file_assets WHERE asset_key=?', ['word_import_documents/' + document.id]);
        const response = await context.request.get(origin + '/api/v1/admin/content/word-documents/' + document.id + '/download');
        assert.equal(response.status(), 200);
        const bytes = await response.body();
        assert.equal(bytes.length, Number(document.byte_size));
        const { createHash } = await import('node:crypto');
        assert.equal(createHash('sha256').update(bytes).digest('hex'), asset.sha256);
      }
    }
    await page.goto(origin + '/pages/' + role + '/courses/', { waitUntil: 'domcontentloaded' });
    const selector = role === 'student' ? '#course-grid .course-tile' : '#admin-course-catalog .course-form';
    await page.locator(selector).first().waitFor({ timeout: 60000, state: 'attached' });
    const [catalogCount]=await query('SELECT COUNT(*) total FROM courses');
    assert.equal(await page.locator(selector).count(), Number(catalogCount.total));
    assert.deepEqual(errors, []);
    await page.screenshot({ path: path.join(output, role + '.png'), fullPage: true });
    await context.close();
  }
  if(target){
    stage='student-privacy';
    const [teacher]=await query("SELECT * FROM profiles WHERE role='admin' AND admin_scope='chinese' AND (banned_until IS NULL OR banned_until<=CURRENT_TIMESTAMP) LIMIT 1");
    const [hidden]=await query("SELECT id,username FROM profiles WHERE role='student' AND registration_source<>'self' AND COALESCE(student_management_scope,student_creator_scope,'')<>'chinese' LIMIT 1");
    if(teacher&&hidden){
      const context=await browser.newContext();
      await context.addCookies([{name:env.cookie.name,value:signToken(teacher),url:origin}]);
      const list=await context.request.get(origin+'/api/v1/admin/students?q='+encodeURIComponent(hidden.username));
      assert.equal(list.status(),200);const students=await list.json();assert.equal(students.pagination.total,0);assert.deepEqual(students.data,[]);
      const stats=await context.request.get(origin+'/api/v1/chinese/stats?student_id='+hidden.id);
      assert.equal(stats.status(),200);assert.deepEqual((await stats.json()).data.progress,[]);
      const chat=await context.request.get(origin+'/api/v1/chat/students?q='+encodeURIComponent(hidden.username));
      assert.equal(chat.status(),200);assert.deepEqual((await chat.json()).data,[]);
      await context.close();
    }
  }
  stage = 'anonymous';
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(origin + '/pages/admin/courses/');
  assert.ok(new URL(page.url()).pathname.startsWith('/pages/login/'));
  await context.close();
  console.log(JSON.stringify({ ok: true, origin, checked: ['student-courses', 'admin-courses', 'anonymous-redirect', ...(target ? ['live-api-permissions', 'signed-word-download','private-student-isolation'] : [])], liveDeployment: Boolean(target), publishedByCheck: false, dataChanged: false }));
} catch (error) {
  console.error(JSON.stringify({ ok: false, stage, errorType: error.name }));
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  if (server) {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
  await closePool();
}
