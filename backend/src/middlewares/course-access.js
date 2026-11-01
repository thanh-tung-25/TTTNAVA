import { query } from '../config/db.js';
import { AppError, asyncHandler } from '../utils/errors.js';
import { requireCourse } from '../services/course-service.js';

export async function requireSetAccess(student,ids) {
 for(const id of [...new Set(ids)]) {
  const [row]=await query('SELECT l.level_id FROM chinese_sets s JOIN chinese_lessons l ON l.id=s.lesson_id WHERE s.id=?',[id]);
  if(!row)throw new AppError(404,'NOT_FOUND','Không tìm thấy bài học');
  await requireCourse(student,'hsk-'+row.level_id);
 }
}
export const chineseCourseGuard=asyncHandler(async(r,_res,next)=>{
 if(r.user.role==='admin')return next();
 const segments=r.path.split('/').filter(Boolean),kind=segments[0],id=segments[1];let ids=[];
 if(kind==='sets'&&id)ids=[id];
 else if(kind==='reviews'&&id) {
  const [item]=await query('SELECT set_id FROM chinese_items WHERE id=?',[id]);if(item)ids=[item.set_id];
 }else if(kind==='attempts'){
  if(id){
   const [a]=await query('SELECT snapshot FROM chinese_attempts WHERE id=? AND student_id=?',[id,r.user.id]);
   if(a){const snapshot=typeof a.snapshot==='string'?JSON.parse(a.snapshot):a.snapshot;
    if(snapshot.course_ids?.length){for(const course of snapshot.course_ids)await requireCourse(r.user.id,course);}
    else ids=snapshot.items.map(i=>i.set_id).filter(Boolean);
   }
  }else if(r.body?.set_id)ids=[r.body.set_id];
  else if(r.body?.test_id){
   const [test]=await query('SELECT set_ids FROM chinese_tests WHERE id=?',[r.body.test_id]);
   if(test)ids=typeof test.set_ids==='string'?JSON.parse(test.set_ids):test.set_ids;
  }
 }
 await requireSetAccess(r.user.id,ids);next();
});

export function primaryCourseGuard(area) {
 return asyncHandler(async(r,_res,next)=>{
  if(r.user.role==='admin')return next();
  const parts=r.path.split('/').filter(Boolean);let grade;
  if(parts[0]==='history')return next();
  if(area==='catalog') {
   if(parts[0]==='subjects')return next();
   if(parts[0]==='topics'&&parts[1]){const [topic]=await query('SELECT grade FROM topics WHERE id=?',[parts[1]]);grade=topic?.grade;}
   else grade=Number(r.query.grade);
  } else if(r.body?.topicId){const [topic]=await query('SELECT grade FROM topics WHERE id=?',[r.body.topicId]);grade=topic?.grade;}
  else if(parts[0]&&parts[0]!=='lobby'){
   const table={practice:'practice_sessions',exams:'exam_attempts',challenges:'challenges'}[area];
   const sql=area==='challenges'?`SELECT grade FROM ${table} WHERE id=?`:`SELECT t.grade FROM ${table} x JOIN topics t ON t.id=x.topic_id WHERE x.id=? AND x.student_id=?`;
   const [row]=await query(sql,area==='challenges'?[parts[0]]:[parts[0],r.user.id]);grade=row?.grade;
  }else{
   const id=r.get('X-Course-Id');
   if(id?.startsWith('grade-'))grade=Number(id.slice(6));else grade=r.user.grade;
  }
  if(grade==null&&(r.body?.topicId||parts[0]&&parts[0]!=='lobby'))return next();
  if(area==='catalog'&&(!Number.isInteger(Number(grade))||Number(grade)<1||Number(grade)>5))return next();
  if(!Number.isInteger(Number(grade))||Number(grade)<1||Number(grade)>5)throw new AppError(403,'COURSE_LOCKED','Con chọn khóa Lớp 1–5 trước khi vào học.');
  await requireCourse(r.user.id,'grade-'+grade);
  if(area==='challenges'&&r.body?.opponentUsername){
   const [opponent]=await query('SELECT id FROM profiles WHERE username=?',[r.body.opponentUsername]);
   if(opponent)await requireCourse(opponent.id,'grade-'+grade);
  }
  next();
 });
}
