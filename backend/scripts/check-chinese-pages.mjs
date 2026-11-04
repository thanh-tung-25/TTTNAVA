import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import express from 'express';
import dotenv from 'dotenv';
import { chromium } from '@playwright/test';
const root = fileURLToPath(new URL('../', import.meta.url));
dotenv.config({ path: path.join(root, '.env.supabase'), quiet: true });
process.env.DB_DRIVER = 'postgres';
process.env.PGPORT = '6543';
process.env.PG_READ_ONLY = 'true';
const { query, closePool } = await import('../src/config/db.js');
const { createApp } = await import('../src/app.js');
const { signToken } = await import('../src/utils/jwt.js');
const { default: env } = await import('../src/config/env.js');
const target = process.argv[2];
if (target && !/^https:\/\/[a-z0-9-]+\.vercel\.app\/?$/.test(target)) throw Error('Expected HTTPS Vercel origin');
let server, browser, phase = 'setup';
try {
  if (!target) {
    const app = express();
    app.use('/assets', express.static(path.join(root, '../public/assets')));
    for (const role of ['admin', 'student']) app.use('/pages/' + role + '/chinese', (req, res, next) => {
      if (!/\.(js|css)$/.test(req.path)) return next();
      express.static(path.join(root, '../public/assets/page-local', role, 'chinese'))(req, res, next);
    });
    app.use(createApp());
    server = app.listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
  }
  const origin = target ? new URL(target).origin : 'http://127.0.0.1:' + server.address().port;
  const [student] = await query(`SELECT p.* FROM profiles p JOIN course_enrollments e ON e.student_id=p.id
    WHERE p.role='student' AND e.course_id='hsk-1' AND e.revoked_at IS NULL AND e.starts_at<=CURRENT_TIMESTAMP
      AND (e.expires_at IS NULL OR e.expires_at>CURRENT_TIMESTAMP) AND (p.banned_until IS NULL OR p.banned_until<=CURRENT_TIMESTAMP) LIMIT 1`);
  const [admin] = await query("SELECT * FROM profiles WHERE role='admin' LIMIT 1");
  assert.ok(student && admin);
  browser = await chromium.launch({ headless: true });
  const checked = [];
  for (const [role, profile] of [['student', student], ['admin', admin]]) {
    const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
    await context.addCookies([{ name: env.cookie.name, value: signToken(profile), url: origin }, { name: 'ttnava_course', value: 'hsk-1', url: origin }]);
    await context.addInitScript(() => localStorage.setItem('ttnava-course', 'hsk-1'));
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.name));
    const tabs = role === 'student' ? ['', '?view=notebook', '?view=history'] : ['', '?view=levels', '?view=tests', '?view=progress'];
    for (const tab of tabs) {
      phase = role + (tab || '-lessons');
      await page.goto(origin + '/pages/' + role + '/chinese/' + tab, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => document.querySelector('#notice')?.textContent === '' && document.querySelector('#content')?.childElementCount > 0, null, { timeout: 45000 });
      if (role === 'student' && !tab) assert.ok(await page.locator('.lesson-island').count());
      assert.deepEqual(errors, []);
      for (const filename of role === 'student' ? ['script.js', 'style.css', 'playful.css', 'history-view.js', 'learning-tools.js'] : ['script.js', 'advanced.js', 'style.css']) {
        const response = await context.request.get(origin + '/pages/' + role + '/chinese/' + filename);
        assert.equal(response.status(), 200);
        assert.match(response.headers()['content-type'], filename.endsWith('.js') ? /javascript/ : /text\/css/);
      }
      checked.push(phase);
    }
    const output = path.join(root, '../test-results/chinese-pages');
    await fs.mkdir(output, { recursive: true });
    await page.screenshot({ path: path.join(output, role + '.png'), fullPage: true });
    await context.close();
  }
  console.log(JSON.stringify({ ok: true, live: Boolean(target), checked, dataChanged: false }));
} catch (error) {
  console.error(JSON.stringify({ ok: false, phase, errorType: error.name })); process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
  await closePool();
}
