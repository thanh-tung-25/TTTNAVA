import {beforeAll,afterAll,it,expect} from 'vitest';
import {randomUUID} from 'node:crypto';
import fs from 'node:fs/promises';
import {query,withTransaction} from '../src/config/db.js';
import {createTestUser,loginStudent} from './helpers/index.js';

const prefix='pv_'+randomUUID().slice(0,6)+'_',password='PrivateStudent@123';
const users=[],rooms=[],feedback=[];
let boss,teacher,primary,secretAgent,visibleAgent,unknownAgent,rootUser,chineseUser,maker;
let secret,visible,unknown,origin,lesson,set,word,secretMessage,oldDirect,oldGroup,ownerOnly,publicGroup,unknownRoom,historicalTeacherRoom,baselineAttempts;
const pair=(a,b)=>[a,b].sort();
const absent=response=>{expect(response.status).toBe(404);};
function noPrivate(data){
 const text=JSON.stringify(data);
 for(const user of [secret,unknown])for(const value of [user.id,user.username,user.displayName])expect(text).not.toContain(value);
}
async function makeRoom(kind,owner,members){
 const id=randomUUID();rooms.push(id);
 await query('INSERT INTO chat_rooms(id,kind,title,owner_id,direct_key) VALUES (?,?,?,?,?)',[id,kind,'Privacy fixture',owner,kind==='direct'?pair(...members).join(':'):null]);
 for(const idUser of members)await query('INSERT INTO chat_members(room_id,student_id) VALUES (?,?)',[id,idUser]);
 return id;
}
beforeAll(async()=>{
 for(const options of [{role:'admin'},{role:'admin',adminScope:'chinese'},{role:'admin',adminScope:'primary'},{role:'admin'}])users.push(await createTestUser(options));
 [rootUser,chineseUser,,maker]=users;
 [boss,teacher,primary]=await Promise.all(users.slice(0,3).map(loginStudent));
 const created=await boss.post('/api/v1/admin/students').send({username:prefix+'secret',password,displayName:'PRIVATE_SUPER_'+prefix,grade:null,student_created_by:chineseUser.id,student_creator_scope:'chinese',student_management_scope:'chinese',createdBy:chineseUser.id,creatorScope:'chinese',managementScope:'chinese'});
 expect(created.status).toBe(201);secret={...created.body.data,password};users.push(secret);
 visible=await createTestUser({username:prefix+'visible',displayName:'VISIBLE_CHINESE_'+prefix,grade:null,enrolled:false});users.push(visible);
 unknown=await createTestUser({username:prefix+'old',displayName:'PRIVATE_UNKNOWN_'+prefix,grade:3,enrolled:false});users.push(unknown);
 await query("UPDATE profiles SET student_created_by=?,student_creator_scope='chinese' WHERE id=?",[chineseUser.id,visible.id]);
 for(const u of [secret,visible,unknown])await query("INSERT INTO course_enrollments(student_id,course_id,source) VALUES (?,'hsk-1','admin')",[u.id]);
 await query("INSERT INTO course_enrollments(student_id,course_id,source) VALUES (?,'grade-3','admin')",[unknown.id]);
 [secretAgent,visibleAgent,unknownAgent]=await Promise.all([secret,visible,unknown].map(loginStudent));
 lesson=randomUUID();set=randomUUID();word=randomUUID();
 await query("INSERT INTO chinese_lessons(id,level_id,title,status) VALUES (?,1,'Privacy lesson','published')",[lesson]);
 await query("INSERT INTO chinese_sets(id,lesson_id,title,status,processing_status) VALUES (?,?,'Privacy set','published','ready')",[set,lesson]);
 await query("INSERT INTO chinese_items(id,set_id,kind,data) VALUES (?,?,'vocabulary',?)",[word,set,JSON.stringify({hanzi:'你好',meaning:'Chào'})]);
 baselineAttempts=Number((await teacher.get('/api/v1/chinese/stats')).body.data.totals.attempts);
 for(const u of [secret,visible,unknown]){
  await query("INSERT INTO chinese_progress(student_id,set_id,read_items) VALUES (?,?,'[]')",[u.id,set]);
  await query("INSERT INTO chinese_reviews(student_id,item_id,memory,review_count) VALUES (?,?,'remembered',1)",[u.id,word]);
  await query('INSERT INTO chinese_attempts(id,student_id,set_id,snapshot,answers,finished_at,score) VALUES (?,?,?,?,?,CURRENT_TIMESTAMP(3),100)',[randomUUID(),u.id,set,JSON.stringify({items:[{id:word,set_id:set,kind:'vocabulary',data:{hanzi:'你好'}}]}),'{}']);
 }
 for(const u of [secret,visible]){
  const id=randomUUID();feedback.push(id);
  await query("INSERT INTO learning_feedback(id,reporter_id,scope,category,message,page_url) VALUES (?,?,'chinese','question','Privacy feedback','/pages/student/chinese/')",[id,u.id]);
 }
 for(const [a,b,requester,status]of [[chineseUser.id,secret.id,secret.id,'accepted'],[chineseUser.id,visible.id,visible.id,'accepted'],[chineseUser.id,unknown.id,unknown.id,'pending'],[visible.id,secret.id,secret.id,'accepted']]){
  await query('INSERT INTO chat_friendships(user_a,user_b,requester_id,status) VALUES (?,?,?,?)',[...pair(a,b),requester,status]);
 }
 await query('INSERT INTO chat_blocks(student_id,peer_id) VALUES (?,?)',[chineseUser.id,unknown.id]);
 oldDirect=await makeRoom('direct',secret.id,[chineseUser.id,secret.id]);
 oldGroup=await makeRoom('group',visible.id,[chineseUser.id,visible.id,secret.id]);
 secretMessage=randomUUID();
 await query('INSERT INTO chat_messages(id,room_id,sender_id,client_id,body) VALUES (?,?,?,?,?)',[secretMessage,oldGroup,secret.id,randomUUID(),'PRIVATE HISTORICAL MESSAGE']);
 await query('DELETE FROM chat_members WHERE room_id=? AND student_id=?',[oldGroup,secret.id]);
 ownerOnly=await makeRoom('group',secret.id,[chineseUser.id,visible.id]);
 publicGroup=await makeRoom('group',visible.id,[chineseUser.id,visible.id]);
 unknownRoom=await makeRoom('direct',unknown.id,[chineseUser.id,unknown.id]);
 historicalTeacherRoom=await makeRoom('group',visible.id,[visible.id]);
 await query('INSERT INTO chat_messages(id,room_id,sender_id,client_id,body) VALUES (?,?,?,?,?)',[randomUUID(),historicalTeacherRoom,chineseUser.id,randomUUID(),'Earlier teacher message']);
});
afterAll(async()=>{
 for(const id of rooms)await query('DELETE FROM chat_rooms WHERE id=?',[id]);
 for(const user of [...users].reverse())await query('DELETE FROM profiles WHERE id=?',[user.id]);
 if(word)await query('DELETE FROM chinese_items WHERE id=?',[word]);
 if(set)await query('DELETE FROM chinese_sets WHERE id=?',[set]);
 if(lesson)await query('DELETE FROM chinese_lessons WHERE id=?',[lesson]);
});

