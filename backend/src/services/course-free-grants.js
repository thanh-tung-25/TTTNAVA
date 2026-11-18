import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {query,withTransaction,dialectSql} from '../config/db.js';
import {AppError} from '../utils/errors.js';

export {activeFreeGrant} from './course-access-policy.js';
export async function freeGrantOptions(){
 const [students,courses]=await Promise.all([
  query("SELECT username,display_name,created_at FROM profiles WHERE role='student' AND COALESCE(account_kind,'student')='student' AND deleted_at IS NULL ORDER BY display_name,username LIMIT 1000"),
  query('SELECT id,title,kind,level FROM courses WHERE active=1 ORDER BY kind,level')
 ]);return {students,courses};
}
export async function grantFreeCourses(admin,body){
 const d=z.object({username:z.string().trim().min(3).max(20),course_ids:z.array(z.string().min(1).max(32)).min(1).max(50),starts_at:z.iso.datetime(),ends_at:z.iso.datetime(),note:z.string().trim().max(500).default('')}).strict().parse(body);
 const from=new Date(d.starts_at),until=new Date(d.ends_at);
 if(until<=from||until<=new Date()||until-from>3650*86400000)throw new AppError(400,'GRANT_DATES_INVALID','Chọn ngày kết thúc sau ngày bắt đầu, ở tương lai và không quá 10 năm.');
 return withTransaction(async c=>{
  const run=async(sql,p=[]) => (await c.query(sql,p))[0];
  const [student]=await run("SELECT id FROM profiles WHERE LOWER(username)=LOWER(?) AND role='student' AND COALESCE(account_kind,'student')='student' AND deleted_at IS NULL FOR UPDATE",[d.username]);
  if(!student)throw new AppError(404,'STUDENT_NOT_FOUND','Không tìm thấy tài khoản học sinh. Học sinh cần đăng ký tài khoản trước.');
  const granted=[],skipped=[];
  for(const courseId of [...new Set(d.course_ids)].sort()){
   const [course]=await run('SELECT id,title,active FROM courses WHERE id=? FOR UPDATE',[courseId]);
   if(!course||!Number(course.active))throw new AppError(400,'COURSE_NOT_AVAILABLE','Một trong các khóa đã chọn chưa được mở.');
   const [paid]=await run("SELECT e.student_id FROM course_enrollments e LEFT JOIN course_paid_access a ON a.student_id=e.student_id AND a.course_id=e.course_id LEFT JOIN course_registration_free r ON r.student_id=e.student_id AND r.course_id=e.course_id WHERE e.student_id=? AND e.course_id=? AND (r.student_id IS NULL OR a.origin='momo') AND (a.student_id IS NOT NULL OR e.source='order') AND e.revoked_at IS NULL AND e.starts_at<=CURRENT_TIMESTAMP(3) AND (e.expires_at IS NULL OR e.expires_at>=?)",[student.id,courseId,until]);
   if(paid){skipped.push(course.title);continue;}
   const [old]=await run('SELECT * FROM course_free_grants WHERE student_id=? AND course_id=? FOR UPDATE',[student.id,courseId]);
   const keep=old&&!old.revoked_at&&new Date(old.ends_at)>new Date();
   const start=keep?new Date(Math.min(new Date(old.starts_at).getTime(),from.getTime())):from;
   const end=keep?new Date(Math.max(new Date(old.ends_at).getTime(),until.getTime())):until;
   const id=old?.id||randomUUID();
   await run(dialectSql(
    'INSERT INTO course_free_grants(id,student_id,course_id,starts_at,ends_at,granted_by,note) VALUES (?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE starts_at=VALUES(starts_at),ends_at=VALUES(ends_at),granted_by=VALUES(granted_by),note=VALUES(note),revoked_at=NULL,updated_at=CURRENT_TIMESTAMP(3)',
    'INSERT INTO course_free_grants(id,student_id,course_id,starts_at,ends_at,granted_by,note) VALUES (?,?,?,?,?,?,?) ON CONFLICT(student_id,course_id) DO UPDATE SET starts_at=EXCLUDED.starts_at,ends_at=EXCLUDED.ends_at,granted_by=EXCLUDED.granted_by,note=EXCLUDED.note,revoked_at=NULL,updated_at=CURRENT_TIMESTAMP(3)'
   ),[id,student.id,courseId,start,end,admin,d.note]);
   const previous=old?' · Trước: '+new Date(old.starts_at).toISOString()+' → '+new Date(old.ends_at).toISOString()+(old.revoked_at?' (đã thu hồi)':''):'';
   await run('INSERT INTO course_access_audit(student_id,course_id,actor_id,action,note) VALUES (?,?,?,?,?)',[student.id,courseId,admin,old?'extend_free':'grant_free','Miễn phí: '+start.toISOString()+' → '+end.toISOString()+previous+(d.note?' · '+d.note:'')]);
   granted.push({id,title:course.title,starts_at:start,ends_at:end});
  }
  return {granted,skipped};
 });
}
export async function revokeFreeGrant(admin,id){
 return withTransaction(async c=>{
  const run=async(sql,p=[]) => (await c.query(sql,p))[0];
  const [initial]=await run('SELECT student_id FROM course_free_grants WHERE id=?',[id]);if(!initial)throw new AppError(404,'GRANT_NOT_FOUND','Không tìm thấy quyền miễn phí.');
  await run('SELECT id FROM profiles WHERE id=? FOR UPDATE',[initial.student_id]);
  const [grant]=await run('SELECT * FROM course_free_grants WHERE id=? FOR UPDATE',[id]);
  if(grant.revoked_at)return {saved:true};
  await run('UPDATE course_free_grants SET revoked_at=CURRENT_TIMESTAMP(3),updated_at=CURRENT_TIMESTAMP(3) WHERE id=?',[id]);
  await run('INSERT INTO course_access_audit(student_id,course_id,actor_id,action,note) VALUES (?,?,?,?,?)',[grant.student_id,grant.course_id,admin,'revoke_free','Thu hồi quyền miễn phí riêng; giữ nguyên quyền đã thanh toán.']);return {saved:true};
 });
}
