import {beforeAll,afterAll,it,expect} from 'vitest';
import {randomUUID} from 'node:crypto';
import {query} from '../src/config/db.js';
import {createTestUser,loginStudent} from './helpers/index.js';

const prefix='pub_'+randomUUID().slice(0,6)+'_',password='SharedRegistration@123';
const users=[],shared=[],privateStudents=[],rooms=[],reports=new Map();
let bossUser,chineseUser,boss,teacher,sharedAgent,privateAgent,lesson,set;

beforeAll(async()=>{
 bossUser=await createTestUser({role:'admin',password});users.push(bossUser);
 chineseUser=await createTestUser({role:'admin',adminScope:'chinese',password});users.push(chineseUser);
 [boss,teacher]=await Promise.all([bossUser,chineseUser].map(loginStudent));
 for(const grade of [3,9,null]){
  const student=await createTestUser({username:prefix+(grade??'hsk'),displayName:'Public learner '+prefix+(grade??'hsk'),grade,enrolled:false,password});
  users.push(student);shared.push(student);
  const gmail=student.username.replaceAll('_','')+'@gmail.com';
  // Verified public fixtures deliberately have super management: public sharing takes precedence.
  await query("UPDATE profiles SET email=?,gmail_identity=?,email_verified_at=CURRENT_TIMESTAMP(3),registration_source='self',student_management_scope='super' WHERE id=?",[gmail,gmail,student.id]);
  if(grade!==null)await query("INSERT INTO course_enrollments(student_id,course_id,source) VALUES (?,?,'admin')",[student.id,'grade-'+grade]);
 }
 for(const grade of [3,null]){
  const result=await boss.post('/api/v1/admin/students').send({username:prefix+'private'+(grade??'h'),displayName:'Private learner '+prefix+(grade??'h'),password,grade,
   registration_source:'self',registrationSource:'self',email_verified_at:new Date().toISOString(),gmail_identity:'forged@gmail.com'});
  expect(result.status).toBe(201);
  const student={...result.body.data,password};users.push(student);privateStudents.push(student);
  await query("INSERT INTO course_enrollments(student_id,course_id,source) VALUES (?,'hsk-1','admin')",[student.id]);
 }
 [sharedAgent,privateAgent]=await Promise.all([shared[0],privateStudents[0]].map(loginStudent));
 lesson=randomUUID();set=randomUUID();
 await query("INSERT INTO chinese_lessons(id,level_id,title,status) VALUES (?,1,'Shared registration lesson','published')",[lesson]);
 await query("INSERT INTO chinese_sets(id,lesson_id,title,status,processing_status) VALUES (?,?,'Shared registration set','published','ready')",[set,lesson]);
 for(const student of [...shared,...privateStudents]){
  await query("INSERT INTO chinese_progress(student_id,set_id,read_items) VALUES (?,?,'[]')",[student.id,set]);
  const id=randomUUID();reports.set(student.id,id);
  await query("INSERT INTO learning_feedback(id,reporter_id,scope,category,message,page_url) VALUES (?,?,'chinese','question','Shared registration feedback','/pages/student/chinese/')",[id,student.id]);
 }
});

afterAll(async()=>{
 for(const id of rooms)await query('DELETE FROM chat_rooms WHERE id=?',[id]);
 for(const user of [...users].reverse())await query('DELETE FROM profiles WHERE id=?',[user.id]);
 if(set)await query('DELETE FROM chinese_sets WHERE id=?',[set]);
 if(lesson)await query('DELETE FROM chinese_lessons WHERE id=?',[lesson]);
});

it('shares all public registrants with Chinese and super admins regardless of grade or enrollments',async()=>{
 const listed=await teacher.get('/api/v1/admin/students').query({q:prefix,program:'chinese',limit:100});
 expect(listed.status).toBe(200);
 expect(listed.body.pagination.total).toBe(shared.length);
 expect(listed.body.data.map(p=>p.id).sort()).toEqual(shared.map(p=>p.id).sort());
 expect(listed.body.data.every(p=>p.grade===null&&!('email' in p))).toBe(true);
 const paged=[];
 for(let page=1;page<=shared.length;page++){
  const result=await teacher.get('/api/v1/admin/students').query({q:prefix,limit:1,page});
  expect(result.body.pagination.total).toBe(shared.length);
  paged.push(...result.body.data.map(p=>p.id));
 }
 expect(paged.sort()).toEqual(shared.map(p=>p.id).sort());
 const all=await boss.get('/api/v1/admin/students').query({q:prefix,limit:100});
 expect(all.status).toBe(200);
 expect(all.body.data.map(p=>p.id).sort()).toEqual([...shared,...privateStudents].map(p=>p.id).sort());
 for(const student of privateStudents){
  const result=await teacher.get('/api/v1/admin/students').query({q:student.username});
  expect(result.body.data).toEqual([]);expect(result.body.pagination.total).toBe(0);
 }
});

