import {beforeAll,afterAll,describe,it,expect} from 'vitest';
import {createTestUser,loginStudent,app} from './helpers/index.js';
import request from 'supertest';
import {query} from '../src/config/db.js';
const base='/api/v1/courses';
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a3XkAAAAASUVORK5CYII=','base64');
let admin,student,user,adminUser,saved;
describe('Admin QR and independent purchases',()=>{
 beforeAll(async()=>{
  adminUser=await createTestUser({username:'test_qr_admin',role:'admin'});admin=await loginStudent(adminUser);
  user=await createTestUser({username:'test_qr_student',enrolled:false});student=await loginStudent(user);
  saved=await query("SELECT id,payment_instructions FROM courses WHERE id IN ('grade-1','hsk-1')");
  await query("UPDATE courses SET payment_instructions='TEST ONLY — manual transfer' WHERE id IN ('grade-1','hsk-1')");
  await query("INSERT INTO course_enrollments(student_id,course_id,source) VALUES (?,'grade-3','admin')",[user.id]);
 });
 afterAll(async()=>{
  await query("DELETE FROM course_payment_qr WHERE course_key IN ('default','grade-1')");
  for(const row of saved)await query('UPDATE courses SET payment_instructions=? WHERE id=?',[row.payment_instructions,row.id]);
  for(const p of [user,adminUser])if(p)await query('DELETE FROM profiles WHERE id=?',[p.id]);
 });
 it('only admins upload QR; reject fake files, missing images and oversized uploads',async()=>{
  expect((await request(app).get(base+'/payment-qr/grade-1')).status).toBe(401);
  expect((await student.post(base+'/admin/payment-qr/default').attach('qr',png,'qr.png')).status).toBe(403);
  expect((await admin.post(base+'/admin/payment-qr/default').attach('qr',Buffer.from('<svg>fake</svg>'),'qr.png')).status).toBe(415);
  expect((await admin.post(base+'/admin/payment-qr/default').attach('qr',Buffer.alloc(2*1024*1024+1),'large.png')).status).toBe(413);
  expect((await admin.post(base+'/admin/payment-qr/default')).status).toBe(400);
 });
 it('serves shared QR and allows a per-course override without unlocking content',async()=>{
  expect((await admin.post(base+'/admin/payment-qr/default').attach('qr',png,'qr.png')).status).toBe(200);
  let response=await student.get(base+'/payment-qr/grade-1');expect(response.status).toBe(200);expect(response.headers['content-type']).toContain('image/png');expect(response.body.equals(png)).toBe(true);expect(response.headers['cache-control']).toContain('no-store');
  const own=Buffer.concat([png,Buffer.from('override')]);
  expect((await admin.post(base+'/admin/payment-qr/grade-1').attach('qr',own,'qr.png')).status).toBe(200);
  response=await student.get(base+'/payment-qr/grade-1');expect(response.body.equals(own)).toBe(true);
  response=await student.get(base+'/payment-qr/grade-2');expect(response.body.equals(png)).toBe(true);
  const catalog=(await student.get(base)).body.data;expect(catalog.find(c=>c.id==='grade-1').has_payment_qr).toBe(1);expect(catalog.find(c=>c.id==='grade-1').unlocked).toBe(0);
  expect((await student.get(base+'/grade-1/access')).status).toBe(403);
  expect((await student.get(base+'/admin/payment-qr')).status).toBe(403);
 });
 it('deleting an override falls back to shared QR; unknown courses cannot receive QR',async()=>{
  expect((await admin.delete(base+'/admin/payment-qr/grade-1')).status).toBe(200);
  expect((await student.get(base+'/payment-qr/grade-1')).body.equals(png)).toBe(true);
  expect((await admin.post(base+'/admin/payment-qr/no-such-course').attach('qr',png,'qr.png')).status).toBe(404);
  expect((await admin.delete(base+'/admin/payment-qr/default')).status).toBe(200);
  expect((await student.get(base+'/payment-qr/grade-1')).status).toBe(404);
 });
 it('one learner can submit separate requests for other programs and keep all approved courses',async()=>{
  const before=(await admin.get(base+'/admin/pending-count')).body.data.total;
  const ids=[];
  for(const course_id of ['grade-1','hsk-1']){
   const result=await student.post(base+'/orders').send({course_id,payer_name:'Phụ huynh',payment_reference:'TEST-MULTI-'+course_id});expect(result.status).toBe(200);ids.push(result.body.data.id);
  }
  expect((await admin.get(base+'/admin/pending-count')).body.data.total).toBe(before+2);
  for(const course of ['grade-1','hsk-1'])expect((await student.get(base+'/'+course+'/access')).status).toBe(403);
  expect((await admin.post(base+'/admin/orders/'+ids[0]+'/review').send({decision:'approved',note:'Đã đối soát khóa thứ nhất'})).status).toBe(200);
  expect((await student.get(base+'/grade-1/access')).status).toBe(200);expect((await student.get(base+'/grade-3/access')).status).toBe(200);expect((await student.get(base+'/hsk-1/access')).status).toBe(403);
  expect((await admin.post(base+'/admin/orders/'+ids[1]+'/review').send({decision:'approved',note:'Đã đối soát khóa thứ hai'})).status).toBe(200);
  for(const course of ['grade-1','grade-3','hsk-1'])expect((await student.get(base+'/'+course+'/access')).status).toBe(200);
  expect((await admin.get(base+'/admin/pending-count')).body.data.total).toBe(before);
  const own=(await student.get(base+'/orders')).body.data;expect(own.filter(o=>o.status==='approved')).toHaveLength(2);
 });
});
