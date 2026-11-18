import {randomUUID} from 'node:crypto';
import {withTransaction} from '../config/db.js';
import {AppError} from '../utils/errors.js';
import {requireCourse} from './course-service.js';
import {registrationYearEnd} from './registration-free-year.js';

export async function registerFreeCourse(student,courseId){
 return withTransaction(async connection=>{
  const run=async(sql,params=[]) => (await connection.query(sql,params))[0];
  const [profile]=await run("SELECT id,banned_until FROM profiles WHERE id=? AND role='student' AND COALESCE(account_kind,'student')='student' AND deleted_at IS NULL FOR UPDATE",[student]);
  if(!profile||profile.banned_until&&new Date(profile.banned_until)>new Date())throw new AppError(403,'FREE_STUDENT_REQUIRED','Tài khoản học sinh không thể đăng ký lúc này.');
  const [course]=await run('SELECT id,active FROM courses WHERE id=? FOR UPDATE',[courseId]);
  if(!course||!Number(course.active))throw new AppError(404,'COURSE_NOT_AVAILABLE','Khóa học chưa mở đăng ký.');
  // A repeated request returns the right already granted, without extending it.
  try{return {registered:false,course:await requireCourse(student,courseId,run)};}
  catch(error){if(error.code!=='COURSE_LOCKED')throw error;}
  const [grant]=await run('SELECT * FROM course_free_grants WHERE student_id=? AND course_id=? FOR UPDATE',[student,courseId]);
  const [enrollment]=await run('SELECT revoked_at FROM course_enrollments WHERE student_id=? AND course_id=?',[student,courseId]);
  if(grant?.revoked_at||enrollment?.revoked_at)throw new AppError(403,'FREE_ACCESS_REVOKED','Quyền học khóa này đã bị thu hồi. Bạn vui lòng liên hệ quản trị viên.');
  const [period]=await run('SELECT id FROM course_free_periods WHERE course_id=? AND cancelled_at IS NULL AND starts_at<=CURRENT_TIMESTAMP(3) AND ends_at>CURRENT_TIMESTAMP(3) ORDER BY starts_at DESC,id DESC LIMIT 1 FOR UPDATE',[courseId]);
  if(!period)throw new AppError(409,'FREE_PERIOD_CLOSED','Đợt đăng ký miễn phí chưa mở hoặc đã kết thúc.');
  const [claimed]=await run('SELECT registered_at,ends_at FROM course_free_registrations WHERE student_id=? AND period_id=?',[student,period.id]);
  if(claimed)throw new AppError(409,'FREE_PERIOD_ALREADY_CLAIMED','Bạn đã nhận quyền miễn phí của đợt này. Quyền đã hết hạn; vui lòng liên hệ quản trị viên để gia hạn.');
  const [clock]=await run('SELECT CURRENT_TIMESTAMP(3) registered_at');
  const from=new Date(clock.registered_at),until=registrationYearEnd(from);
  await run('INSERT INTO course_free_registrations(student_id,period_id,registered_at,ends_at) VALUES (?,?,?,?)',[student,period.id,from,until]);
  if(grant){
   const keep=new Date(grant.ends_at)>from;
   const start=keep?new Date(Math.min(new Date(grant.starts_at).getTime(),from.getTime())):from;
   const end=keep?new Date(Math.max(new Date(grant.ends_at).getTime(),until.getTime())):until;
   await run('UPDATE course_free_grants SET starts_at=?,ends_at=?,updated_at=CURRENT_TIMESTAMP(3) WHERE id=?',[start,end,grant.id]);
  }else await run('INSERT INTO course_free_grants(id,student_id,course_id,starts_at,ends_at,note) VALUES (?,?,?,?,?,?)',[randomUUID(),student,courseId,from,until,'Học sinh đăng ký trong đợt miễn phí · 1 năm từ ngày đăng ký khóa học']);
  await run('INSERT INTO course_access_audit(student_id,course_id,actor_id,action,note) VALUES (?,?,NULL,?,?)',[student,courseId,grant?'extend_free':'grant_free','Học sinh nhận đợt miễn phí '+period.id+' · '+from.toISOString()+' → '+until.toISOString()]);
  return {registered:true,course:await requireCourse(student,courseId,run)};
 });
}