it('records actual creator provenance and management, ignores forged fields and retains super-only account changes',async()=>{
 const [row]=await query('SELECT student_created_by,student_creator_scope,student_management_scope FROM profiles WHERE id=?',[secret.id]);
 expect(row).toEqual({student_created_by:rootUser.id,student_creator_scope:'super',student_management_scope:'super'});
 const edit=await boss.patch('/api/v1/admin/students/'+secret.id).send({displayName:secret.displayName,student_creator_scope:'chinese',student_created_by:chineseUser.id,student_management_scope:'chinese'});
 expect(edit.status).toBe(200);
 expect((await query('SELECT student_created_by,student_creator_scope,student_management_scope FROM profiles WHERE id=?',[secret.id]))[0]).toEqual(row);
 for(const id of [secret.id,randomUUID()])expect((await teacher.patch('/api/v1/admin/students/'+id).send({displayName:'No grant'})).status).toBe(403);
});

it('lets Chinese admins create their own students with null or omitted grade without granting courses or payment access',async()=>{
 for(const includeGrade of [true,false]){
  const username='cnew_'+randomUUID().replaceAll('-','').slice(0,12);
  const result=await teacher.post('/api/v1/admin/students').send({username,password,displayName:'Chinese-created student',...(includeGrade?{grade:null}:{}),role:'admin',adminScope:'super',student_created_by:rootUser.id,student_creator_scope:'super',student_management_scope:'super',createdBy:rootUser.id,creatorScope:'super',managementScope:'super',courseId:'hsk-1',enrolled:true});
  expect(result.status).toBe(201);
  const student={...result.body.data,password};users.push(student);
  expect(student).toMatchObject({username,role:'student',grade:null});
  const [stored]=await query('SELECT role,grade,student_created_by,student_creator_scope,student_management_scope FROM profiles WHERE id=?',[student.id]);
  expect(stored).toEqual({role:'student',grade:null,student_created_by:chineseUser.id,student_creator_scope:'chinese',student_management_scope:'chinese'});
  const owned=await teacher.get('/api/v1/admin/students').query({q:username,program:'chinese'});
  expect(owned.status).toBe(200);expect(owned.body.pagination.total).toBe(1);expect(owned.body.data.map(u=>u.id)).toEqual([student.id]);
  expect((await boss.get('/api/v1/admin/students').query({q:username})).body.data.map(u=>u.id)).toEqual([student.id]);
  for(const table of ['course_enrollments','course_orders'])expect(await query(`SELECT * FROM ${table} WHERE student_id=?`,[student.id])).toEqual([]);
  expect(await query('SELECT * FROM diamond_ledger WHERE profile_id=?',[student.id])).toEqual([]);
  const studentAgent=await loginStudent(student);
  expect((await studentAgent.get('/api/v1/chinese/sets/'+set)).status).toBe(403);
  for(const route of ['/api/v1/admin/team','/api/v1/courses/admin/catalog'])expect((await studentAgent.get(route)).status).toBe(403);
  expect((await teacher.post('/api/v1/admin/students/'+student.id+'/password').send({newPassword:'OtherPassword123'})).status).toBe(403);
  expect((await teacher.post('/api/v1/admin/students/'+student.id+'/lock').send({locked:true})).status).toBe(403);
 }
 for(const grade of [1,9,'9',false,'']){
  const username='cbad_'+randomUUID().replaceAll('-','').slice(0,12);
  const result=await teacher.post('/api/v1/admin/students').send({username,password,displayName:'Rejected grade',grade});
  expect(result.status).toBe(400);expect(await query('SELECT id FROM profiles WHERE username=?',[username])).toEqual([]);
 }
});

