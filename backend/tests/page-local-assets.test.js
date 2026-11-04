import { beforeAll, it, expect } from 'vitest';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import request from 'supertest';
import { app, createTestUser, loginStudent } from './helpers/index.js';
let admin;
beforeAll(async () => { admin = await loginStudent(await createTestUser({ role: 'admin' })); });
it('serves Chinese page modules locally while keeping HTML behind authentication', async () => {
  for (const filename of ['script.js', 'advanced.js', 'style.css']) {
    const response = await admin.get('/pages/admin/chinese/' + filename);
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(filename.endsWith('.js') ? /javascript/ : /text\/css/);
  }
  expect((await request(app).get('/pages/admin/chinese/')).status).toBe(302);
  expect((await admin.get('/pages/admin/chinese/.env')).status).toBe(404);
});
it('builds and routes Chinese JS/CSS to CDN without publishing page HTML', () => {
  const root = fileURLToPath(new URL('../../', import.meta.url));
  execFileSync(process.execPath, ['backend/scripts/build-vercel.mjs'], { cwd: root });
  const config = JSON.parse(fs.readFileSync(new URL('../../vercel.json', import.meta.url)));
  const rule = config.routes.find(route => route.src?.includes('/chinese/'));
  const matcher = new RegExp('^' + rule.src + '$');
  for (const role of ['student', 'admin']) {
    for (const filename of ['script.js', 'style.css']) {
      const address = '/pages/' + role + '/chinese/' + filename;
      const destination = address.replace(matcher, rule.dest);
      expect(destination).toBe('/assets/page-local/' + role + '/chinese/' + filename);
      expect(fs.existsSync(root + 'public' + destination)).toBe(true);
    }
    expect(matcher.test('/pages/' + role + '/chinese/index.html')).toBe(false);
    expect(fs.existsSync(root + 'public/assets/page-local/' + role + '/chinese/index.html')).toBe(false);
  }
});