it('does not let admin create or profile patch payloads forge public registration provenance',async()=>{
 for(const student of privateStudents){
  const [before]=await query('SELECT registration_source,email_verified_at,gmail_identity,student_created_by,student_creator_scope FROM profiles WHERE id=?',[student.id]);
  expect(before).toEqual({registration_source:'admin',email_verified_at:null,gmail_identity:null,student_created_by:bossUser.id,student_creator_scope:'super'});
  const edited=await boss.patch('/api/v1/admin/students/'+student.id).send({displayName:student.displayName,registration_source:'self',registrationSource:'self',email_verified_at:new Date().toISOString(),gmail_identity:'forged@gmail.com'});
  expect(edited.status).toBe(200);
  expect((await query('SELECT registration_source,email_verified_at,gmail_identity,student_created_by,student_creator_scope FROM profiles WHERE id=?',[student.id]))[0]).toEqual(before);
  expect((await teacher.get('/api/v1/admin/students').query({q:student.username})).body.data).toEqual([]);
 }
 const result=await boss.patch('/api/v1/admin/students/'+shared[0].id).send({displayName:shared[0].displayName,registration_source:'admin',registrationSource:'admin'});
 expect(result.status).toBe(200);
 expect((await query('SELECT registration_source FROM profiles WHERE id=?',[shared[0].id]))[0].registration_source).toBe('self');
 expect((await teacher.patch('/api/v1/admin/students/'+shared[0].id).send({displayName:'Unauthorized edit'})).status).toBe(403);
});

it('includes public learners in Chinese progress and feedback while private super-created learners stay hidden',async()=>{
 const stats=await teacher.get('/api/v1/chinese/stats').query({set_id:set});
 expect(stats.status).toBe(200);
 expect(stats.body.data.progress.map(p=>p.student_id).sort()).toEqual(shared.map(p=>p.id).sort());
 const feedback=await teacher.get('/api/v1/feedback?manage=true');
 expect(feedback.status).toBe(200);
 const ids=feedback.body.data.map(f=>f.id);
 for(const student of shared){
  expect(ids).toContain(reports.get(student.id));
  const updated=await teacher.put('/api/v1/feedback/'+reports.get(student.id)).send({status:'resolved',reply:'Visible public learner'});
  expect(updated.status).toBe(200);
 }
 for(const student of privateStudents){
  expect(ids).not.toContain(reports.get(student.id));
  const filtered=await teacher.get('/api/v1/chinese/stats').query({set_id:set,student_id:student.id});
  expect(filtered.body.data.progress).toEqual([]);
  expect((await teacher.put('/api/v1/feedback/'+reports.get(student.id)).send({status:'resolved',reply:'Must remain private'})).status).toBe(404);
 }
 const all=await boss.get('/api/v1/chinese/stats').query({set_id:set});
 expect(all.body.data.progress.map(p=>p.student_id).sort()).toEqual([...shared,...privateStudents].map(p=>p.id).sort());
});

it('allows public learners and Chinese admins to discover and chat with one another without exposing private accounts',async()=>{
 const found=await teacher.get('/api/v1/chat/students').query({q:prefix});
 expect(found.status).toBe(200);
 expect(found.body.data.map(p=>p.id).sort()).toEqual(shared.map(p=>p.id).sort());
 expect((await sharedAgent.get('/api/v1/chat/students').query({q:chineseUser.username})).body.data.map(p=>p.id)).toContain(chineseUser.id);
 expect((await privateAgent.get('/api/v1/chat/students').query({q:chineseUser.username})).body.data).toEqual([]);
 expect((await teacher.put('/api/v1/chat/friends/'+privateStudents[0].id).send({action:'request'})).status).toBe(404);
 expect((await privateAgent.put('/api/v1/chat/friends/'+chineseUser.id).send({action:'request'})).status).toBe(404);
 expect((await sharedAgent.put('/api/v1/chat/friends/'+chineseUser.id).send({action:'request'})).status).toBe(200);
 expect((await teacher.put('/api/v1/chat/friends/'+shared[0].id).send({action:'accept'})).status).toBe(200);
 const created=await teacher.post('/api/v1/chat/rooms').send({kind:'direct',members:[shared[0].id]});
 expect(created.status).toBe(200);const room=created.body.data.id;rooms.push(room);
 expect((await teacher.post('/api/v1/chat/rooms/'+room+'/messages').send({text:'Welcome public learner',client_id:randomUUID()})).status).toBe(200);
 const received=await sharedAgent.get('/api/v1/chat/rooms/'+room+'/messages');
 expect(received.status).toBe(200);expect(received.body.data.items.map(m=>m.body)).toContain('Welcome public learner');
 expect((await sharedAgent.post('/api/v1/chat/rooms/'+room+'/messages').send({text:'Public learner reply',client_id:randomUUID()})).status).toBe(200);
 expect((await teacher.get('/api/v1/chat/rooms')).body.data.map(r=>r.id)).toContain(room);
});

it('does not grant paid HSK content or administrator privileges merely because a public learner is shared',async()=>{
 expect((await sharedAgent.get('/api/v1/chinese/sets/'+set)).status).toBe(403);
 expect((await sharedAgent.get('/api/v1/admin/students')).status).toBe(403);
 expect((await sharedAgent.get('/api/v1/admin/team')).status).toBe(403);
 expect((await sharedAgent.get('/api/v1/courses/admin/catalog')).status).toBe(403);
 for(const student of shared){
  expect(await query('SELECT * FROM course_orders WHERE student_id=?',[student.id])).toEqual([]);
  expect(await query('SELECT * FROM course_enrollments WHERE student_id=? AND course_id=?',[student.id,'hsk-1'])).toEqual([]);
 }
});
