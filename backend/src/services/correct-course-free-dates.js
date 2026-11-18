import {courseRegistrationStart,registrationYearEnd} from './registration-free-year.js';

// Correct only automatically seeded policy metadata, preserving custom grants
// and every original account, order, paid entitlement and learning record.
export async function correctCourseFreeDates(run){
 const marker='free-course-registration-dates-20261118';
 if((await run('SELECT name FROM course_payment_migrations WHERE name=?',[marker])).length)return {already_applied:true,rights:[],grants:[]};
 const rights=await run('SELECT * FROM course_registration_free ORDER BY student_id,course_id FOR UPDATE');
 const changes=[],grants=[];
 for(const right of rights){
  const start=await courseRegistrationStart(right.student_id,right.course_id,run),end=registrationYearEnd(start);
  const [gift]=await run('SELECT * FROM course_free_grants WHERE student_id=? AND course_id=? FOR UPDATE',[right.student_id,right.course_id]);
  const sameDates=gift&&new Date(gift.starts_at).getTime()===new Date(right.registered_at).getTime()&&new Date(gift.ends_at).getTime()===new Date(right.ends_at).getTime();
  const automatic=gift&&!gift.granted_by&&sameDates&&gift.note==='Nhóm đăng ký miễn phí hiện tại · 1 năm từ ngày đăng ký tài khoản';
  if(automatic){
   const note='Nhóm đăng ký miễn phí hiện tại · 1 năm từ ngày đăng ký khóa học';
   await run('UPDATE course_free_grants SET starts_at=?,ends_at=?,note=?,updated_at=CURRENT_TIMESTAMP(3) WHERE id=?',[start,end,note,gift.id]);
   grants.push({id:gift.id,starts_at:start,ends_at:end,note});
  }
  await run('UPDATE course_registration_free SET registered_at=?,ends_at=? WHERE student_id=? AND course_id=?',[start,end,right.student_id,right.course_id]);
  changes.push({student_id:right.student_id,course_id:right.course_id,registered_at:start,ends_at:end});
 }
 await run('INSERT INTO course_payment_migrations(name) VALUES (?)',[marker]);
 return {rights:changes,grants};
}
