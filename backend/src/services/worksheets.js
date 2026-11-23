import {randomUUID} from 'node:crypto';
import {query,withTransaction,dialectSql} from '../config/db.js';
import {AppError,notFound,badRequest} from '../utils/errors.js';
import {requireCourse} from './course-service.js';
import {validateSheet,publicItem,gradeItem,validateResponses} from './worksheet-rules.js';
import {z} from 'zod';
import {resolveCurriculumScope} from './curriculum-scope.js';
import {awardLearningReward} from './learning-reward.js';
import {worksheetExamScore} from './worksheet-exam-scoring.js';
import {worksheetExamsAvailable} from './worksheet-exam-schema.js';
import {worksheetSolutionImagesAvailable} from './worksheet-solution-access.js';
import {assertCurriculumLessonVisible} from './school-curriculum-state.js';
export const json=v=>typeof v==='string'?JSON.parse(v):v;
export async function sheet(id,admin=false,user,run=query){
 const [row]=await run('SELECT * FROM worksheets WHERE id=?',[id]);if(!row||!admin&&row.status!=='published')throw notFound();
 row.items=json(row.items);row.exam_config=json(row.exam_config);if(!admin){await requireCourse(user,'grade-'+row.grade,run);if(row.lesson_id&&!row.exam_config)await assertCurriculumLessonVisible(row.lesson_id,run);row.items=row.items.map(publicItem);}return row;
}
export async function save(admin,id,body){
 const d=validateSheet(body);id||=randomUUID();
 const supportsExams=await worksheetExamsAvailable();if(d.exam_config&&!supportsExams)throw new AppError(409,'EXAM_SETUP_REQUIRED','Cần chạy cập nhật dữ liệu 048_worksheet_exams trước khi đăng đề thi.');
 const supportsSolutions=await worksheetSolutionImagesAvailable();if(d.items.some(item=>item.solutionImageIds?.length)&&!supportsSolutions)throw new AppError(409,'WORKSHEET_SOLUTION_SETUP','Cần cập nhật kho ảnh hướng dẫn giải trước khi lưu.');
 if(d.lesson_id)await resolveCurriculumScope({lessonId:d.lesson_id,grade:d.grade,subjectId:d.subject_id});
 return withTransaction(async c=>{
  const run=async(sql,p=[]) => (await c.query(sql,p))[0];
  const [old]=await run('SELECT * FROM worksheets WHERE id=? FOR UPDATE',[id]);
  if(old&&old.version!==d.version)throw new AppError(409,'WORKSHEET_CHANGED','Bộ bài đã thay đổi ở nơi khác. Tải lại trước khi sửa.');
  if(old&&old.grade!==d.grade&&(await run('SELECT id FROM worksheet_attempts WHERE worksheet_id=? LIMIT 1',[id])).length)throw badRequest('Bộ bài đã có học sinh làm. Tạo bộ mới để đổi lớp.');
  for(const item of d.items){
   if(item.imageId&&!(await run('SELECT id FROM worksheet_images WHERE id=? AND worksheet_id=?'+(supportsSolutions?' AND id NOT IN (SELECT image_id FROM worksheet_solution_images)':''),[item.imageId,id])).length)throw badRequest('Hình đề bài không thuộc bộ bài này hoặc là ảnh lời giải.');
   for(const solution of item.solutionImageIds||[])if(!(await run('SELECT i.id FROM worksheet_images i JOIN worksheet_solution_images s ON s.image_id=i.id WHERE i.id=? AND i.worksheet_id=?',[solution,id])).length)throw badRequest('Ảnh hướng dẫn giải không thuộc bộ bài này.');
  }
  await run(dialectSql(`INSERT INTO worksheets(id,title,grade,subject_id,status,items,created_by,lesson_id) VALUES (?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE title=VALUES(title),grade=VALUES(grade),subject_id=VALUES(subject_id),status=VALUES(status),items=VALUES(items),lesson_id=VALUES(lesson_id),version=version+1`,
   `INSERT INTO worksheets(id,title,grade,subject_id,status,items,created_by,lesson_id) VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET title=EXCLUDED.title,grade=EXCLUDED.grade,subject_id=EXCLUDED.subject_id,status=EXCLUDED.status,items=EXCLUDED.items,lesson_id=EXCLUDED.lesson_id,version=worksheets.version+1`),[id,d.title,d.grade,d.subject_id,d.status,JSON.stringify(d.items),admin,d.lesson_id]);
  if(supportsExams)await run('UPDATE worksheets SET exam_config=? WHERE id=?',[d.exam_config?JSON.stringify(d.exam_config):null,id]);
  return sheet(id,true,null,run);
 });
}
export async function attempt(user,id,run=query){
 const [row]=await run('SELECT a.*,w.subject_id FROM worksheet_attempts a LEFT JOIN worksheets w ON w.id=a.worksheet_id WHERE a.id=? AND a.student_id=?',[id,user]);if(!row)throw notFound();
 await requireCourse(user,'grade-'+row.grade,run);
 const snapshot=json(row.snapshot);
 if(run===query&&row.status==='in_progress'&&snapshot.ends_at&&Date.now()>new Date(snapshot.ends_at).getTime()+5000)return answer(user,id,json(row.answers),true);
 return {...row,exam_config:snapshot.exam_config||null,ends_at:snapshot.ends_at||null,exam_score:row.results&&snapshot.exam_config?worksheetExamScore(snapshot.items,json(row.results),snapshot.exam_config):null,subject_id:snapshot.subject_id||row.subject_id,snapshot:undefined,title:snapshot.title,items:snapshot.items.map(publicItem),answers:json(row.answers),results:row.results?json(row.results):null};
}
export async function start(user,id){
 return withTransaction(async c=>{
  const run=async(sql,p=[]) => (await c.query(sql,p))[0];await run('SELECT id FROM profiles WHERE id=? FOR UPDATE',[user]);
  await run('SELECT id FROM worksheets WHERE id=? FOR UPDATE',[id]);
  const [open]=await run("SELECT id FROM worksheet_attempts WHERE worksheet_id=? AND student_id=? AND status='in_progress' ORDER BY started_at DESC LIMIT 1",[id,user]);
  if(open)return attempt(user,open.id,run);
  await sheet(id,false,user,run);const data=await sheet(id,true,null,run);
  const attemptId=open?.id||randomUUID();
  if(!open)await run('INSERT INTO worksheet_attempts(id,worksheet_id,student_id,grade,snapshot,answers) VALUES (?,?,?,?,?,?)',[attemptId,id,user,data.grade,JSON.stringify({title:data.title,subject_id:data.subject_id,items:data.items,...(data.exam_config?{exam_config:data.exam_config,ends_at:new Date(Date.now()+data.exam_config.duration_minutes*60000).toISOString()}:{})}),'{}']);
  return attempt(user,attemptId,run);
 });
}
export async function answer(user,id,body,submit=false){
 return withTransaction(async c=>{
  const run=async(sql,p=[]) => (await c.query(sql,p))[0];await run('SELECT id FROM profiles WHERE id=? FOR UPDATE',[user]);
  const [row]=await run('SELECT * FROM worksheet_attempts WHERE id=? AND student_id=? FOR UPDATE',[id,user]);if(!row)throw notFound();
  await requireCourse(user,'grade-'+row.grade,run);if(row.status!=='in_progress')return attempt(user,id,run);
  const snapshot=json(row.snapshot),items=snapshot.items,expired=snapshot.ends_at&&Date.now()>new Date(snapshot.ends_at).getTime()+5000;
  if(expired){submit=true;body=json(row.answers);}
  const responses=validateResponses(items,body),results=submit?items.map(item=>({id:item.id,...gradeItem(item,responses[item.id])})):null;
  const pending=results?.some(r=>r.correct===null&&!r.excluded);const score=results&&!pending?snapshot.exam_config?worksheetExamScore(items,results,snapshot.exam_config).percent:Math.round(results.filter(r=>r.correct).length/items.length*10000)/100:null;
  await run('UPDATE worksheet_attempts SET answers=?,results=?,score=?,status=?,submitted_at=? WHERE id=?',[JSON.stringify(responses),results?JSON.stringify(results):null,score,submit?pending?'pending_review':'completed':'in_progress',submit?new Date():null,id]);
  const filled=value=>typeof value==='string'?Boolean(value.trim()):typeof value==='boolean'||typeof value==='number'?true:Array.isArray(value)?value.length>0&&value.every(filled):value&&typeof value==='object'?Object.values(value).some(filled):false;
  const rewardItems=items.filter(item=>item.grading!=='excluded');
  const reward=submit&&rewardItems.length&&rewardItems.every(item=>filled(responses[item.id]))?await awardLearningReward(user,'grade-'+row.grade,'worksheet',row.worksheet_id,run):null;
  return {...await attempt(user,id,run),...(reward?{reward}:{})};
 });
}
export async function review(admin,id,body){
 const marks=z.array(z.object({id:z.string().uuid(),correct:z.boolean(),comment:z.string().trim().max(2000).default('')})).max(50).parse(body.marks);
 return withTransaction(async c=>{
  const run=async(sql,p=[]) => (await c.query(sql,p))[0];const [row]=await run('SELECT * FROM worksheet_attempts WHERE id=? FOR UPDATE',[id]);if(!row)throw notFound();
  if(row.status!=='pending_review')throw badRequest('Bài này không còn chờ chấm.');
  const results=json(row.results),manual=results.filter(r=>r.correct===null);
  if(new Set(marks.map(m=>m.id)).size!==manual.length||marks.length!==manual.length||manual.some(r=>!marks.some(m=>m.id===r.id)))throw badRequest('Chấm đủ các câu tự luận.');
  for(const result of manual)Object.assign(result,marks.find(m=>m.id===result.id));
  const score=Math.round(results.filter(r=>r.correct).length/results.length*10000)/100;
  await run("UPDATE worksheet_attempts SET results=?,score=?,status='completed',reviewed_by=?,reviewed_at=CURRENT_TIMESTAMP(3) WHERE id=?",[JSON.stringify(results),score,admin,id]);return {saved:true,score};
 });
}
