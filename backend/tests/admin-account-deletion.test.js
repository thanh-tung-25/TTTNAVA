import {beforeAll,afterAll,it,expect} from 'vitest';
import {createHash,randomUUID} from 'node:crypto';
import request from 'supertest';
import {query} from '../src/config/db.js';
import {app,createTestUser,loginStudent,loginAs} from './helpers/index.js';

const password='SafeAdminDeletion@123!',reason='Dọn tài khoản quản trị thử nghiệm';
const users=[],questions=[],worksheets=[];
let boss,otherBoss,rootUser,otherRoot,scopedAgents=[],studentAgent;
const path=id=>'/api/v1/admin/team/'+id;
const confirmationBody=(user,changes={})=>({username:user.username,password,reason,acknowledged:true,...changes});
async function user(options={}){
 const account=await createTestUser({password,enrolled:false,...options});users.push(account);return account;
}
async function subAdmin(scope='chinese'){return user({role:'admin',adminScope:scope});}
async function confirm(target,agent=boss,changes={}){
 const response=await agent.post(path(target.id)+'/deletion-confirmation').send(confirmationBody(target,changes));
 expect(response.status).toBe(200);return response.body.data;
}
async function finishDelay(id){
 await query('UPDATE account_deletion_confirmations SET not_before=? WHERE profile_id=? AND consumed_at IS NULL',[new Date(Date.now()-2000),id]);
}

beforeAll(async()=>{
 rootUser=await user({role:'admin'});otherRoot=await user({role:'admin'});
 [boss,otherBoss]=await Promise.all([rootUser,otherRoot].map(loginStudent));
 for(const adminScope of ['chinese','primary','secondary'])scopedAgents.push(await loginStudent(await subAdmin(adminScope)));
 studentAgent=await loginStudent(await user());
});
afterAll(async()=>{
 for(const id of questions)await query('DELETE FROM questions WHERE id=?',[id]);
 for(const id of worksheets)await query('DELETE FROM worksheets WHERE id=?',[id]);
 for(const account of [...users].reverse())await query('DELETE FROM profiles WHERE id=?',[account.id]);
});

it('allows only the super admin to view deletion details, issue or use confirmations and open the admin trash',async()=>{
 const target=await subAdmin();
 for(const agent of [...scopedAgents,studentAgent]){
  expect((await agent.get('/api/v1/admin/team?status=deleted')).status).toBe(403);
  expect((await agent.get(path(target.id)+'/deletion-preview')).status).toBe(403);
  expect((await agent.post(path(target.id)+'/deletion-confirmation').send(confirmationBody(target))).status).toBe(403);
  expect((await agent.delete(path(target.id)).send({confirmationToken:'x'.repeat(43)})).status).toBe(403);
  expect((await agent.post(path(target.id)+'/restore')).status).toBe(403);
 }
 expect((await request(app).get(path(target.id)+'/deletion-preview')).status).toBe(401);
 expect((await query('SELECT deleted_at FROM profiles WHERE id=?',[target.id]))[0].deleted_at).toBeNull();
});

it('protects the acting account and every super admin even when several super admins exist',async()=>{
 for(const target of [rootUser,otherRoot]){
  const preview=await boss.get(path(target.id)+'/deletion-preview');
  expect(preview.status).toBe(409);expect(preview.body.error.code).toBe('PROTECTED_ADMIN_ACCOUNT');
  expect((await boss.post(path(target.id)+'/deletion-confirmation').send(confirmationBody(target))).status).toBe(409);
  expect((await boss.delete(path(target.id)).send({confirmationToken:'x'.repeat(43)})).status).toBe(409);
  expect((await boss.post(path(target.id)+'/restore')).status).toBe(409);
 }
 expect(await query('SELECT id FROM account_deletion_confirmations WHERE profile_id IN (?,?)',[rootUser.id,otherRoot.id])).toEqual([]);
});

