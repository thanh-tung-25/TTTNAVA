import {query,withTransaction} from '../config/db.js';
import {AppError,notFound} from '../utils/errors.js';
import {parseJson} from '../utils/normalize.js';
import {schoolSubjectName} from '../utils/school-subjects.js';
import {schoolProgramForGrade} from '../utils/school-programs.js';
import {adminScopeOf} from '../utils/admin-permissions.js';
import {requireCourse} from './course-service.js';
import {sourceItems,insertLearningRun,txRun,activeStudent,runLink} from './student-experience.js';
import {z} from 'zod';

async function materialFor(user,id){
 const [row]=await query(`SELECT m.content_json,m.status,m.updated_at,l.id,l.name,l.topic_id,t.name topic_name,c.grade,c.subject_id,c.semester,c.name chapter_name,c.book_label
 FROM school_lesson_materials m JOIN curriculum_lessons l ON l.id=m.lesson_id JOIN topics t ON t.id=l.topic_id JOIN curriculum_chapters c ON c.id=l.chapter_id WHERE l.id=?`,[id]);
 if(!row)throw notFound('Chưa có nội dung cho bài học này.');
 if(user.role==='admin'){
  if(!['super',schoolProgramForGrade(row.grade)].includes(adminScopeOf(user)))throw new AppError(403,'ADMIN_SCOPE_FORBIDDEN','Bài học thuộc khối khác.');
 }else{await requireCourse(user.id,'grade-'+row.grade);if(row.status!=='published')throw notFound('Bài học đang được chuẩn bị.');}
 return row;
}
export async function schoolLesson(user,id){
 const row=await materialFor(user,id),content=parseJson(row.content_json)||{};
 const [count]=await query("SELECT COUNT(*) total FROM questions WHERE topic_id=? AND status='published'",[row.topic_id]);
 const neighbors=await query('SELECT l.id,t.name FROM curriculum_lessons l JOIN topics t ON t.id=l.topic_id JOIN school_lesson_materials m ON m.lesson_id=l.id AND m.status=\'published\' JOIN curriculum_chapters c ON c.id=l.chapter_id WHERE c.grade=? AND c.subject_id=? ORDER BY c.semester,c.sort_order,l.sort_order,l.id',[row.grade,row.subject_id]);
 const index=neighbors.findIndex(item=>item.id===id),{questions,...publicContent}=content;
 return {id,name:row.name,grade:Number(row.grade),subjectId:row.subject_id,subjectName:schoolSubjectName(row.subject_id,row.grade),semester:row.semester,chapterName:row.chapter_name,bookLabel:row.book_label,topicId:row.topic_id,content:publicContent,questionCount:Number(count.total),previous:neighbors[index-1]||null,next:neighbors[index+1]||null};
}
export async function startSchoolLesson(user,id){
 const row=await materialFor(user,id),courseId='grade-'+row.grade;
 const items=await sourceItems(user.id,courseId,{itemId:row.topic_id,count:10});
 const runId=await withTransaction(async connection=>{const run=txRun(connection);await activeStudent(user.id,run,true);await requireCourse(user.id,courseId,run);return insertLearningRun(run,user.id,courseId,items,'daily',row.topic_name.slice(0,160));});
 return {id:runId,href:runLink(runId)};
}
export async function updateSchoolLesson(user,id,body){
 const row=await materialFor(user,id);
 if(user.role!=='admin')throw new AppError(403,'FORBIDDEN','Chỉ quản trị viên được sửa bài giảng.');
 const data=z.object({objectives:z.array(z.string().trim().min(1).max(600)).min(1).max(12),sections:z.array(z.object({heading:z.string().trim().min(1).max(200),body:z.string().trim().min(1).max(20000)}).strict()).min(1).max(30),example:z.object({prompt:z.string().trim().min(1).max(10000),solution:z.string().trim().min(1).max(20000)}).strict()}).strict().parse(body);
 const content={...(parseJson(row.content_json)||{}),...data};
 await query('UPDATE school_lesson_materials SET content_json=?,updated_at=CURRENT_TIMESTAMP WHERE lesson_id=?',[JSON.stringify(content),id]);return {saved:true};
}
