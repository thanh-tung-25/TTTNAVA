import { beforeAll, afterAll, it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import env from '../src/config/env.js';
import { query } from '../src/config/db.js';
import { app, createTestUser, loginStudent, loginAs } from './helpers/index.js';

let boss, chinese, primary, studentAgent, rootUser, chineseUser, primaryUser;
let chineseStudent, primaryStudent, dual, temporaryAdmin, lessonId, worksheetId;
const created=[];
const password='AdminScopePassword123!';
beforeAll(async()=>{
 rootUser=await createTestUser({username:'scope_boss',role:'admin'});
 chineseUser=await createTestUser({username:'scope_chinese',role:'admin',adminScope:'chinese'});
 primaryUser=await createTestUser({username:'scope_primary',role:'admin',adminScope:'primary'});
 chineseStudent=await createTestUser({username:'scope_case_chinese',grade:null,enrolled:false,creatorScope:'chinese'});
 primaryStudent=await createTestUser({username:'scope_case_primary',grade:1,enrolled:false});
 dual=await createTestUser({username:'scope_case_dual',grade:2,enrolled:false,creatorScope:'chinese'});
 for(const [student,course] of [[chineseStudent,'hsk-1'],[primaryStudent,'grade-1'],[dual,'hsk-1'],[dual,'grade-2']])await query("INSERT INTO course_enrollments(student_id,course_id,source) VALUES (?,?,'admin')",[student.id,course]);
 boss=await loginStudent(rootUser);chinese=await loginStudent(chineseUser);primary=await loginStudent(primaryUser);studentAgent=await loginStudent(dual);
});
afterAll(async()=>{
 if(lessonId)await query('DELETE FROM chinese_lessons WHERE id=?',[lessonId]);
 if(worksheetId)await query('DELETE FROM worksheets WHERE id=?',[worksheetId]);
 for(const user of [rootUser,chineseUser,primaryUser,chineseStudent,primaryStudent,dual,...created])if(user){
  await query('DELETE FROM diamond_ledger WHERE profile_id=?',[user.id]);
  await query('DELETE FROM course_enrollments WHERE student_id=?',[user.id]);
  await query('DELETE FROM profiles WHERE id=?',[user.id]);
 }
});
it('enforces program boundaries across content, worksheets, statistics and direct URLs',async()=>{
 for(const route of ['/api/v1/chinese/catalog','/api/v1/chinese/stats']){
  expect((await chinese.get(route)).status).toBe(200);
  expect((await primary.get(route)).status).toBe(403);
 }
 for(const route of ['/api/v1/admin/curriculum/tree','/api/v1/admin/content/','/api/v1/admin/content/word-documents','/api/v1/worksheets/admin','/api/v1/worksheets/admin/reviews','/api/v1/admin/stats']){
  expect((await primary.get(route)).status).toBe(200);
  expect((await chinese.get(route).set('X-Admin-Scope','super')).status).toBe(403);
 }
 expect((await chinese.get('/pages/admin/questions/')).headers.location).toBe('/pages/admin/chinese/');
 expect((await primary.get('/pages/admin/chinese/')).headers.location).toBe('/pages/admin/questions/');
 expect((await chinese.get('/pages/admin/team/')).headers.location).toBe('/pages/admin/chinese/');
 const sheet={title:'Scope worksheet',grade:1,subject_id:'toan',status:'draft',items:[]};
 expect((await chinese.post('/api/v1/worksheets/admin').send(sheet)).status).toBe(403);
 const result=await primary.post('/api/v1/worksheets/admin').send(sheet);expect(result.status).toBe(200);worksheetId=result.body.data.id;
 expect((await chinese.put('/api/v1/worksheets/admin/'+worksheetId).send(sheet)).status).toBe(403);
});
it('uses the current database scope instead of role or scope claims in tokens',async()=>{
 const token=jwt.sign({sub:chineseUser.id,role:'admin',adminScope:'super'},env.jwt.secret,{expiresIn:'5m'});
 expect((await request(app).get('/api/v1/admin/curriculum/tree').set('Authorization','Bearer '+token)).status).toBe(403);
 const studentToken=jwt.sign({sub:dual.id,role:'admin',adminScope:'super'},env.jwt.secret,{expiresIn:'5m'});
 expect((await request(app).get('/api/v1/admin/team').set('Authorization','Bearer '+studentToken)).status).toBe(403);
});
it('keeps payment settings, manual access and global account management with the super admin',async()=>{
 for(const agent of [chinese,primary]){
  for(const route of ['/api/v1/courses/admin/catalog','/api/v1/courses/admin/payment-qr','/api/v1/admin/team','/api/v1/admin/team/audit'])expect((await agent.get(route)).status).toBe(403);
  expect((await agent.post('/api/v1/courses/admin/access').send({})).status).toBe(403);
  expect((await agent.patch('/api/v1/admin/students/'+dual.id).send({displayName:'Changed'})).status).toBe(403);
  expect((await agent.post('/api/v1/admin/students/'+dual.id+'/password').send({newPassword:'OtherPassword123'})).status).toBe(403);
  expect((await agent.post('/api/v1/admin/students/'+dual.id+'/lock').send({locked:true})).status).toBe(403);
 }
 for(const path of ['orders','enrollments','audit','pending-count']){
  expect((await chinese.get('/api/v1/courses/admin/'+path)).status).toBe(200);
  expect((await primary.get('/api/v1/courses/admin/'+path)).status).toBe(403);
 }
 expect((await primary.post('/api/v1/courses/admin/orders/'+randomUUID()+'/review').send({decision:'approved',note:'test'})).status).toBe(403);
 expect((await primary.post('/api/v1/admin/students').send({})).status).toBe(403);
 expect((await chinese.post('/api/v1/admin/students').send({})).status).toBe(400);
 expect((await boss.get('/api/v1/courses/admin/catalog')).status).toBe(200);
 expect((await studentAgent.get('/api/v1/admin/team')).status).toBe(403);
});
it('shows a dual-program student to both specialists without exposing another program',async()=>{
 const route='/api/v1/admin/students?q=scope_case_&limit=100';
 const c=await chinese.get(route),p=await primary.get(route),all=await boss.get(route);
 expect(c.status).toBe(200);expect(p.status).toBe(200);
 expect(c.body.data.map(user=>user.id).sort()).toEqual([chineseStudent.id,dual.id].sort());
 expect(p.body.data.map(user=>user.id).sort()).toEqual([primaryStudent.id,dual.id].sort());
 expect(all.body.data).toHaveLength(3);
 expect(c.body.data.every(user=>user.grade===null&&typeof user.email==='string')).toBe(true);
 expect(p.body.data.every(user=>!('email' in user)&&!('emailVerifiedAt' in user))).toBe(true);
 expect((await chinese.get(route+'&program=primary')).status).toBe(403);
 expect((await primary.get(route+'&program=chinese')).status).toBe(403);
});
it('creates scoped admins without exposing hashes and expires existing sessions after a scope change',async()=>{
 const body={username:'scope_new_admin',displayName:'Admin mới',password,adminScope:'primary'};
 expect((await chinese.post('/api/v1/admin/team').send(body)).status).toBe(403);
 const response=await boss.post('/api/v1/admin/team').send(body);expect(response.status).toBe(201);
 temporaryAdmin=response.body.data;created.push(temporaryAdmin);
 expect(temporaryAdmin.adminScope).toBe('primary');expect(temporaryAdmin.password_hash).toBeUndefined();
 const logged=await loginAs(body.username,password);expect(logged.response.status).toBe(200);
 expect((await logged.agent.get('/api/v1/admin/curriculum/tree')).status).toBe(200);
 expect((await boss.patch('/api/v1/admin/team/'+temporaryAdmin.id).send({adminScope:'chinese'})).status).toBe(200);
 expect((await logged.agent.get('/api/v1/chinese/catalog')).status).toBe(401);
 const fresh=await loginAs(body.username,password);expect(fresh.response.body.data.profile.adminScope).toBe('chinese');
 expect((await fresh.agent.get('/api/v1/chinese/catalog')).status).toBe(200);
 expect((await fresh.agent.get('/api/v1/admin/curriculum/tree')).status).toBe(403);
});
it('locks and resets an admin without leaving old sessions valid',async()=>{
 const old=await loginAs(temporaryAdmin.username,password);
 expect((await boss.patch('/api/v1/admin/team/'+temporaryAdmin.id).send({locked:true})).status).toBe(200);
 expect((await old.agent.get('/api/v1/auth/me')).status).toBe(401);
 expect((await loginAs(temporaryAdmin.username,password)).response.status).toBe(403);
 await boss.patch('/api/v1/admin/team/'+temporaryAdmin.id).send({locked:false});
 const before=await loginAs(temporaryAdmin.username,password);
 expect((await boss.post('/api/v1/admin/team/'+temporaryAdmin.id+'/password').send({password:'ReplacementPassword123!'})).status).toBe(200);
 expect((await before.agent.get('/api/v1/auth/me')).status).toBe(401);
 expect((await loginAs(temporaryAdmin.username,password)).response.status).toBe(401);
 expect((await loginAs(temporaryAdmin.username,'ReplacementPassword123!')).response.status).toBe(200);
});
it('protects the final active super admin',async()=>{
 const others=await query("SELECT id,banned_until FROM profiles WHERE role='admin' AND admin_scope='super' AND id<>?",[rootUser.id]);
 try{
  for(const user of others)await query("UPDATE profiles SET banned_until='2999-01-01 00:00:00' WHERE id=?",[user.id]);
  const result=await boss.patch('/api/v1/admin/team/'+rootUser.id).send({adminScope:'primary'});
  expect(result.status).toBe(409);expect(result.body.error.code).toBe('LAST_SUPER_ADMIN');
 }finally{for(const user of others)await query('UPDATE profiles SET banned_until=? WHERE id=?',[user.banned_until,user.id]);}
});
it('records specialist content and permission changes without passwords in the audit',async()=>{
 const response=await chinese.post('/api/v1/chinese/lessons').send({level_id:1,title:'PRIVATE_CONTENT_NOT_IN_AUDIT',position:1,status:'draft'});
 expect(response.status).toBe(200);lessonId=response.body.data.id;
 const audit=await boss.get('/api/v1/admin/team/audit');expect(audit.status).toBe(200);
 expect(audit.body.data.some(row=>row.actor_username===chineseUser.username&&row.resource_id===lessonId)).toBe(true);
 const text=JSON.stringify(audit.body);expect(text).not.toContain(password);expect(text).not.toContain('ReplacementPassword123!');expect(text).not.toContain('PRIVATE_CONTENT_NOT_IN_AUDIT');
});
