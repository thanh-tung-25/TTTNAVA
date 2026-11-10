import {randomUUID,randomBytes,createHash} from 'node:crypto';
import {z} from 'zod';
import {query,withTransaction} from '../config/db.js';
import {badRequest,forbidden,notFound} from '../utils/errors.js';
import {requireCourse} from './course-service.js';
import {requireFriend} from './chat-friends.js';
import {activeStudent,txRun,sourceItems,insertLearningRun,runLink,json} from './student-experience.js';
import {familyReport} from './learning-support.js';

export async function listAsyncDuels(user,courseId){
 await requireCourse(user,courseId);
 const rows=await query('SELECT d.*,p.display_name AS creator_name,q.display_name AS opponent_name,a.status AS creator_status,b.status AS opponent_status,a.answers_json AS creator_answers,b.answers_json AS opponent_answers,a.items_json FROM async_learning_duels d JOIN profiles p ON p.id=d.creator_id JOIN profiles q ON q.id=d.opponent_id JOIN learning_runs a ON a.id=d.creator_run_id LEFT JOIN learning_runs b ON b.id=d.opponent_run_id WHERE (d.creator_id=? OR d.opponent_id=?) AND d.course_id=? AND p.deleted_at IS NULL AND q.deleted_at IS NULL ORDER BY d.created_at DESC LIMIT 50',[user,user,courseId]);
 return rows.map(r=>{const both=r.creator_status==='finished'&&r.opponent_status==='finished',score=answers=>Object.values(json(answers)).filter(a=>a.correct).length;return {id:r.id,kind:r.duel_kind,status:both?'finished':new Date(r.expires_at)<new Date()?'expired':r.status,creatorName:r.creator_name,opponentName:r.opponent_name,incoming:r.opponent_id===user,expiresAt:r.expires_at,href:r.creator_id===user?runLink(r.creator_run_id):r.opponent_run_id?runLink(r.opponent_run_id):null,result:both?{creator:score(r.creator_answers),opponent:score(r.opponent_answers),total:json(r.items_json).length,cooperativeComplete:r.duel_kind==='cooperative'}:null};});
}
export async function createAsyncDuel(user,courseId,body){
 const d=z.object({opponentUsername:z.string().trim().min(3).max(20),kind:z.enum(['competitive','cooperative']),itemId:z.string().max(60).nullable().optional(),minutes:z.union([z.literal(5),z.literal(10)]).default(5)}).strict().parse(body);
 const [peer]=await query("SELECT id FROM profiles WHERE username=? AND role='student' AND deleted_at IS NULL",[d.opponentUsername]);if(!peer||peer.id===user)throw notFound();
 await requireFriend(user,peer.id);await requireCourse(peer.id,courseId);const items=await sourceItems(user,courseId,{itemId:d.itemId,count:d.minutes});
 return withTransaction(async c=>{const run=txRun(c);for(const id of [user,peer.id].sort())await activeStudent(id,run,true);await requireFriend(user,peer.id,run);
  const [pending]=await run("SELECT COUNT(*) total FROM async_learning_duels WHERE creator_id=? AND status IN ('pending','accepted') AND expires_at>? AND NOT EXISTS(SELECT 1 FROM learning_runs a JOIN learning_runs b ON b.id=async_learning_duels.opponent_run_id WHERE a.id=async_learning_duels.creator_run_id AND a.status='finished' AND b.status='finished')",[user,new Date()]);if(Number(pending.total)>=10)throw badRequest('Bạn đang có 10 thử thách chưa kết thúc. Hãy hoàn thành các thử thách đang có.');
  const runId=await insertLearningRun(run,user,courseId,items,'duel',d.kind==='cooperative'?'Cùng bạn hoàn thành':'Thách đấu cùng bộ câu hỏi'),id=randomUUID();
  await run('INSERT INTO async_learning_duels(id,creator_id,opponent_id,course_id,creator_run_id,duel_kind,expires_at) VALUES (?,?,?,?,?,?,?)',[id,user,peer.id,courseId,runId,d.kind,new Date(Date.now()+3*86400000)]);return {id,href:runLink(runId)};
 });
}
export async function respondAsyncDuel(user,id,body){
 z.uuid().parse(id);const {accept}=z.object({accept:z.boolean()}).strict().parse(body);
 const [initial]=await query('SELECT course_id,creator_id FROM async_learning_duels WHERE id=? AND opponent_id=?',[id,user]);if(!initial)throw notFound();await requireCourse(user,initial.course_id);await requireCourse(initial.creator_id,initial.course_id);
 return withTransaction(async c=>{const run=txRun(c);for(const who of [user,initial.creator_id].sort())await activeStudent(who,run,true);await requireFriend(user,initial.creator_id,run);
  const [duel]=await run('SELECT * FROM async_learning_duels WHERE id=? AND opponent_id=? FOR UPDATE',[id,user]);if(!duel||new Date(duel.expires_at)<=new Date())throw notFound();
  if(duel.opponent_run_id)return {href:runLink(duel.opponent_run_id)};if(duel.status!=='pending')throw badRequest('Lời mời đã được xử lý.');
  if(!accept){await run("UPDATE async_learning_duels SET status='declined' WHERE id=?",[id]);return {declined:true};}
  const [original]=await run('SELECT items_json,title FROM learning_runs WHERE id=?',[duel.creator_run_id]);
  const runId=await insertLearningRun(run,user,duel.course_id,json(original.items_json),'duel',original.title);await run("UPDATE async_learning_duels SET opponent_run_id=?,status='accepted' WHERE id=?",[runId,id]);return {href:runLink(runId)};
 });
}