it('hides super-created and unattributed HSK students from Chinese search, list and pagination without hiding them from super admins',async()=>{
 const list=await teacher.get('/api/v1/admin/students').query({q:prefix,program:'chinese',limit:1});
 expect(list.status).toBe(200);expect(list.body.pagination.total).toBe(1);expect(list.body.data.map(u=>u.id)).toEqual([visible.id]);noPrivate(list.body);
 for(const user of [secret,unknown]){
  const found=await teacher.get('/api/v1/admin/students').query({q:user.username,program:'chinese'});
  expect(found.status).toBe(200);expect(found.body.data).toEqual([]);expect(found.body.pagination.total).toBe(0);
 }
 const all=await boss.get('/api/v1/admin/students').query({q:prefix,program:'chinese',limit:100});
 expect(all.body.data.map(u=>u.id).sort()).toEqual([secret.id,visible.id,unknown.id].sort());
 const school=await primary.get('/api/v1/admin/students').query({q:unknown.username});
 expect(school.body.data.map(u=>u.id)).toContain(unknown.id);
 expect((await secretAgent.get('/api/v1/chinese/sets/'+set)).status).toBe(200);
});

it('filters private progress, reviews and attempt counts even when a hidden student UUID is supplied',async()=>{
 const stats=await teacher.get('/api/v1/chinese/stats').query({set_id:set});
 expect(stats.status).toBe(200);expect(stats.body.data.progress.map(p=>p.student_id)).toEqual([visible.id]);
 expect(Number(stats.body.data.totals.attempts)-baselineAttempts).toBe(1);noPrivate(stats.body);
 for(const id of [secret.id,unknown.id,randomUUID()]){
  const filtered=await teacher.get('/api/v1/chinese/stats').query({set_id:set,student_id:id});
  expect(filtered.status).toBe(200);expect(filtered.body.data.progress).toEqual([]);noPrivate(filtered.body);
 }
 const superStats=await boss.get('/api/v1/chinese/stats').query({set_id:set});
 expect(superStats.body.data.progress.map(p=>p.student_id).sort()).toEqual([secret.id,visible.id,unknown.id].sort());
});

