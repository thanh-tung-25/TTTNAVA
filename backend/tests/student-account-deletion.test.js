import {beforeAll,afterAll,afterEach,it,expect,vi} from 'vitest';
import request from 'supertest';
import {createHash,randomBytes,randomUUID} from 'node:crypto';
import {query} from '../src/config/db.js';
import * as audit from '../src/services/admin-audit.js';
import {app,createTestUser,loginAs,loginStudent} from './helpers/index.js';

const password='DeleteSafely@123!',reason='Tài khoản thử nghiệm cần chuyển vào thùng rác';
const users=[],roomIds=[];
let bossUser,otherBossUser,boss,otherBoss,outsiders;
const path=student=>'/api/v1/admin/students/'+student.id;
const digest=token=>createHash('sha256').update(token).digest('hex');
async function fixture(options={}){
 const user=await createTestUser({username:'del_'+randomUUID().replaceAll('-','').slice(0,12),enrolled:false,password,...options});
 users.push(user);return user;
}
function input(student,changes={}){return {username:student.username,reason,password,acknowledged:true,...changes};}
async function issue(student,actor=boss){
 const response=await actor.post(path(student)+'/deletion-confirmation').send(input(student));
 expect(response.status).toBe(200);return response.body.data;
}
async function mature(confirmation){
 await query('UPDATE account_deletion_confirmations SET not_before=? WHERE token_hash=?',[new Date(Date.now()-1000),digest(confirmation.confirmationToken)]);
 return confirmation;
}
async function remove(student,confirmation,actor=boss){
 return actor.delete(path(student)).send({confirmationToken:confirmation.confirmationToken});
}
async function archive(student,actor=boss){
 const confirmation=await mature(await issue(student,actor));
 const response=await remove(student,confirmation,actor);
 expect(response.status).toBe(200);return confirmation;
}
async function stableProfile(student){
 return (await query(`SELECT id,username,email,password_hash,grade,avatar_key,student_created_by,
  student_creator_scope,student_management_scope,registration_source,email_verified_at,gmail_identity FROM profiles WHERE id=?`,[student.id]))[0];
}

beforeAll(async()=>{
 bossUser=await fixture({role:'admin'});otherBossUser=await fixture({role:'admin'});
 boss=await loginStudent(bossUser);otherBoss=await loginStudent(otherBossUser);
 outsiders=[];
 for(const adminScope of ['chinese','primary','secondary']){
  const user=await fixture({role:'admin',adminScope});outsiders.push(await loginStudent(user));
 }
 outsiders.push(await loginStudent(await fixture()));
});
afterEach(()=>vi.restoreAllMocks());
afterAll(async()=>{
 for(const id of roomIds)await query('DELETE FROM chat_rooms WHERE id=?',[id]);
 for(const user of [...users].reverse()){
  await query('DELETE FROM diamond_ledger WHERE profile_id=?',[user.id]);
  await query('DELETE FROM practice_sessions WHERE student_id=?',[user.id]);
  await query('DELETE FROM admin_audit_log WHERE actor_id=? OR resource_id=?',[user.id,user.id]);
  await query('DELETE FROM profiles WHERE id=?',[user.id]);
 }
});

it('previews a student without deleting and reserves preview, confirmation, deletion, restore and trash to super admins',async()=>{
 const student=await fixture();
 const preview=await boss.get(path(student)+'/deletion-preview');
 expect(preview.status).toBe(200);expect(preview.headers['cache-control']).toContain('no-store');
 expect(preview.body.data).toMatchObject({student:{id:student.id,username:student.username},reversible:true,
  summary:{enrollments:0,orders:0,practiceSessions:0,examAttempts:0,challenges:0}});
 expect(preview.body.data.student.password_hash).toBeUndefined();
 expect((await query('SELECT deleted_at FROM profiles WHERE id=?',[student.id]))[0].deleted_at).toBeNull();
 expect(await query('SELECT id FROM account_deletion_confirmations WHERE profile_id=?',[student.id])).toEqual([]);
 for(const actor of outsiders){
  expect((await actor.get(path(student)+'/deletion-preview')).status).toBe(403);
  expect((await actor.post(path(student)+'/deletion-confirmation').send(input(student))).status).toBe(403);
  expect((await actor.delete(path(student)).send({confirmationToken:randomBytes(32).toString('base64url')})).status).toBe(403);
  expect((await actor.post(path(student)+'/restore')).status).toBe(403);
  expect((await actor.get('/api/v1/admin/students?status=deleted')).status).toBe(403);
 }
 for(const target of [bossUser,await fixture({role:'bot'}),{id:randomUUID()}]){
  const response=await boss.get(path(target)+'/deletion-preview');
  expect(response.status).toBe(404);expect(response.body.error.code).toBe('ACCOUNT_NOT_FOUND');
 }
});