it('requires an exact username, a meaningful reason, acknowledgement and the current super-admin password',async()=>{
 const target=await subAdmin('primary');
 const changes=[{username:target.username.toUpperCase()},{reason:'a'},{acknowledged:false},{password:'NotTheAdminPassword123!'}];
 for(const patch of changes){
  const response=await boss.post(path(target.id)+'/deletion-confirmation').send(confirmationBody(target,patch));
  expect(response.status).toBe(patch.password?403:400);
  if(patch.password)expect(response.body.error.code).toBe('ADMIN_REAUTH_FAILED');
 }
 expect(await query('SELECT id FROM account_deletion_confirmations WHERE profile_id=?',[target.id])).toEqual([]);
 const confirmation=await confirm(target);
 expect(confirmation.confirmationToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
 expect(Date.parse(confirmation.notBefore)).toBeGreaterThan(Date.now()+3000);
 expect(Date.parse(confirmation.expiresAt)-Date.parse(confirmation.notBefore)).toBe(295000);
 const [stored]=await query('SELECT * FROM account_deletion_confirmations WHERE profile_id=?',[target.id]);
 expect(stored.token_hash).toBe(createHash('sha256').update(confirmation.confirmationToken).digest('hex'));
 expect(JSON.stringify(stored)).not.toContain(confirmation.confirmationToken);
 expect(JSON.stringify(stored)).not.toContain(password);
 const early=await boss.delete(path(target.id)).send({confirmationToken:confirmation.confirmationToken});
 expect(early.status).toBe(409);expect(early.body.error.code).toBe('DELETION_TOO_EARLY');
 expect((await boss.delete(path(target.id)).send({})).status).toBe(400);
 expect((await boss.delete(path(target.id)).send({confirmationToken:'x'.repeat(43)})).status).toBe(400);
 expect((await query('SELECT deleted_at FROM profiles WHERE id=?',[target.id]))[0].deleted_at).toBeNull();
});

it('archives a scoped admin while preserving content ownership, students created and their program access',async()=>{
 const target=await subAdmin(),child=await user({creatorScope:'chinese',grade:null});
 await query('UPDATE profiles SET student_created_by=? WHERE id=?',[target.id,child.id]);
 await query("INSERT INTO course_enrollments(student_id,course_id,source,granted_by) VALUES (?,'hsk-1','admin',?)",[child.id,target.id]);
 const [topic]=await query('SELECT id FROM topics WHERE grade=3 ORDER BY id LIMIT 1');
 const question=randomUUID(),worksheet=randomUUID();questions.push(question);worksheets.push(worksheet);
 await query("INSERT INTO questions(id,topic_id,type,prompt,status,created_by,updated_by) VALUES (?,?,'true_false','Retained administrator content','draft',?,?)",[question,topic.id,target.id,target.id]);
 await query("INSERT INTO worksheets(id,title,grade,subject_id,items,created_by) VALUES (?,'Retained worksheet',3,'toan','[]',?)",[worksheet,target.id]);
 const childBefore=(await query('SELECT * FROM profiles WHERE id=?',[child.id]))[0];
 const enrollmentBefore=await query('SELECT * FROM course_enrollments WHERE student_id=?',[child.id]);
 const questionBefore=(await query('SELECT * FROM questions WHERE id=?',[question]))[0];
 const worksheetBefore=(await query('SELECT * FROM worksheets WHERE id=?',[worksheet]))[0];
 const preview=await boss.get(path(target.id)+'/deletion-preview');
 expect(preview.status).toBe(200);expect(preview.body.data.account).toMatchObject({id:target.id,username:target.username,adminScope:'chinese'});
 expect(preview.body.data.summary).toEqual({studentsCreated:1,questionsCreated:1,worksheetsCreated:1});
 expect(preview.body.data.reversible).toBe(true);expect(JSON.stringify(preview.body)).not.toContain('password_hash');
 const confirmation=await confirm(target);await finishDelay(target.id);
 const deleted=await boss.delete(path(target.id)).send({confirmationToken:confirmation.confirmationToken});
 expect(deleted.status).toBe(200);expect(deleted.body.data).toMatchObject({deleted:true,reversible:true});
 const [record]=await query('SELECT deleted_at,deleted_by,deletion_reason,admin_auth_version FROM profiles WHERE id=?',[target.id]);
 expect(record.deleted_at).not.toBeNull();expect(record.deleted_by).toBe(rootUser.id);expect(record.deletion_reason).toBe(reason);expect(Number(record.admin_auth_version)).toBe(1);
 expect((await boss.get('/api/v1/admin/team')).body.data.some(p=>p.id===target.id)).toBe(false);
 const trash=await boss.get('/api/v1/admin/team?status=deleted');
 expect(trash.status).toBe(200);expect(trash.body.data.find(p=>p.id===target.id)).toMatchObject({deletionReason:reason});
 expect((await boss.patch(path(target.id)).send({adminScope:'primary'})).status).toBe(404);
 expect((await boss.post(path(target.id)+'/password').send({password:'AnotherAdminPassword123!'})).status).toBe(404);
 expect((await query('SELECT * FROM profiles WHERE id=?',[child.id]))[0]).toEqual(childBefore);
 expect(await query('SELECT * FROM course_enrollments WHERE student_id=?',[child.id])).toEqual(enrollmentBefore);
 expect((await query('SELECT * FROM questions WHERE id=?',[question]))[0]).toEqual(questionBefore);
 expect((await query('SELECT * FROM worksheets WHERE id=?',[worksheet]))[0]).toEqual(worksheetBefore);
 const audits=await query('SELECT action,details_json FROM admin_audit_log WHERE resource_id=?',[target.id]);
 expect(audits.map(a=>a.action)).toContain('account.delete');
 expect(JSON.stringify(audits)).not.toContain(password);expect(JSON.stringify(audits)).not.toContain(confirmation.confirmationToken);
});

it('revokes active admin sessions immediately and requires a new login after restoring from trash',async()=>{
 const target=await subAdmin('secondary');
 const logged=await loginAs(target.username,password),oldCookie=logged.response.headers['set-cookie'];
 expect(logged.response.status).toBe(200);
 const confirmation=await confirm(target);await finishDelay(target.id);
 expect((await boss.delete(path(target.id)).send({confirmationToken:confirmation.confirmationToken})).status).toBe(200);
 expect((await logged.agent.get('/api/v1/auth/me')).status).toBe(401);
 expect((await loginAs(target.username,password)).response.status).toBe(401);
 const restored=await boss.post(path(target.id)+'/restore');
 expect(restored.status).toBe(200);expect(restored.body.data.restored).toBe(true);
 expect((await request(app).get('/api/v1/auth/me').set('Cookie',oldCookie)).status).toBe(401);
 const fresh=await loginAs(target.username,password);expect(fresh.response.status).toBe(200);
 expect((await fresh.agent.get('/api/v1/auth/me')).status).toBe(200);
 expect((await boss.get('/api/v1/admin/team')).body.data.some(p=>p.id===target.id)).toBe(true);
 expect((await boss.get('/api/v1/admin/team?status=deleted')).body.data.some(p=>p.id===target.id)).toBe(false);
 const [record]=await query('SELECT deleted_at,deletion_reason,admin_auth_version FROM profiles WHERE id=?',[target.id]);
 expect(record.deleted_at).toBeNull();expect(record.deletion_reason).toBeNull();expect(Number(record.admin_auth_version)).toBe(2);
 expect((await boss.delete(path(target.id)).send({confirmationToken:confirmation.confirmationToken})).status).toBe(400);
});

it('binds confirmation tokens to both the issuing super admin and the intended account',async()=>{
 const target=await subAdmin(),other=await subAdmin('primary');
 const confirmation=await confirm(target);await finishDelay(target.id);
 expect((await otherBoss.delete(path(target.id)).send({confirmationToken:confirmation.confirmationToken})).status).toBe(400);
 expect((await boss.delete(path(other.id)).send({confirmationToken:confirmation.confirmationToken})).status).toBe(400);
 expect((await query('SELECT deleted_at FROM profiles WHERE id=?',[target.id]))[0].deleted_at).toBeNull();
 expect((await query('SELECT deleted_at FROM profiles WHERE id=?',[other.id]))[0].deleted_at).toBeNull();
});

it('rejects expired confirmations and tokens replaced by a newer reauthentication',async()=>{
 const target=await subAdmin();
 const expired=await confirm(target);
 await query('UPDATE account_deletion_confirmations SET not_before=?,expires_at=? WHERE profile_id=? AND consumed_at IS NULL',[new Date(Date.now()-600_000),new Date(Date.now()-1000),target.id]);
 expect((await boss.delete(path(target.id)).send({confirmationToken:expired.confirmationToken})).status).toBe(400);
 const replaced=await confirm(target),current=await confirm(target);await finishDelay(target.id);
 expect((await boss.delete(path(target.id)).send({confirmationToken:replaced.confirmationToken})).status).toBe(400);
 expect((await boss.delete(path(target.id)).send({confirmationToken:current.confirmationToken})).status).toBe(200);
});

it('invalidates pending confirmations when the issuing administrator authenticates with a newer access version',async()=>{
 const target=await subAdmin('primary'),confirmation=await confirm(target);await finishDelay(target.id);
 await query('UPDATE profiles SET admin_auth_version=admin_auth_version+1 WHERE id=?',[rootUser.id]);
 expect((await boss.delete(path(target.id)).send({confirmationToken:confirmation.confirmationToken})).status).toBe(401);
 boss=await loginStudent(rootUser);
 const result=await boss.delete(path(target.id)).send({confirmationToken:confirmation.confirmationToken});
 expect(result.status).toBe(400);expect(result.body.error.code).toBe('INVALID_DELETION_CONFIRMATION');
 expect((await query('SELECT deleted_at FROM profiles WHERE id=?',[target.id]))[0].deleted_at).toBeNull();
});

it('rechecks the current target scope at deletion time so promotion to super admin prevents removal',async()=>{
 const target=await subAdmin(),confirmation=await confirm(target);await finishDelay(target.id);
 await query("UPDATE profiles SET admin_scope='super',admin_auth_version=admin_auth_version+1 WHERE id=?",[target.id]);
 const result=await boss.delete(path(target.id)).send({confirmationToken:confirmation.confirmationToken});
 expect(result.status).toBe(409);expect(result.body.error.code).toBe('PROTECTED_ADMIN_ACCOUNT');
 expect((await query('SELECT deleted_at FROM profiles WHERE id=?',[target.id]))[0].deleted_at).toBeNull();
});