it('keeps private student reports out of Chinese administration and hides direct feedback IDs',async()=>{
 const managed=await teacher.get('/api/v1/feedback?manage=true');expect(managed.status).toBe(200);noPrivate(managed.body);
 expect(managed.body.data.some(f=>f.id===feedback[1])).toBe(true);expect(managed.body.data.some(f=>f.id===feedback[0])).toBe(false);
 for(const id of [feedback[0],randomUUID()])absent(await teacher.put('/api/v1/feedback/'+id).send({status:'resolved',reply:'No access'}));
 expect((await teacher.put('/api/v1/feedback/'+feedback[1]).send({status:'resolved',reply:'Visible cohort'})).status).toBe(200);
 expect((await boss.get('/api/v1/feedback?manage=true')).body.data.some(f=>f.id===feedback[0])).toBe(true);
});

it('removes private identities from chat discovery, friendships, blocks, pending requests and legacy rooms',async()=>{
 for(const route of ['/api/v1/chat/students?q='+secret.username,'/api/v1/chat/friends','/api/v1/chat/blocks','/api/v1/chat/rooms']){
  const result=await teacher.get(route);expect(result.status).toBe(200);noPrivate(result.body);
 }
 const listed=(await teacher.get('/api/v1/chat/rooms')).body.data;
 expect(listed.map(r=>r.id)).toContain(publicGroup);
 for(const id of [oldDirect,oldGroup,ownerOnly,unknownRoom])expect(listed.map(r=>r.id)).not.toContain(id);
 expect((await teacher.get('/api/v1/chat/students?q='+visible.username)).body.data.map(u=>u.id)).toContain(visible.id);
 expect((await secretAgent.get('/api/v1/chat/students?q='+chineseUser.username)).body.data).toEqual([]);
});

it('rejects known private UUIDs like missing records and prevents invitations from either direction',async()=>{
 for(const id of [secret.id,unknown.id,randomUUID()])absent(await teacher.put('/api/v1/chat/friends/'+id).send({action:'request'}));
 absent(await secretAgent.put('/api/v1/chat/friends/'+chineseUser.id).send({action:'request'}));
 absent(await teacher.post('/api/v1/chat/rooms').send({kind:'direct',members:[secret.id]}));
 for(const id of [oldDirect,oldGroup,ownerOnly,unknownRoom,randomUUID()]){
  absent(await teacher.get('/api/v1/chat/rooms/'+id+'/messages'));
  absent(await teacher.post('/api/v1/chat/rooms/'+id+'/messages').send({text:'Not allowed',client_id:randomUUID()}));
  absent(await teacher.put('/api/v1/chat/rooms/'+id+'/read'));
 }
 absent(await teacher.post('/api/v1/chat/messages/'+secretMessage+'/report').send({reason:'Not visible'}));
 absent(await teacher.delete('/api/v1/chat/messages/'+secretMessage));
 absent(await visibleAgent.put('/api/v1/chat/rooms/'+publicGroup+'/members').send({action:'add',student_id:secret.id}));
 absent(await visibleAgent.put('/api/v1/chat/rooms/'+historicalTeacherRoom+'/members').send({action:'add',student_id:secret.id}));
 expect((await teacher.get('/api/v1/chat/rooms/'+publicGroup+'/messages')).status).toBe(200);
 expect((await teacher.post('/api/v1/chat/rooms/'+publicGroup+'/messages').send({text:'Visible cohort works',client_id:randomUUID()})).status).toBe(200);
});

