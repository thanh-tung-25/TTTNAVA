import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {query,withTransaction} from '../config/db.js';
import {AppError,badRequest,forbidden,notFound} from '../utils/errors.js';
import {adminScopeOf} from '../utils/admin-permissions.js';
import {studentVisibleCondition} from '../utils/student-visibility.js';
import {writeAdminAudit} from './admin-audit.js';
import {requireCourse} from './course-service.js';
import {txRun,sourceItems,insertLearningRun,runLink,json} from './student-experience.js';

async function staffCourse(actor,courseId){
 const scope=adminScopeOf(actor),[course]=await query('SELECT * FROM courses WHERE id=?',[courseId]);if(!scope)throw forbidden();if(!course)throw notFound();if(scope!=='super'&&scope!==course.kind)throw forbidden('Khóa học không thuộc phạm vi quản lý.');return course;
}
async function ownedAssignment(actor,id){
 z.uuid().parse(id);const [row]=await query('SELECT * FROM study_assignments WHERE id=?',[id]);if(!row)throw notFound();await staffCourse(actor,row.course_id);if(adminScopeOf(actor)!=='super'&&row.creator_id!==actor.id)throw notFound();return row;
}
export async function staffAssignmentCourses(actor){
 const scope=adminScopeOf(actor);if(!scope)throw forbidden();return query('SELECT id,title,kind,level FROM courses'+(scope==='super'?'':' WHERE kind=?')+' ORDER BY kind,level',scope==='super'?[]:[scope]);
}
export async function assignmentChoices(actor,courseId){
 const course=await staffCourse(actor,courseId);
 const items=course.kind==='chinese'?await query("SELECT s.id,s.title AS name FROM chinese_sets s JOIN chinese_lessons l ON l.id=s.lesson_id WHERE l.level_id=? AND s.status='published' AND l.status='published' ORDER BY l.position,s.position",[course.level]):await query('SELECT id,name FROM topics WHERE grade=? ORDER BY subject_id,sort_order',[course.level]);
 const students=await query(`SELECT p.id,p.username,p.display_name FROM profiles p JOIN course_enrollments e ON e.student_id=p.id WHERE p.role='student' AND p.deleted_at IS NULL AND e.course_id=? AND e.revoked_at IS NULL AND e.starts_at<=CURRENT_TIMESTAMP(3) AND (e.expires_at IS NULL OR e.expires_at>CURRENT_TIMESTAMP(3)) AND ${studentVisibleCondition(actor,'p')} ORDER BY p.username LIMIT 500`,[courseId]);return {items,students};
}
export async function studentExperienceMetrics(actor,courseId){
 await staffCourse(actor,courseId);const students=await query(`SELECT p.id FROM profiles p JOIN course_enrollments e ON e.student_id=p.id WHERE p.role='student' AND p.account_kind='student' AND p.deleted_at IS NULL AND e.course_id=? AND e.revoked_at IS NULL AND e.starts_at<=CURRENT_TIMESTAMP(3) AND (e.expires_at IS NULL OR e.expires_at>CURRENT_TIMESTAMP(3)) AND ${studentVisibleCondition(actor,'p')}`,[courseId]);
 if(!students.length)return {enrolled:0,activated:0,weeklyActive:0,returning:0,repaired:0};
 const allowed=new Set(students.map(s=>s.id)),since=new Date(Date.now()-7*86400000),runs=await query('SELECT profile_id,created_at,status FROM learning_runs WHERE course_id=?',[courseId]),events=await query('SELECT profile_id,details_json FROM learning_events WHERE course_id=? AND created_at>=?',[courseId,since]);
 const visible=runs.filter(r=>allowed.has(r.profile_id)),active=new Set(visible.filter(r=>new Date(r.created_at)>=since).map(r=>r.profile_id)),previous=new Set(visible.filter(r=>new Date(r.created_at)<since).map(r=>r.profile_id));
 return {enrolled:allowed.size,activated:new Set(visible.map(r=>r.profile_id)).size,weeklyActive:active.size,returning:[...active].filter(id=>previous.has(id)).length,repaired:events.filter(e=>allowed.has(e.profile_id)).reduce((n,e)=>n+Number(json(e.details_json).repaired||0),0)};
}
export async function createAssignment(actor,body){
 const d=z.object({courseId:z.string().max(32),title:z.string().trim().min(3).max(120),description:z.string().trim().max(5000).default(''),kind:z.enum(['quiz','writing']),itemId:z.string().max(60).nullable().default(null),questionCount:z.union([z.literal(5),z.literal(10),z.literal(15)]).default(5),dueAt:z.iso.datetime().nullable().default(null),studentIds:z.array(z.uuid()).min(1).max(100)}).strict().parse(body);
 const course=await staffCourse(actor,d.courseId),choices=await assignmentChoices(actor,d.courseId);
 if(d.itemId&&!choices.items.some(i=>i.id===d.itemId))throw badRequest('Bài không thuộc khóa học.');
 const allowed=new Set(choices.students.map(s=>s.id));if(d.studentIds.some(id=>!allowed.has(id)))throw notFound();
 if(d.kind==='quiz'&&!d.itemId)throw badRequest('Chọn bài học để giao câu hỏi đúng nội dung.');
 if(d.kind==='quiz'&&(await sourceItems(d.studentIds[0],d.courseId,{itemId:d.itemId,count:d.questionCount})).length<d.questionCount)throw badRequest('Bài chưa đủ số câu đã xuất bản. Hãy chọn số câu ít hơn hoặc bổ sung câu hỏi.');
 if(d.dueAt&&new Date(d.dueAt)<=new Date())throw badRequest('Hạn hoàn thành phải ở tương lai.');
 const id=randomUUID();await withTransaction(async c=>{const run=txRun(c);
  await run('INSERT INTO study_assignments(id,creator_id,course_id,title,description,assignment_kind,topic_id,set_id,question_count,due_at) VALUES (?,?,?,?,?,?,?,?,?,?)',[id,actor.id,d.courseId,d.title,d.description,d.kind,course.kind==='chinese'?null:d.itemId,course.kind==='chinese'?d.itemId:null,d.questionCount,d.dueAt?new Date(d.dueAt):null]);
  for(const student of [...new Set(d.studentIds)])await run('INSERT INTO study_assignment_members(assignment_id,student_id) VALUES (?,?)',[id,student]);
  await writeAdminAudit(actor,'assignment.create','assignment',id,{courseId:d.courseId,students:new Set(d.studentIds).size},run);
 });return {id};
}
export async function staffAssignments(actor){
 const scope=adminScopeOf(actor);if(!scope)throw forbidden();
 return query(`SELECT a.id,a.title,a.assignment_kind,a.due_at,c.title AS course_title,COUNT(m.student_id) total,COALESCE(SUM(CASE WHEN m.submitted_at IS NOT NULL OR r.status='finished' THEN 1 ELSE 0 END),0) completed FROM study_assignments a JOIN courses c ON c.id=a.course_id LEFT JOIN study_assignment_members m ON m.assignment_id=a.id LEFT JOIN learning_runs r ON r.id=m.run_id ${scope==='super'?'':'WHERE a.creator_id=? AND c.kind=?'} GROUP BY a.id,a.title,a.assignment_kind,a.due_at,c.title,a.created_at ORDER BY a.created_at DESC LIMIT 100`,scope==='super'?[]:[actor.id,scope]);
}
export async function staffAssignmentDetail(actor,id){
 const assignment=await ownedAssignment(actor,id);const students=await query(`SELECT p.id,p.display_name,p.username,m.draft_text,m.submitted_at,m.feedback,m.teacher_score,m.reviewed_at,m.run_id,r.status AS run_status,r.answers_json,r.items_json FROM study_assignment_members m JOIN profiles p ON p.id=m.student_id LEFT JOIN learning_runs r ON r.id=m.run_id WHERE m.assignment_id=? AND p.deleted_at IS NULL AND ${studentVisibleCondition(actor,'p')} ORDER BY p.username`,[id]);
 return {assignment,students:students.map(({answers_json,items_json,...r})=>({...r,draft_text:r.submitted_at?r.draft_text:null,score:r.run_status==='finished'?Math.round(Object.values(typeof answers_json==='string'?JSON.parse(answers_json):answers_json||{}).filter(a=>a.correct).length/Math.max(1,(typeof items_json==='string'?JSON.parse(items_json):items_json||[]).length)*100):null}))};
}
export async function reviewAssignment(actor,id,studentId,body){
 await ownedAssignment(actor,id);z.uuid().parse(studentId);const d=z.object({feedback:z.string().trim().min(1).max(4000),score:z.number().int().min(0).max(100).nullable()}).strict().parse(body);
 const detail=await staffAssignmentDetail(actor,id),student=detail.students.find(s=>s.id===studentId);if(!student)throw notFound();if(!student.submitted_at&&student.run_status!=='finished')throw badRequest('Học sinh chưa nộp bài.');
 await withTransaction(async c=>{const run=txRun(c);await run('UPDATE study_assignment_members SET feedback=?,teacher_score=?,reviewed_at=? WHERE assignment_id=? AND student_id=?',[d.feedback,d.score,new Date(),id,studentId]);await writeAdminAudit(actor,'assignment.review','assignment',id,{studentId},run);});return {reviewed:true};
}
export async function studentAssignments(user,courseId){
 await requireCourse(user,courseId);return query('SELECT a.id,a.title,a.description,a.assignment_kind,a.due_at,m.run_id,m.submitted_at,m.feedback,m.teacher_score,m.reviewed_at,r.status AS run_status FROM study_assignments a JOIN study_assignment_members m ON m.assignment_id=a.id LEFT JOIN learning_runs r ON r.id=m.run_id WHERE m.student_id=? AND a.course_id=? ORDER BY a.created_at DESC LIMIT 100',[user,courseId]);
}
async function memberAssignment(user,id){z.uuid().parse(id);const [row]=await query('SELECT a.*,m.run_id,m.draft_text,m.draft_revision,m.submitted_at,m.feedback,m.teacher_score FROM study_assignments a JOIN study_assignment_members m ON m.assignment_id=a.id WHERE a.id=? AND m.student_id=?',[id,user]);if(!row)throw notFound();await requireCourse(user,row.course_id);return row;}
export async function studentAssignment(user,id){return memberAssignment(user,id);}
export async function startAssignment(user,id){
 const a=await memberAssignment(user,id);if(a.assignment_kind!=='quiz')throw badRequest('Đây là bài viết.');if(a.run_id)return {href:runLink(a.run_id)};
 const items=await sourceItems(user,a.course_id,{itemId:a.topic_id||a.set_id,count:a.question_count});if(items.length<Number(a.question_count))throw badRequest('Bài chưa đủ câu đã xuất bản theo yêu cầu. Hãy báo giáo viên bổ sung.');
 return withTransaction(async c=>{const run=txRun(c),[member]=await run('SELECT run_id FROM study_assignment_members WHERE assignment_id=? AND student_id=? FOR UPDATE',[id,user]);if(member.run_id)return {href:runLink(member.run_id)};
  const runId=await insertLearningRun(run,user,a.course_id,items,'assignment',a.title);await run('UPDATE study_assignment_members SET run_id=? WHERE assignment_id=? AND student_id=?',[runId,id,user]);return {href:runLink(runId)};
 });
}
export async function submitWriting(user,id,body){
 const d=z.object({text:z.string().max(20000),revision:z.number().int().min(0),submit:z.boolean().default(false)}).strict().parse(body),a=await memberAssignment(user,id);if(a.assignment_kind!=='writing')throw badRequest('Bài này được nộp qua phần câu hỏi.');if(a.submitted_at)throw badRequest('Bài đã nộp; bạn có thể đọc phản hồi của giáo viên.');if(d.submit&&d.text.trim().length<10)throw badRequest('Bài viết cần ít nhất 10 ký tự.');
 const result=await query('UPDATE study_assignment_members SET draft_text=?,submitted_at=?,draft_revision=draft_revision+1 WHERE assignment_id=? AND student_id=? AND submitted_at IS NULL AND draft_revision=?',[d.text,d.submit?new Date():null,id,user,d.revision]);
 if(!result.affectedRows)throw new AppError(409,'WRITING_REVISION_CONFLICT','Bài đã thay đổi ở thiết bị khác. Hãy giữ lại nội dung đang viết và mở lại bài.');return {saved:true,submitted:d.submit,revision:d.revision+1};
}
