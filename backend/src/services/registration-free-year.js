import {randomUUID} from 'node:crypto';
import {dialectSql} from '../config/db.js';

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
// Resolve a course registration from its original order or entitlement, without
// borrowing the account creation date or changing those source records.
export async function courseRegistrationStart(student,course,run){
 const [row]=await run(`SELECT COALESCE(
  (SELECT MIN(o.created_at) FROM course_orders o LEFT JOIN course_momo_payments m ON m.order_id=o.id WHERE o.student_id=? AND o.course_id=? AND o.status='approved' AND m.order_id IS NULL),
  (SELECT e.starts_at FROM course_enrollments e WHERE e.student_id=? AND e.course_id=?),
  (SELECT g.created_at FROM course_free_grants g WHERE g.student_id=? AND g.course_id=?),
  CURRENT_TIMESTAMP(3)) registered_at`,[student,course,student,course,student,course]);
 return new Date(row.registered_at);
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
  for(const course of ids){
   const registered=await courseRegistrationStart(student.id,course,run),until=registrationYearEnd(registered);
   await run(dialectSql(
    'INSERT IGNORE INTO course_registration_free(student_id,course_id,registered_at,ends_at) VALUES (?,?,?,?)',
    'INSERT INTO course_registration_free(student_id,course_id,registered_at,ends_at) VALUES (?,?,?,?) ON CONFLICT(student_id,course_id) DO NOTHING'
   ),[student.id,course,registered,until]);
   await insertRegistrationGift(run,student.id,course,registered,until,'Nhóm đăng ký miễn phí hiện tại · 1 năm từ ngày đăng ký khóa học');count++;
  }
 }
 await run('INSERT INTO course_payment_migrations(name) VALUES (?)',[marker]);
 return {students:students.length,free_entitlements:count};
}