it('does not expose a private student after their creator changes scope or is deleted',async()=>{
 const makerAgent=await loginStudent(maker);
 const made=await makerAgent.post('/api/v1/admin/students').send({username:prefix+'origin',password,displayName:'IMMUTABLE_ORIGIN',grade:null});
 expect(made.status).toBe(201);origin={...made.body.data,password};users.push(origin);
 await query("INSERT INTO course_enrollments(student_id,course_id,source) VALUES (?,'hsk-1','admin')",[origin.id]);
 await query("UPDATE profiles SET admin_scope='chinese' WHERE id=?",[maker.id]);
 expect((await teacher.get('/api/v1/admin/students').query({q:origin.username})).body.data).toEqual([]);
 await query('DELETE FROM profiles WHERE id=?',[maker.id]);
 const [stored]=await query('SELECT student_created_by,student_creator_scope FROM profiles WHERE id=?',[origin.id]);
 expect(stored).toEqual({student_created_by:null,student_creator_scope:'super'});
 expect((await teacher.get('/api/v1/admin/students').query({q:origin.username})).body.data).toEqual([]);
 expect((await boss.get('/api/v1/admin/students').query({q:origin.username})).body.data.map(u=>u.id)).toContain(origin.id);
});

it('uses explicit Chinese management without changing creator history, credentials, enrollments or learning progress',async()=>{
 const username='managed_'+randomUUID().replaceAll('-','').slice(0,12);
 const made=await boss.post('/api/v1/admin/students').send({username,password,displayName:'Assigned Chinese learner',grade:3});
 expect(made.status).toBe(201);const student={...made.body.data,password};users.push(student);
 await query("INSERT INTO course_enrollments(student_id,course_id,source) VALUES (?,'grade-3','admin')",[student.id]);
 await query("INSERT INTO chinese_progress(student_id,set_id,read_items) VALUES (?,?,'[]')",[student.id,set]);
 const [before]=await query('SELECT grade,student_created_by,student_creator_scope,created_at FROM profiles WHERE id=?',[student.id]);
 const enrollments=await query('SELECT * FROM course_enrollments WHERE student_id=?',[student.id]);
 const history=await query('SELECT * FROM chinese_progress WHERE student_id=?',[student.id]);
 expect((await teacher.get('/api/v1/admin/students').query({q:username})).body.data).toEqual([]);
 await query("UPDATE profiles SET student_management_scope='chinese' WHERE id=?",[student.id]);
 const listed=await teacher.get('/api/v1/admin/students').query({q:username,program:'chinese'});
 expect(listed.status).toBe(200);expect(listed.body.data.map(u=>u.id)).toEqual([student.id]);expect(listed.body.pagination.total).toBe(1);
 expect((await teacher.get('/api/v1/chinese/stats').query({set_id:set,student_id:student.id})).body.data.progress.map(p=>p.student_id)).toEqual([student.id]);
 expect((await teacher.get('/api/v1/chat/students').query({q:username})).body.data.map(u=>u.id)).toContain(student.id);
 expect((await primary.get('/api/v1/admin/students').query({q:username})).body.data.map(u=>u.id)).toEqual([student.id]);
 expect((await query('SELECT grade,student_created_by,student_creator_scope,created_at FROM profiles WHERE id=?',[student.id]))[0]).toEqual(before);
 expect(await query('SELECT * FROM course_enrollments WHERE student_id=?',[student.id])).toEqual(enrollments);
 expect(await query('SELECT * FROM chinese_progress WHERE student_id=?',[student.id])).toEqual(history);
 expect(await query('SELECT * FROM course_orders WHERE student_id=?',[student.id])).toEqual([]);
 await loginStudent(student);
 await query("UPDATE profiles SET student_management_scope='super' WHERE id=?",[student.id]);
 expect((await teacher.get('/api/v1/admin/students').query({q:username})).body.data).toEqual([]);
 expect((await teacher.get('/api/v1/chinese/stats').query({set_id:set,student_id:student.id})).body.data.progress).toEqual([]);
 expect((await teacher.get('/api/v1/chat/students').query({q:username})).body.data).toEqual([]);
 expect((await boss.get('/api/v1/admin/students').query({q:username})).body.data.map(u=>u.id)).toEqual([student.id]);
 // Explicit management also takes priority over a legacy Chinese creator snapshot.
 const [legacy]=await query('SELECT student_management_scope,student_creator_scope,student_created_by FROM profiles WHERE id=?',[visible.id]);
 try{
  await query("UPDATE profiles SET student_management_scope='super' WHERE id=?",[visible.id]);
  expect((await teacher.get('/api/v1/admin/students').query({q:visible.username})).body.data).toEqual([]);
  expect((await teacher.get('/api/v1/chinese/stats').query({set_id:set,student_id:visible.id})).body.data.progress).toEqual([]);
  expect((await teacher.get('/api/v1/chat/students').query({q:visible.username})).body.data).toEqual([]);
  expect((await query('SELECT student_creator_scope,student_created_by FROM profiles WHERE id=?',[visible.id]))[0]).toEqual({student_creator_scope:legacy.student_creator_scope,student_created_by:legacy.student_created_by});
 }finally{await query('UPDATE profiles SET student_management_scope=? WHERE id=?',[legacy.student_management_scope,visible.id]);}
});

