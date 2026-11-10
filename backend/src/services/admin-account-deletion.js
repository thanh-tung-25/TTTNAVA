import bcrypt from 'bcryptjs';
import {createHash,randomBytes,randomUUID} from 'node:crypto';
import {z} from 'zod';
import {query,withTransaction} from '../config/db.js';
import {AppError} from '../utils/errors.js';
import {adminScopeOf} from '../utils/admin-permissions.js';
import {publicProfile} from '../utils/serializers.js';
import {writeAdminAudit} from './admin-audit.js';
import {disconnectUser,emitToUsers} from '../realtime/emit.js';

const confirmationSchema=z.object({
 username:z.string().min(3).max(20),reason:z.string().trim().min(5).max(500),
 password:z.string().min(1).max(72),acknowledged:z.literal(true),
}).strict();
const tokenSchema=z.object({confirmationToken:z.string().regex(/^[A-Za-z0-9_-]{43}$/)}).strict();
const invalidConfirmation=()=>new AppError(400,'INVALID_DELETION_CONFIRMATION','Xác nhận xóa không hợp lệ hoặc đã hết hạn. Hãy thực hiện lại từ bước đầu.');
const hashToken=token=>createHash('sha256').update(token).digest('hex');
const runner=connection=>async(sql,params=[])=>(await connection.query(sql,params))[0];
function requireActor(current,actor){
 if(!current||adminScopeOf(current)!=='super'||current.deleted_at
  ||current.banned_until&&new Date(current.banned_until)>new Date()
  ||Number(current.admin_auth_version||0)!==Number(actor.admin_auth_version||0)){
  throw new AppError(403,'ADMIN_SCOPE_FORBIDDEN','Chỉ admin tổng đang hoạt động được xóa và khôi phục tài khoản.');
 }
}
function requireTarget(target,actor,kind,deleted=false){
 const role=kind==='administrator'?'admin':'student';
 if(!target||target.role!==role)throw new AppError(404,'ACCOUNT_NOT_FOUND','Không tìm thấy tài khoản.');
 if(role==='admin'&&(target.id===actor.id||adminScopeOf(target)==='super')){
  throw new AppError(409,'PROTECTED_ADMIN_ACCOUNT','Không được xóa hoặc khôi phục tài khoản admin tổng qua chức năng này.');
 }
 if(Boolean(target.deleted_at)!==deleted)throw new AppError(404,'ACCOUNT_NOT_FOUND',deleted?'Tài khoản không có trong thùng rác.':'Không tìm thấy tài khoản đang hoạt động.');
}
async function lockAccounts(run,actor,id,kind,deleted=false){
 const rows=await run('SELECT * FROM profiles WHERE id IN (?,?) ORDER BY id FOR UPDATE',[actor.id,id]);
 const current=rows.find(p=>p.id===actor.id),target=rows.find(p=>p.id===id);
 requireActor(current,actor);requireTarget(target,actor,kind,deleted);
 return {current,target};
}
export async function getAccountDeletionPreview(actor,id,kind='student'){
 z.uuid().parse(id);
 const current=(await query('SELECT * FROM profiles WHERE id=?',[actor.id]))[0];requireActor(current,actor);
 const target=(await query('SELECT * FROM profiles WHERE id=?',[id]))[0];requireTarget(target,actor,kind);
 const sql=kind==='administrator'
  ?`SELECT (SELECT COUNT(*) FROM profiles WHERE student_created_by=?) studentsCreated,
    (SELECT COUNT(*) FROM questions WHERE created_by=?) questionsCreated,
    (SELECT COUNT(*) FROM worksheets WHERE created_by=?) worksheetsCreated`
  :`SELECT (SELECT COUNT(*) FROM course_enrollments WHERE student_id=?) enrollments,
    (SELECT COUNT(*) FROM course_orders WHERE student_id=?) orders,
    (SELECT COUNT(*) FROM practice_sessions WHERE student_id=?) practiceSessions,
    (SELECT COUNT(*) FROM exam_attempts WHERE student_id=?) examAttempts,
    (SELECT COUNT(*) FROM challenges WHERE challenger_id=? OR opponent_id=?) challenges`;
 const [summary]=await query(sql,Array(kind==='administrator'?3:6).fill(id));
 const names={studentscreated:'studentsCreated',questionscreated:'questionsCreated',worksheetscreated:'worksheetsCreated',practicesessions:'practiceSessions',examattempts:'examAttempts'};
 return {account:publicProfile(target),summary:Object.fromEntries(Object.entries(summary).map(([k,v])=>[names[k.toLowerCase()]||k,Number(v)])),reversible:true};
}
export async function issueAccountDeletionConfirmation(actor,id,body,kind='student'){
 z.uuid().parse(id);const input=confirmationSchema.parse(body);
 return withTransaction(async connection=>{
  const run=runner(connection),{current,target}=await lockAccounts(run,actor,id,kind);
  if(input.username!==target.username)throw new AppError(400,'DELETE_USERNAME_MISMATCH','Tên đăng nhập xác nhận chưa khớp với tài khoản cần xóa.');
  if(!await bcrypt.compare(input.password,current.password_hash))throw new AppError(403,'ADMIN_REAUTH_FAILED','Mật khẩu admin tổng chưa đúng.');
  const now=new Date(),notBefore=new Date(now.getTime()+5000),expiresAt=new Date(now.getTime()+300_000);
  const token=randomBytes(32).toString('base64url');
  await run('UPDATE account_deletion_confirmations SET consumed_at=? WHERE actor_id=? AND profile_id=? AND consumed_at IS NULL',[now,actor.id,id]);
  await run(`INSERT INTO account_deletion_confirmations(id,token_hash,actor_id,profile_id,actor_auth_version,reason,not_before,expires_at)
   VALUES (?,?,?,?,?,?,?,?)`,[randomUUID(),hashToken(token),actor.id,id,Number(current.admin_auth_version||0),input.reason,notBefore,expiresAt]);
  await writeAdminAudit(current,'account.deletion.confirmation',kind,id,{username:target.username,reason:input.reason},run);
  return {confirmationToken:token,notBefore:notBefore.toISOString(),expiresAt:expiresAt.toISOString()};
 });
}
export async function deleteAccountSafely(actor,id,body,kind='student'){
 z.uuid().parse(id);const {confirmationToken}=tokenSchema.parse(body);
 const result=await withTransaction(async connection=>{
  const run=runner(connection),{current,target}=await lockAccounts(run,actor,id,kind);
  const [confirmation]=await run('SELECT * FROM account_deletion_confirmations WHERE token_hash=? AND actor_id=? AND profile_id=? FOR UPDATE',[hashToken(confirmationToken),actor.id,id]);
  const now=new Date();
  if(!confirmation||confirmation.consumed_at||new Date(confirmation.expires_at)<=now
   ||Number(confirmation.actor_auth_version)!==Number(current.admin_auth_version||0))throw invalidConfirmation();
  if(new Date(confirmation.not_before)>now)throw new AppError(409,'DELETION_TOO_EARLY','Vui lòng chờ hết thời gian xác nhận trước khi xóa.',{retryAfterSeconds:Math.ceil((new Date(confirmation.not_before)-now)/1000)});
  const version=kind==='administrator'?'admin_auth_version':'student_auth_version';
  await run(`UPDATE profiles SET deleted_at=?,deleted_by=?,deletion_reason=?,${version}=${version}+1 WHERE id=?`,[now,current.id,confirmation.reason,id]);
  await run('UPDATE account_deletion_confirmations SET consumed_at=? WHERE profile_id=? AND consumed_at IS NULL',[now,id]);
  let cancelled=[];
  if(kind==='student'){
   cancelled=await run("SELECT id,challenger_id,opponent_id FROM challenges WHERE (challenger_id=? OR opponent_id=?) AND status IN ('pending','accepted','in_progress') FOR UPDATE",[id,id]);
   await run("UPDATE challenges SET status='cancelled',cancelled_reason='account_deleted',finished_at=? WHERE (challenger_id=? OR opponent_id=?) AND status IN ('pending','accepted','in_progress')",[now,id,id]);
  }
  await writeAdminAudit(current,'account.delete',kind,id,{username:target.username,reason:confirmation.reason,reversible:true,cancelledChallenges:cancelled.length},run);
  return {cancelled};
 });
 disconnectUser(id);
 for(const challenge of result.cancelled)emitToUsers([challenge.challenger_id,challenge.opponent_id],'challenge:updated',{challengeId:challenge.id});
 return {deleted:true,reversible:true};
}
export async function restoreAccount(actor,id,kind='student'){
 z.uuid().parse(id);
 await withTransaction(async connection=>{
  const run=runner(connection),{current,target}=await lockAccounts(run,actor,id,kind,true);
  const version=kind==='administrator'?'admin_auth_version':'student_auth_version';
  await run(`UPDATE profiles SET deleted_at=NULL,deleted_by=NULL,deletion_reason=NULL,${version}=${version}+1 WHERE id=?`,[id]);
  await run('UPDATE account_deletion_confirmations SET consumed_at=? WHERE profile_id=? AND consumed_at IS NULL',[new Date(),id]);
  await writeAdminAudit(current,'account.restore',kind,id,{username:target.username,deletedAt:new Date(target.deleted_at).toISOString()},run);
 });
 return {restored:true};
}
