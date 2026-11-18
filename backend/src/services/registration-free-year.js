import {randomUUID} from 'node:crypto';
import {query,dialectSql} from '../config/db.js';

export function registrationYearEnd(value){
 const end=new Date(value),month=end.getUTCMonth();end.setUTCFullYear(end.getUTCFullYear()+1);
 if(end.getUTCMonth()!==month)end.setUTCDate(0);return end;
}
async function insertRegistrationGift(run,student,course,registered,until,note){
 await run(dialectSql(
  'INSERT IGNORE INTO course_free_grants(id,student_id,course_id,starts_at,ends_at,note) VALUES (?,?,?,?,?,?)',
  'INSERT INTO course_free_grants(id,student_id,course_id,starts_at,ends_at,note) VALUES (?,?,?,?,?,?) ON CONFLICT(student_id,course_id) DO NOTHING'
 ),[randomUUID(),student,course,new Date(registered),until,note]);
}
// May only insert into the new rights metadata, never change the account or
// purchased entitlement. Existing manual gifts have priority and are preserved.
export async function ensureRegistrationOffers(student,run=query){
 const rows=await run(`SELECT DISTINCT p.id,p.created_at,f.course_id FROM profiles p JOIN course_free_periods f ON f.starts_at<=p.created_at AND f.ends_at>p.created_at AND (f.cancelled_at IS NULL OR f.cancelled_at>p.created_at)
 JOIN courses c ON c.id=f.course_id AND c.active=1 LEFT JOIN course_free_grants g ON g.student_id=p.id AND g.course_id=c.id
 WHERE p.id=? AND p.role='student' AND COALESCE(p.account_kind,'student')='student' AND p.deleted_at IS NULL AND g.id IS NULL`,[student]);
 for(const row of rows)await insertRegistrationGift(run,row.id,row.course_id,row.created_at,registrationYearEnd(row.created_at),'Đăng ký trong đợt miễn phí · 1 năm từ ngày đăng ký tài khoản');
}
// Explicit one-time conversion of the existing cohort. All original rows stay
// byte-for-byte intact. The runtime reads this sidecar instead of legacy labels.
export async function seedExistingRegistrationYear(run){
 const marker='registration-free-year-20261118';
 const [done]=await run('SELECT name FROM course_payment_migrations WHERE name=?',[marker]);if(done)return {already_applied:true};
 const students=await run("SELECT id,grade,created_at FROM profiles WHERE role='student' AND COALESCE(account_kind,'student')='student' AND deleted_at IS NULL");
 const courses=await run('SELECT id FROM courses WHERE active=1'),available=new Set(courses.map(c=>c.id));
 const allRights=await run('SELECT student_id FROM course_enrollments');
 const rights=await run('SELECT student_id,course_id FROM course_enrollments WHERE revoked_at IS NULL AND starts_at<=CURRENT_TIMESTAMP(3) AND (expires_at IS NULL OR expires_at>CURRENT_TIMESTAMP(3))');
 let count=0;
 for(const student of students){
  const ids=[...new Set(rights.filter(e=>e.student_id===student.id&&available.has(e.course_id)).map(e=>e.course_id))];
  if(!ids.length&&!allRights.some(e=>e.student_id===student.id)){const basic=student.grade?'grade-'+student.grade:'hsk-1';if(available.has(basic))ids.push(basic);}
  const until=registrationYearEnd(student.created_at);
  for(const course of ids){
   await run(dialectSql(
    'INSERT IGNORE INTO course_registration_free(student_id,course_id,registered_at,ends_at) VALUES (?,?,?,?)',
    'INSERT INTO course_registration_free(student_id,course_id,registered_at,ends_at) VALUES (?,?,?,?) ON CONFLICT(student_id,course_id) DO NOTHING'
   ),[student.id,course,student.created_at,until]);
   await insertRegistrationGift(run,student.id,course,student.created_at,until,'Nhóm đăng ký miễn phí hiện tại · 1 năm từ ngày đăng ký tài khoản');count++;
  }
 }
 await run('INSERT INTO course_payment_migrations(name) VALUES (?)',[marker]);
 return {students:students.length,free_entitlements:count};
}
