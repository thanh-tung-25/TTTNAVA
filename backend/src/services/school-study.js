import {query,withTransaction,dialectSql} from '../config/db.js';
import {AppError,notFound,badRequest} from '../utils/errors.js';
import {seededShuffle} from '../utils/hash.js';
import {SCHOOL_PROGRAMS} from '../utils/school-programs.js';
import {schoolSubjectName} from '../utils/school-subjects.js';
import {adminScopeOf} from '../utils/admin-permissions.js';
import {requireCourse} from './course-service.js';
import {buildSchoolGroups} from './school-study-groups.js';
import {loadQuestionsByIds} from './question-service.js';
import {activeStudent,insertLearningRun,txRun,learningRunState} from './student-experience.js';
import {z} from 'zod';
import {guideRevision,visibleGuideContent,createSchoolGuideWriter} from './school-guide-authoring.js';

const optionSignature=dialectSql("(SELECT GROUP_CONCAT(MD5(o.option_text) ORDER BY o.option_text SEPARATOR '|') FROM question_options o WHERE o.question_id=q.id)","(SELECT STRING_AGG(MD5(o.option_text),'|' ORDER BY o.option_text) FROM question_options o WHERE o.question_id=q.id)");
const signature=`MD5(CONCAT_WS('|',q.type,TRIM(q.prompt),COALESCE(q.image_url,''),COALESCE(${optionSignature},'')))`;
async function courseFor(user,id,run=query){
 const course=user.role==='admin'?(await run('SELECT * FROM courses WHERE id=?',[id]))[0]:await requireCourse(user.id,id,run);
 if(!course||!SCHOOL_PROGRAMS.includes(course.kind))throw badRequest('Bạn chọn một khóa học phổ thông trước nhé.');
 if(user.role==='admin'&&!['super',course.kind].includes(adminScopeOf(user)))throw new AppError(403,'ADMIN_SCOPE_FORBIDDEN','Khóa học thuộc khối khác.');
 return course;
}
export async function studyGroupRows(grade,run=query,yearId){
 const [year]=await run('SELECT id FROM school_years'+(yearId?' WHERE id=?':'')+' ORDER BY is_active DESC,sort_order,id LIMIT 1',yearId?[yearId]:[]);if(!year)return [];
 return run(`SELECT c.school_year_id year_id,c.grade,c.subject_id,c.id chapter_id,c.name chapter_name,c.semester,l.id lesson_id,l.name lesson_name,l.topic_id
 FROM curriculum_chapters c JOIN curriculum_lessons l ON l.chapter_id=c.id WHERE c.school_year_id=? AND c.grade=? AND c.is_legacy=0
 ORDER BY c.subject_id,c.semester,c.sort_order,l.sort_order,l.id`,[year.id,grade]);
}
async function groupFor(user,courseId,id,yearId){
 const course=await courseFor(user,courseId),groups=buildSchoolGroups(await studyGroupRows(course.level,query,user.role==='admin'?yearId:undefined)),group=groups.find(group=>group.id===id);
 if(!group)throw notFound('Bài học không thuộc khóa đang chọn.');return {course,group};
}
async function bankFor(group,run=query){
 const ids=[...new Set(group.parts.map(part=>part.topicId))];if(!ids.length)return [];
 const rows=await run(`SELECT q.id,q.topic_id,${signature} fingerprint FROM questions q WHERE q.status='published' AND q.topic_id IN (${ids.map(()=>'?').join(',')}) ORDER BY q.id`,ids);
 return [...new Map(rows.map(row=>[row.fingerprint,row])).values()];
}
export async function schoolStudyCatalog(user,courseId,yearId){
 const course=await courseFor(user,courseId),rows=await studyGroupRows(course.level,query,user.role==='admin'?yearId:undefined),groups=buildSchoolGroups(rows);
 const groupedSql="CASE WHEN c.grade>=6 AND c.subject_id IN ('tieng-anh','tieng-viet') THEN c.id ELSE l.id END";
 const counts=await query(`SELECT ${groupedSql} group_id,COUNT(DISTINCT CASE WHEN q.id IS NOT NULL THEN ${signature} END) total
 FROM curriculum_chapters c JOIN curriculum_lessons l ON l.chapter_id=c.id
 LEFT JOIN questions q ON q.topic_id=l.topic_id AND q.status='published' WHERE c.grade=? AND c.school_year_id=? AND c.is_legacy=0 GROUP BY ${groupedSql}`,[course.level,rows[0]?.year_id||'']);
 const sizes=['summary','formulas','examples'].map(key=>dialectSql(`COALESCE(JSON_LENGTH(JSON_EXTRACT(content_json,'$.${key}')),0) ${key}_count`,`COALESCE(jsonb_array_length(content_json->'${key}'),0) ${key}_count`)).join(',');
 const guides=await query('SELECT group_id,status,'+sizes+' FROM school_study_guides'),guideMap=new Map(guides.map(guide=>[guide.group_id,guide]));
 const totals=new Map(counts.map(row=>[row.group_id,Number(row.total)]));
 const progress=user.role==='admin'?[]:await query('SELECT x.group_id,x.stage_index,r.id,r.status,r.created_at FROM school_quiz_links x JOIN learning_runs r ON r.id=x.run_id WHERE r.profile_id=? AND r.course_id=? ORDER BY r.created_at DESC LIMIT 5000',[user.id,courseId]);
 const legacy=user.role==='admin'?[]:await query("SELECT p.topic_id,COUNT(*) total FROM practice_sessions p JOIN topics t ON t.id=p.topic_id WHERE p.student_id=? AND t.grade=? AND p.status='finished' GROUP BY p.topic_id",[user.id,course.level]);
 const skill=user.role==='admin'?[]:await query('SELECT skill_key,attempts,correct_count FROM learning_skill_state WHERE profile_id=? AND course_id=?',[user.id,courseId]);
 return {course:{id:course.id,title:course.title,kind:course.kind,level:Number(course.level)},subjects:[...new Set(rows.map(row=>row.subject_id))].map(id=>({id,name:schoolSubjectName(id,course.level)})),groups:groups.map(group=>{
  const history=progress.filter(row=>row.group_id===group.id),topics=new Set(group.parts.map(part=>part.topicId));
  const completed=[...new Set(history.filter(row=>row.status==='finished').map(row=>Number(row.stage_index)))];
  const questionCount=totals.get(group.id)||0,skillAttempts=skill.filter(row=>topics.has(row.skill_key)).reduce((n,row)=>n+Number(row.attempts),0);
  const guide=guideMap.get(group.id);
  return {...group,questionCount,hasGuide:guide?.status==='published',...(user.role==='admin'?{guideStatus:guide?.status||null,knowledgeCount:Number(guide?.summary_count||0)+Number(guide?.formulas_count||0),exampleCount:Number(guide?.examples_count||0)}:{}),stages:questionCount>=20?Math.ceil(questionCount/20):0,completedStages:completed,open:history.find(row=>row.status==='open')||null,legacyCompleted:legacy.filter(row=>topics.has(row.topic_id)).reduce((n,row)=>n+Number(row.total),0),skillAttempts};
 })};
}
export async function schoolStudyGuide(user,courseId,id,yearId){
 const {group}=await groupFor(user,courseId,id,yearId),[row]=await query('SELECT content_json,status FROM school_study_guides WHERE group_id=?',[id]);
 if(user.role!=='admin'&&(!row||row.status!=='published'))throw notFound('Bài đang được bổ sung kiến thức.');
 return {group,content:visibleGuideContent(row?.content_json),...(user.role==='admin'?{status:row?.status||'draft',exists:Boolean(row),revision:guideRevision(row)}:{})};
}
export async function startSchoolQuiz(user,courseId,id,body={}){
 const stage=z.number().int().min(1).max(5000).parse(body.stage??1),{course,group}=await groupFor(user,courseId,id),pool=await bankFor(group);
 const [guide]=await query("SELECT group_id FROM school_study_guides WHERE group_id=? AND status='published'",[id]);if(!guide)throw notFound('Bài đang được bổ sung kiến thức.');
 if(pool.length<20)throw new AppError(409,'NOT_ENOUGH_QUESTIONS','Bài này chưa đủ 20 câu khác nhau. Bạn có thể học kiến thức và ví dụ trước.');
 const stages=Math.ceil(pool.length/20);if(stage>stages)throw badRequest('Chặng quiz không có trong bài này.');
 const ordered=seededShuffle(pool,'school-stage|'+group.id),slice=ordered.slice((stage-1)*20,stage*20),chosen=new Set(slice.map(row=>row.id));
 for(const row of ordered)if(slice.length<20&&!chosen.has(row.id)){slice.push(row);chosen.add(row.id);}
 const questions=await loadQuestionsByIds(slice.map(row=>row.id));
 if(questions.length!==20||questions.some(question=>question.status!=='published'))throw new AppError(409,'CONTENT_CHANGED','Nội dung vừa được cập nhật. Bạn tải lại bài học nhé.');
 const items=questions.map(question=>({id:question.id,type:question.type,prompt:question.prompt,imageUrl:question.image_url||null,options:question.options,answer:question.answer,explanation:question.explanation,skill:question.topic_id,label:group.title,subject:group.subjectId}));
 const runId=await withTransaction(async connection=>{
  const run=txRun(connection);await activeStudent(user.id,run,true);await requireCourse(user.id,course.id,run);
  const [open]=await run("SELECT r.id FROM school_quiz_links x JOIN learning_runs r ON r.id=x.run_id WHERE r.profile_id=? AND r.course_id=? AND x.group_id=? AND x.stage_index=? AND r.status='open' ORDER BY r.created_at DESC LIMIT 1",[user.id,course.id,id,stage]);if(open)return open.id;
  const result=await insertLearningRun(run,user.id,course.id,seededShuffle(items,Date.now()+'|'+user.id),'daily',(group.title+' · Quiz 20 · Chặng '+stage).slice(0,160));
  await run('INSERT INTO school_quiz_links(run_id,group_id,stage_index) VALUES (?,?,?)',[result,id,stage]);return result;
 });
 return {id:runId,state:await learningRunState(user.id,runId),groupId:id,stage};
}
export async function schoolQuizState(user,courseId,runId){
 const [link]=await query('SELECT x.group_id,x.stage_index FROM school_quiz_links x JOIN learning_runs r ON r.id=x.run_id WHERE x.run_id=? AND r.profile_id=? AND r.course_id=?',[runId,user.id,courseId]);
 if(!link)throw notFound();return {id:runId,state:await learningRunState(user.id,runId),groupId:link.group_id,stage:Number(link.stage_index)};
}
export const updateSchoolGuide=createSchoolGuideWriter({withTransaction,resolveGroup:groupFor});