it('backfills legacy provenance only from the first verified student-creation audit snapshot',async()=>{
 const legacy=[];for(let i=0;i<3;i++){const u=await createTestUser({enrolled:false});legacy.push(u);users.push(u);}
 const source=await fs.readFile(new URL('../sql/migrations/028_student_privacy.sql',import.meta.url),'utf8');
 const backfill=source.slice(source.indexOf('UPDATE profiles p'));
 const rollback=Error('ROLLBACK_PRIVACY_BACKFILL_TEST');
 try{
  await withTransaction(async connection=>{
   const run=async(sql,params=[])=>(await connection.query(sql,params))[0];
   const audit=async(id,scope,action='POST /api/v1/admin/students')=>run('INSERT INTO admin_audit_log(actor_id,actor_username,action,resource_type,resource_id,details_json) VALUES (?,?,?,?,?,?)',[chineseUser.id,chineseUser.username,action,'/api/v1/admin',id,JSON.stringify(scope?{scope}:{})]);
   await audit(legacy[0].id,'chinese','PATCH /api/v1/admin/students/:id');
   await audit(legacy[0].id,'super');await audit(legacy[0].id,'chinese');
   await audit(legacy[1].id,null);await audit(legacy[1].id,'chinese');
   await run(backfill);
   const rows=await run('SELECT id,student_created_by,student_creator_scope FROM profiles WHERE id IN (?,?,?)',legacy.map(u=>u.id));
   expect(rows.find(r=>r.id===legacy[0].id)).toMatchObject({student_created_by:chineseUser.id,student_creator_scope:'super'});
   for(const u of legacy.slice(1))expect(rows.find(r=>r.id===u.id)).toMatchObject({student_created_by:null,student_creator_scope:null});
   throw rollback;
  });
 }catch(error){if(error!==rollback)throw error;}
});
