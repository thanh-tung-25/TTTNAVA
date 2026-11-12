import {beforeAll,afterAll,it,expect} from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import env from '../src/config/env.js';
import {query} from '../src/config/db.js';
import {reviewOrder} from '../src/services/course-service.js';
import {createTestUser,loginStudent,app} from './helpers/index.js';

const base='/api/v1/courses',users=[],orders={},agents={};
let learner,saved,chineseUser,primaryUser;
beforeAll(async()=>{
 for(const scope of ['super','chinese','primary','secondary']){
  const user=await createTestUser({role:'admin',adminScope:scope});users.push(user);agents[scope]=await loginStudent(user);
  if(scope==='chinese')chineseUser=user;
  if(scope==='primary')primaryUser=user;
 }
 // A school learner can also request Chinese; course kind determines review scope.
 learner=await createTestUser({grade:2,enrolled:false});users.push(learner);agents.student=await loginStudent(learner);
 saved=await query("SELECT * FROM courses WHERE id IN ('hsk-1','hsk-2','hsk-3','grade-1','grade-6')");
 await query("UPDATE courses SET price_vnd=1000000,duration_days=30,payment_instructions='Test transfer only',active=1 WHERE id IN ('hsk-1','hsk-2','hsk-3','grade-1','grade-6')");
 await query("INSERT INTO course_enrollments(student_id,course_id,source) VALUES (?,'grade-2','admin')",[learner.id]);
 for(const course_id of ['hsk-1','hsk-2','hsk-3','grade-1','grade-6']){
  const response=await agents.student.post(base+'/orders').send({course_id,payer_name:'Phụ huynh kiểm thử',payment_reference:'TEST-'+course_id,note:'Kiểm thử quyền xét duyệt'});
  expect(response.status).toBe(200);orders[course_id]=response.body.data.id;
 }
});
afterAll(async()=>{
 for(const user of [...users].reverse())await query('DELETE FROM profiles WHERE id=?',[user.id]);
 for(const course of saved||[])await query('UPDATE courses SET price_vnd=?,duration_days=?,payment_instructions=?,active=? WHERE id=?',[course.price_vnd,course.duration_days,course.payment_instructions,course.active,course.id]);
});
const review=(agent,course,decision='approved',note='Đã kiểm tra giao dịch')=>agent.post(base+'/admin/orders/'+orders[course]+'/review').send({decision,note});

it('lets Chinese admins open the review page while other specialists and students remain blocked',async()=>{
 expect((await agents.chinese.get('/pages/admin/courses/')).status).toBe(200);
 for(const scope of ['primary','secondary']){
  expect((await agents[scope].get('/pages/admin/courses/')).headers.location).toBe('/pages/admin/questions/');
  for(const path of ['orders','enrollments','audit','pending-count'])expect((await agents[scope].get(base+'/admin/'+path)).status).toBe(403);
  expect((await review(agents[scope],'hsk-1')).status).toBe(403);
 }
 expect((await agents.student.get(base+'/admin/orders')).status).toBe(403);
 expect((await review(agents.student,'hsk-1')).status).toBe(403);
});

it('lists and counts only Chinese orders, regardless of query parameters or the learner’s grade',async()=>{
 const response=await agents.chinese.get(base+'/admin/orders?program=primary');expect(response.status).toBe(200);
 expect(response.body.data.every(order=>order.course_id.startsWith('hsk-'))).toBe(true);
 expect(response.body.data.filter(order=>order.student_id===learner.id).map(order=>order.id).sort()).toEqual(['hsk-1','hsk-2','hsk-3'].map(id=>orders[id]).sort());
 const [count]=await query("SELECT COUNT(*) total FROM course_orders o JOIN courses c ON c.id=o.course_id WHERE o.status='pending' AND c.kind='chinese'");
 expect((await agents.chinese.get(base+'/admin/pending-count')).body.data.total).toBe(Number(count.total));
 const all=(await agents.super.get(base+'/admin/orders')).body.data;
 expect(all.filter(order=>order.student_id===learner.id)).toHaveLength(5);
 expect((await agents.student.get(base+'/hsk-1/access')).status).toBe(403);
});

it('approves one HSK request exactly once and opens only that course with a recorded reviewer',async()=>{
 const results=await Promise.all([review(agents.chinese,'hsk-1'),review(agents.super,'hsk-1')]);
 expect(results.map(r=>r.status).sort()).toEqual([200,409]);
 const [order]=await query('SELECT * FROM course_orders WHERE id=?',[orders['hsk-1']]);
 expect(order.status).toBe('approved');expect(order.reviewed_by).toBe(users[results[0].status===200?1:0].id);
 expect((await agents.student.get(base+'/hsk-1/access')).status).toBe(200);
 expect((await agents.student.get(base+'/grade-2/access')).status).toBe(200);
 expect((await agents.student.get(base+'/hsk-2/access')).status).toBe(403);
 const [enrollment]=await query("SELECT * FROM course_enrollments WHERE student_id=? AND course_id='hsk-1'",[learner.id]);
 expect(enrollment.granted_by).toBe(order.reviewed_by);
 expect(Math.round((new Date(enrollment.expires_at)-new Date(enrollment.starts_at))/86400000)).toBe(30);
 const audit=await query("SELECT * FROM course_access_audit WHERE student_id=? AND course_id='hsk-1' AND action='approved'",[learner.id]);
 expect(audit).toHaveLength(1);expect(audit[0].actor_id).toBe(order.reviewed_by);
});

