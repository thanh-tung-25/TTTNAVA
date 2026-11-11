import {beforeAll,afterAll,it,expect} from 'vitest';
import {readFile,readdir} from 'node:fs/promises';
import {createTestUser,loginStudent,app} from './helpers/index.js';
import request from 'supertest';
import {query} from '../src/config/db.js';
import {appHtml} from '../src/utils/app-html.js';
let admin,student;const users=[];
beforeAll(async()=>{for(const role of ['admin','student'])users.push(await createTestUser({role}));admin=await loginStudent(users[0]);student=await loginStudent(users[1]);});
afterAll(async()=>{for(const u of users)await query('DELETE FROM profiles WHERE id=?',[u.id]);});
function checkHead(html){
 expect(html).toMatch(/<meta name="apple-mobile-web-app-title" content="TTNAVA">/);
 expect(html).toContain('rel="manifest" href="/manifest.webmanifest"');expect(html).toContain('rel="apple-touch-icon" sizes="180x180" href="/assets/icons/apple-touch-icon.png"');
 expect(html.match(/data-ttnava-app="true"/g)).toHaveLength(1);
}
it('serves short app names and icons on public and protected pages while preserving access control',async()=>{
 for(const path of ['/','/pages/login/','/pages/register/','/pages/demo/']){const r=await request(app).get(path);expect(r.status).toBe(200);checkHead(r.text);}
 const missing=await request(app).get('/missing-page');expect(missing.status).toBe(404);checkHead(missing.text);
 const teacher=await admin.get('/pages/admin/chinese/');expect(teacher.status).toBe(200);checkHead(teacher.text);expect(teacher.headers['cache-control']).toContain('no-store');expect(teacher.text).toContain('<title>Quản lý Tiếng Trung');
 const learner=await student.get('/pages/student/courses/');expect(learner.status).toBe(200);checkHead(learner.text);expect(learner.headers['cache-control']).toContain('no-store');
 expect((await request(app).get('/pages/admin/chinese/')).status).toBe(302);expect((await student.get('/pages/admin/chinese/')).status).toBe(302);
});
it('provides a public manifest whose declared launcher images exist at their real PNG sizes',async()=>{
 const response=await request(app).get('/manifest.webmanifest');expect(response.status).toBe(200);expect(response.headers['content-type']).toContain('application/manifest+json');
 const manifest=JSON.parse(response.text);expect(manifest).toMatchObject({name:'TTNAVA',short_name:'TTNAVA',start_url:'/',scope:'/',display:'standalone'});
 for(const icon of manifest.icons){const r=await request(app).get(icon.src);expect(r.status).toBe(200);expect(r.headers['content-type']).toContain('image/png');expect(r.body.subarray(1,4).toString()).toBe('PNG');expect(icon.sizes).toBe(r.body.readUInt32BE(16)+'x'+r.body.readUInt32BE(20));}
 const apple=await request(app).get('/apple-touch-icon.png');expect(apple.status).toBe(200);expect(apple.body.readUInt32BE(16)).toBe(180);expect(apple.body.readUInt32BE(20)).toBe(180);
 const favicon=await request(app).get('/favicon.ico');expect(favicon.status).toBe(200);expect(favicon.body.readUInt16LE(2)).toBe(1);
});
it('adds the branding consistently to every HTML entry without duplicating tags or changing page titles',async()=>{
 const root=new URL('../../frontend/pages/',import.meta.url);let checked=0;
 async function walk(directory){for(const file of await readdir(directory,{withFileTypes:true})){const location=new URL(file.name+(file.isDirectory()?'/':''),directory);if(file.isDirectory())await walk(location);else if(file.name.endsWith('.html')){const html=await readFile(location,'utf8'),branded=appHtml(html);checkHead(branded);expect(appHtml(branded)).toBe(branded);expect(branded.match(/<title>[\s\S]*?<\/title>/i)?.[0]).toBe(html.match(/<title>[\s\S]*?<\/title>/i)?.[0]);checked++;}}}
 await walk(root);expect(checked).toBeGreaterThan(20);
});