const digest=value=>createHash('sha256').update(value).digest('hex');
export async function createGuardianCode(user){
 const profile=await activeStudent(user);if(profile.account_kind==='guardian')throw forbidden('Mã ghép được tạo từ tài khoản học sinh.');const code=randomBytes(6).toString('hex').toUpperCase(),expiresAt=new Date(Date.now()+86400000);
 await withTransaction(async c=>{const run=txRun(c);await activeStudent(user,run,true);await run('UPDATE guardian_pair_codes SET consumed_at=? WHERE student_id=? AND consumed_at IS NULL',[new Date(),user]);await run('INSERT INTO guardian_pair_codes(id,student_id,code_hash,expires_at) VALUES (?,?,?,?)',[randomUUID(),user,digest(code),expiresAt]);});
 return {code,expiresAt:expiresAt.toISOString()};
}
async function guardianProfile(user){const p=await activeStudent(user);if(p.account_kind!=='guardian'||!p.email_verified_at)throw forbidden('Bạn cần tài khoản phụ huynh có Gmail đã xác minh.');return p;}
export async function requestGuardianLink(user,body){
 await guardianProfile(user);const {code}=z.object({code:z.string().trim().toUpperCase().regex(/^[A-F0-9]{12}$/)}).strict().parse(body);
 const [initial]=await query('SELECT student_id FROM guardian_pair_codes WHERE code_hash=?',[digest(code)]);if(!initial||initial.student_id===user)throw notFound();
 return withTransaction(async c=>{const run=txRun(c);for(const who of [user,initial.student_id].sort())await activeStudent(who,run,true);
  const [pair]=await run('SELECT * FROM guardian_pair_codes WHERE code_hash=? FOR UPDATE',[digest(code)]);if(!pair||pair.consumed_at||new Date(pair.expires_at)<=new Date())throw badRequest('Mã ghép không hợp lệ hoặc hết hạn. Hãy nhờ học sinh tạo mã mới.');
  const [count]=await run("SELECT COUNT(*) total FROM guardian_links WHERE student_id=? AND status IN ('pending','accepted')",[pair.student_id]);if(Number(count.total)>=5)throw badRequest('Tài khoản học sinh đã đủ số liên kết phụ huynh.');
  let [old]=await run('SELECT * FROM guardian_links WHERE guardian_id=? AND student_id=?',[user,pair.student_id]);
  if(old?.status==='accepted')return {id:old.id,status:'accepted'};
  const id=old?.id||randomUUID();if(old)await run("UPDATE guardian_links SET status='pending' WHERE id=?",[id]);else await run('INSERT INTO guardian_links(id,guardian_id,student_id) VALUES (?,?,?)',[id,user,pair.student_id]);
  await run('UPDATE guardian_pair_codes SET consumed_at=? WHERE id=?',[new Date(),pair.id]);return {id,status:'pending'};
 });
}
export async function guardianConnections(user){
 const rows=await query('SELECT g.id,g.guardian_id,g.student_id,g.status,p.display_name AS student_name,q.display_name AS guardian_name,q.email AS guardian_email FROM guardian_links g JOIN profiles p ON p.id=g.student_id JOIN profiles q ON q.id=g.guardian_id WHERE (g.guardian_id=? OR g.student_id=?) AND p.deleted_at IS NULL AND q.deleted_at IS NULL ORDER BY g.created_at DESC LIMIT 50',[user,user]);
 return rows.map(r=>({...r,guardian_email:r.guardian_email.replace(/^(.).*(@.*)$/,'$1***$2'),needsApproval:r.student_id===user&&r.status==='pending'}));
}
export async function respondGuardianLink(user,id,body){
 z.uuid().parse(id);const {action}=z.object({action:z.enum(['accept','decline','revoke'])}).strict().parse(body);
 const [link]=await query('SELECT * FROM guardian_links WHERE id=? AND (student_id=? OR guardian_id=?)',[id,user,user]);if(!link)throw notFound();
 if(action!=='revoke'&&link.student_id!==user)throw forbidden('Chỉ học sinh được xác nhận yêu cầu liên kết này.');
 if(action==='accept'&&link.status!=='pending')throw badRequest('Yêu cầu không còn chờ xác nhận.');
 const result=await query('UPDATE guardian_links SET status=? WHERE id=?'+(action==='revoke'?" AND status IN ('pending','accepted')":" AND status='pending'"),[{accept:'accepted',decline:'declined',revoke:'revoked'}[action],id]);if(!result.affectedRows)throw badRequest('Yêu cầu đã được xử lý. Hãy tải lại danh sách liên kết.');return {updated:true};
}
async function linkedChild(user,id){
 await guardianProfile(user);z.uuid().parse(id);const [row]=await query("SELECT p.id,p.display_name FROM guardian_links g JOIN profiles p ON p.id=g.student_id WHERE g.guardian_id=? AND g.student_id=? AND g.status='accepted' AND p.deleted_at IS NULL",[user,id]);if(!row)throw notFound();return row;
}
export async function childCourses(user,id){await linkedChild(user,id);return query('SELECT c.id,c.title,c.kind,c.level FROM courses c JOIN course_enrollments e ON e.course_id=c.id WHERE e.student_id=? AND e.revoked_at IS NULL AND e.starts_at<=CURRENT_TIMESTAMP(3) AND (e.expires_at IS NULL OR e.expires_at>CURRENT_TIMESTAMP(3)) AND c.active=1 ORDER BY c.kind,c.level',[id]);}
export async function guardianReport(user,id,courseId){const child=await linkedChild(user,id);const report=await familyReport(id,courseId);return {child,...report};}