it('rejects with a reason visible to the student and leaves that HSK course locked',async()=>{
 expect((await review(agents.chinese,'hsk-2','rejected','')).status).toBe(400);
 expect((await review(agents.chinese,'hsk-2','rejected','Chưa tìm thấy giao dịch tương ứng')).status).toBe(200);
 expect((await agents.student.get(base+'/hsk-2/access')).status).toBe(403);
 const own=(await agents.student.get(base+'/orders')).body.data.find(o=>o.id===orders['hsk-2']);
 expect(own).toMatchObject({status:'rejected',review_note:'Chưa tìm thấy giao dịch tương ứng',reviewed_by:chineseUser.id});
 expect((await review(agents.chinese,'hsk-2')).status).toBe(409);
});

it('blocks cross-program approval and rejection even with forged payloads or direct service calls',async()=>{
 for(const course of ['grade-1','grade-6']){
  for(const decision of ['approved','rejected']){
   const response=await agents.chinese.post(base+'/admin/orders/'+orders[course]+'/review').send({decision,note:'Test',course_id:'hsk-1',adminScope:'super'});
   expect(response.status).toBe(403);
  }
  await expect(reviewOrder(chineseUser.id,orders[course],{decision:'approved',note:'Test service'})).rejects.toMatchObject({code:'ADMIN_SCOPE_FORBIDDEN'});
  const [row]=await query('SELECT status,reviewed_by FROM course_orders WHERE id=?',[orders[course]]);expect(row).toMatchObject({status:'pending',reviewed_by:null});
  expect((await agents.student.get(base+'/'+course+'/access')).status).toBe(403);
 }
 expect(await query("SELECT * FROM course_access_audit WHERE student_id=? AND course_id IN ('grade-1','grade-6')",[learner.id])).toEqual([]);
});

it('keeps cancelled or inactive courses locked and prevents a second decision',async()=>{
 await query("UPDATE courses SET active=0 WHERE id='hsk-3'");
 expect((await review(agents.chinese,'hsk-3')).status).toBe(409);
 await query("UPDATE courses SET active=1 WHERE id='hsk-3'");
 expect((await agents.student.post(base+'/orders/'+orders['hsk-3']+'/cancel')).status).toBe(200);
 expect((await review(agents.chinese,'hsk-3')).status).toBe(409);
 expect((await agents.student.get(base+'/hsk-3/access')).status).toBe(403);
});

it('preserves super-admin review and filters enrollments and audit by course, including dual-program students',async()=>{
 expect((await review(agents.super,'grade-1')).status).toBe(200);
 expect((await review(agents.chinese,'grade-1')).status).toBe(403);
 for(const path of ['enrollments','audit']){
  const chinese=(await agents.chinese.get(base+'/admin/'+path)).body.data;
  expect(chinese.every(row=>row.course_id.startsWith('hsk-'))).toBe(true);
  expect(chinese.some(row=>row.student_id===learner.id&&row.course_id==='hsk-1')).toBe(true);
  expect((await agents.super.get(base+'/admin/'+path)).body.data.some(row=>row.student_id===learner.id&&row.course_id==='grade-1')).toBe(true);
 }
});

it('does not grant Chinese admins price, QR, manual grant or revoke permissions',async()=>{
 for(const path of ['catalog','payment-qr'])expect((await agents.chinese.get(base+'/admin/'+path)).status).toBe(403);
 expect((await agents.chinese.patch(base+'/admin/catalog/hsk-1').send({})).status).toBe(403);
 expect((await agents.chinese.post(base+'/admin/payment-instructions').send({instructions:'Edited'})).status).toBe(403);
 expect((await agents.chinese.post(base+'/admin/payment-qr/hsk-1')).status).toBe(403);
 expect((await agents.chinese.delete(base+'/admin/payment-qr/hsk-1')).status).toBe(403);
 for(const action of ['grant','revoke'])expect((await agents.chinese.post(base+'/admin/access').send({username:learner.username,course_id:'hsk-1',action,note:'Test'})).status).toBe(403);
 expect((await agents.student.get(base+'/hsk-1/access')).status).toBe(200);
});

it('uses the current database scope instead of forged JWT role and scope claims',async()=>{
 for(const user of [chineseUser,primaryUser,learner]){
  const token=jwt.sign({sub:user.id,role:'admin',adminScope:'super'},env.jwt.secret,{expiresIn:'5m'});
  const response=await request(app).post(base+'/admin/orders/'+orders['grade-6']+'/review').set('Authorization','Bearer '+token).send({decision:'approved',note:'Forged scope'});
  expect(response.status).toBe(403);
 }
});