it('requires the exact username, acknowledgement, reason and current super-admin password before issuing a confirmation',async()=>{
 const student=await fixture();
 expect((await boss.delete(path(student)).send({})).status).toBe(400);
 for(const [changes,status,code] of [
  [{username:student.username.toUpperCase()},400,'DELETE_USERNAME_MISMATCH'],
  [{reason:'abc'},400,'VALIDATION_ERROR'],
  [{acknowledged:false},400,'VALIDATION_ERROR'],
  [{password:'NotTheAdminPassword'},403,'ADMIN_REAUTH_FAILED'],
 ]){
  const response=await boss.post(path(student)+'/deletion-confirmation').send(input(student,changes));
  expect(response.status).toBe(status);expect(response.body.error.code).toBe(code);
 }
 expect(await query('SELECT id FROM account_deletion_confirmations WHERE profile_id=?',[student.id])).toEqual([]);
 expect((await query('SELECT deleted_at FROM profiles WHERE id=?',[student.id]))[0].deleted_at).toBeNull();
});

it('uses a hashed, expiring confirmation bound to its actor and student and enforces the server-side waiting period',async()=>{
 const student=await fixture(),otherStudent=await fixture(),confirmation=await issue(student);
 expect(confirmation.confirmationToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
 expect(new Date(confirmation.expiresAt)-new Date(confirmation.notBefore)).toBe(295_000);
 const [record]=await query('SELECT * FROM account_deletion_confirmations WHERE profile_id=?',[student.id]);
 expect(record.token_hash).toBe(digest(confirmation.confirmationToken));expect(record.token_hash).not.toBe(confirmation.confirmationToken);
 expect(record.actor_id).toBe(bossUser.id);expect(record.reason).toBe(reason);expect(record.consumed_at).toBeNull();
 const early=await remove(student,confirmation);
 expect(early.status).toBe(409);expect(early.body.error.code).toBe('DELETION_TOO_EARLY');
 expect(early.body.error.details.retryAfterSeconds).toBeGreaterThan(0);
 await mature(confirmation);
 for(const [target,actor] of [[otherStudent,boss],[student,otherBoss]]){
  const rejected=await remove(target,confirmation,actor);
  expect(rejected.status).toBe(400);expect(rejected.body.error.code).toBe('INVALID_DELETION_CONFIRMATION');
 }
 await query('UPDATE account_deletion_confirmations SET not_before=?,expires_at=? WHERE token_hash=?',
  [new Date(Date.now()-300_000),new Date(Date.now()-1000),digest(confirmation.confirmationToken)]);
 const expired=await remove(student,confirmation);
 expect(expired.status).toBe(400);expect(expired.body.error.code).toBe('INVALID_DELETION_CONFIRMATION');
 expect((await query('SELECT deleted_at FROM profiles WHERE id=?',[student.id]))[0].deleted_at).toBeNull();
 const logs=JSON.stringify(await query('SELECT details_json FROM admin_audit_log WHERE resource_id=?',[student.id]));
 expect(logs).not.toContain(password);expect(logs).not.toContain(confirmation.confirmationToken);
});

it('invalidates a confirmation when its super admin has changed authentication version',async()=>{
 const student=await fixture(),maker=await fixture({role:'admin'}),old=await loginStudent(maker);
 const confirmation=await mature(await issue(student,old));
 await query('UPDATE profiles SET admin_auth_version=admin_auth_version+1 WHERE id=?',[maker.id]);
 expect((await old.get('/api/v1/auth/me')).status).toBe(401);
 const fresh=await loginStudent(maker),response=await remove(student,confirmation,fresh);
 expect(response.status).toBe(400);expect(response.body.error.code).toBe('INVALID_DELETION_CONFIRMATION');
 expect((await query('SELECT deleted_at FROM profiles WHERE id=?',[student.id]))[0].deleted_at).toBeNull();
});

it('archives and restores the same profile with credentials, learning, payments and enrollments intact while revoking old sessions',async()=>{
 const student=await fixture();
 await query("UPDATE profiles SET student_created_by=?,student_creator_scope='super',student_management_scope='chinese' WHERE id=?",[bossUser.id,student.id]);
 await query("INSERT INTO course_enrollments(student_id,course_id,source,granted_by) VALUES (?,'grade-3','admin',?)",[student.id,bossUser.id]);
 await query("INSERT INTO course_orders(id,student_id,course_id,amount_vnd,payment_reference,payer_name,status) VALUES (?,?,'grade-3',12345,'deletion-test','Test payer','approved')",[randomUUID(),student.id]);
 const [topic]=await query('SELECT id FROM topics WHERE grade=3 ORDER BY id LIMIT 1'),practiceId=randomUUID();
 await query("INSERT INTO practice_sessions(id,student_id,topic_id,status,seed,finished_at) VALUES (?,?,?,'finished',?,CURRENT_TIMESTAMP(3))",[practiceId,student.id,topic.id,'a'.repeat(64)]);
 await query("INSERT INTO diamond_ledger(profile_id,amount,reason,ref_type,ref_id) VALUES (?,5,'practice_complete','practice',?)",[student.id,practiceId]);
 const original=await stableProfile(student),enrollments=await query('SELECT * FROM course_enrollments WHERE student_id=?',[student.id]);
 const orders=await query('SELECT * FROM course_orders WHERE student_id=?',[student.id]),history=await query('SELECT * FROM practice_sessions WHERE student_id=?',[student.id]);
 const ledger=await query('SELECT * FROM diamond_ledger WHERE profile_id=?',[student.id]);
 const logged=await loginAs(student.username,password),cookie=logged.response.headers['set-cookie'].map(value=>value.split(';')[0]).join('; ');
 expect(logged.response.status).toBe(200);
 const preview=await boss.get(path(student)+'/deletion-preview');expect(preview.body.data.summary).toMatchObject({enrollments:1,orders:1,practiceSessions:1});
 const confirmation=await archive(student);
 expect(await stableProfile(student)).toEqual(original);
 const [archived]=await query('SELECT deleted_at,deleted_by,deletion_reason,student_auth_version FROM profiles WHERE id=?',[student.id]);
 expect(archived.deleted_at).toBeTruthy();expect(archived.deleted_by).toBe(bossUser.id);expect(archived.deletion_reason).toBe(reason);expect(Number(archived.student_auth_version)).toBe(1);
 expect((await loginAs(student.username,password)).response.status).toBe(401);
 expect((await request(app).get('/api/v1/auth/me').set('Cookie',cookie)).status).toBe(401);
 const active=await boss.get('/api/v1/admin/students').query({q:student.username});expect(active.body.pagination.total).toBe(0);
 const trash=await boss.get('/api/v1/admin/students').query({q:student.username,status:'deleted'});
 expect(trash.status).toBe(200);expect(trash.body.data).toHaveLength(1);expect(trash.body.data[0]).toMatchObject({id:student.id,deletionReason:reason});expect(trash.body.data[0].deletedAt).toBeTruthy();
 expect((await boss.patch(path(student)).send({displayName:'No archived edits'})).status).toBe(404);
 expect((await boss.post(path(student)+'/password').send({newPassword:'ShouldNotChange123'})).status).toBe(404);
 expect((await boss.post(path(student)+'/lock').send({locked:true})).status).toBe(404);
 expect((await boss.post(path(student)+'/restore')).body.data.restored).toBe(true);
 expect(await stableProfile(student)).toEqual(original);
 expect(await query('SELECT * FROM course_enrollments WHERE student_id=?',[student.id])).toEqual(enrollments);
 expect(await query('SELECT * FROM course_orders WHERE student_id=?',[student.id])).toEqual(orders);
 expect(await query('SELECT * FROM practice_sessions WHERE student_id=?',[student.id])).toEqual(history);
 expect(await query('SELECT * FROM diamond_ledger WHERE profile_id=?',[student.id])).toEqual(ledger);
 const stale=await request(app).get('/api/v1/auth/me').set('Cookie',cookie);
 expect(stale.status).toBe(401);expect(stale.body.error.code).toBe('INVALID_TOKEN');
 expect((await loginAs(student.username,password)).response.status).toBe(200);
 expect((await boss.get('/api/v1/admin/students').query({q:student.username})).body.data.map(p=>p.id)).toEqual([student.id]);
 expect((await remove(student,confirmation)).body.error.code).toBe('INVALID_DELETION_CONFIRMATION');
 expect((await boss.post(path(student)+'/restore')).status).toBe(404);
 const logs=await query("SELECT action FROM admin_audit_log WHERE resource_id=? AND action IN ('account.delete','account.restore') ORDER BY id",[student.id]);
 expect(logs.map(row=>row.action)).toEqual(['account.delete','account.restore']);
});

it('consumes replacement and other-admin confirmations for the target and never revives them on restore',async()=>{
 const student=await fixture(),first=await mature(await issue(student)),second=await mature(await issue(student));
 const third=await mature(await issue(student,otherBoss));
 expect((await remove(student,first)).body.error.code).toBe('INVALID_DELETION_CONFIRMATION');
 expect((await remove(student,second)).status).toBe(200);
 const reused=await remove(student,second);expect(reused.status).toBe(404);expect(reused.body.error.code).toBe('ACCOUNT_NOT_FOUND');
 expect((await query('SELECT consumed_at FROM account_deletion_confirmations WHERE profile_id=?',[student.id])).every(row=>row.consumed_at)).toBe(true);
 expect((await boss.post(path(student)+'/restore')).status).toBe(200);
 const otherReplay=await remove(student,third,otherBoss);expect(otherReplay.status).toBe(400);expect(otherReplay.body.error.code).toBe('INVALID_DELETION_CONFIRMATION');
});

it('rolls back account and confirmation changes if writing the deletion audit fails',async()=>{
 const student=await fixture(),confirmation=await mature(await issue(student));
 vi.spyOn(audit,'writeAdminAudit').mockRejectedValueOnce(new Error('EXPECTED_AUDIT_FAILURE'));
 vi.spyOn(console,'error').mockImplementation(()=>{});
 const response=await remove(student,confirmation);expect(response.status).toBe(500);
 const [profile]=await query('SELECT deleted_at,student_auth_version FROM profiles WHERE id=?',[student.id]);
 expect(profile.deleted_at).toBeNull();expect(Number(profile.student_auth_version)).toBe(0);
 const [pending]=await query('SELECT consumed_at FROM account_deletion_confirmations WHERE token_hash=?',[digest(confirmation.confirmationToken)]);
 expect(pending.consumed_at).toBeNull();
 expect(await query("SELECT id FROM admin_audit_log WHERE resource_id=? AND action='account.delete'",[student.id])).toEqual([]);
});

it('removes archived accounts from discovery and new invitations while preserving existing group and direct history',async()=>{
 const student=await fixture(),peer=await fixture(),newMember=await fixture();
 for(const person of [student,peer,newMember])await query("UPDATE profiles SET registration_source='self' WHERE id=?",[person.id]);
 const peerAgent=await loginStudent(peer);
 for(const person of [student,newMember])await query("INSERT INTO chat_friendships(user_a,user_b,requester_id,status) VALUES (?,?,?,'accepted')",[...[peer.id,person.id].sort(),peer.id]);
 const group=randomUUID(),direct=randomUUID();roomIds.push(group,direct);
 for(const [id,kind,key] of [[group,'group',null],[direct,'direct',[peer.id,student.id].sort().join(':')]]){
  await query("INSERT INTO chat_rooms(id,kind,title,owner_id,direct_key) VALUES (?,?,'Deletion history',?,?)",[id,kind,peer.id,key]);
  for(const person of [student,peer])await query('INSERT INTO chat_members(room_id,student_id) VALUES (?,?)',[id,person.id]);
  await query('INSERT INTO chat_messages(id,room_id,sender_id,client_id,body) VALUES (?,?,?,?,?)',[randomUUID(),id,student.id,randomUUID(),'Preserved historical message']);
 }
 await archive(student);
 expect((await peerAgent.get('/api/v1/chat/students').query({q:student.username})).body.data).toEqual([]);
 expect((await peerAgent.get('/api/v1/chat/friends')).body.data.some(p=>p.id===student.id)).toBe(false);
 expect((await peerAgent.put('/api/v1/chat/friends/'+student.id).send({action:'request'})).status).toBe(404);
 expect((await peerAgent.post('/api/v1/chat/rooms').send({kind:'direct',members:[student.id]})).status).toBe(404);
 for(const id of [group,direct]){
  const messages=await peerAgent.get('/api/v1/chat/rooms/'+id+'/messages');
  expect(messages.status).toBe(200);expect(messages.body.data.items.map(m=>m.body)).toContain('Preserved historical message');
 }
 expect((await peerAgent.post('/api/v1/chat/rooms/'+group+'/messages').send({text:'Active group still works',client_id:randomUUID()})).status).toBe(200);
 expect((await peerAgent.post('/api/v1/chat/rooms/'+direct+'/messages').send({text:'Archived recipient',client_id:randomUUID()})).status).toBe(404);
 expect((await peerAgent.put('/api/v1/chat/rooms/'+group+'/members').send({action:'add',student_id:newMember.id})).status).toBe(200);
 const rooms=(await peerAgent.get('/api/v1/chat/rooms')).body.data;
 expect(rooms.find(r=>r.id===group).can_message).toBe(true);expect(rooms.find(r=>r.id===direct).can_message).toBe(false);
 expect((await boss.post(path(student)+'/restore')).status).toBe(200);
 expect((await peerAgent.get('/api/v1/chat/friends')).body.data.some(p=>p.id===student.id)).toBe(true);
});

it('rate limits repeated attempts to reauthenticate for deletion',async()=>{
 const student=await fixture();
 for(let i=0;i<5;i++)expect((await boss.post(path(student)+'/deletion-confirmation').send(input(student,{password:'WrongAdminPassword'}))).status).toBe(403);
 const limited=await boss.post(path(student)+'/deletion-confirmation').send(input(student));
 expect(limited.status).toBe(429);expect(limited.body.error.code).toBe('RATE_LIMITED');
 expect(await query('SELECT id FROM account_deletion_confirmations WHERE profile_id=?',[student.id])).toEqual([]);
});
