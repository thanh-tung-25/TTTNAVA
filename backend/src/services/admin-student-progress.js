import {query} from '../config/db.js';
import {AppError,notFound} from '../utils/errors.js';
import {adminScopeOf,studentProgramCondition} from '../utils/admin-permissions.js';
import {studentVisibleCondition} from '../utils/student-visibility.js';
import {catalog} from '../repositories/chinese.js';
import {studyGroupRows} from './school-study.js';
import {buildSchoolGroups} from './school-study-groups.js';

const schoolPrograms=['primary','secondary','highschool'];
const percent=(done,total)=>total?Math.floor(Math.min(done,total)*100/total):null;
function hasAnswer(answer){return answer!=null&&(typeof answer!=='object'||answer.locked||answer.value!==undefined&&String(answer.value).trim()!=='');}

export async function getAdminStudentLearningProgress(viewer,studentId,program='chinese'){
 const scope=adminScopeOf(viewer);
 if(!['chinese',...schoolPrograms].includes(program)||!(scope==='super'||scope===program))throw new AppError(403,'ADMIN_SCOPE_FORBIDDEN','This student is outside your management scope.');
 const [student]=await query(`SELECT p.id,p.display_name,p.username,p.grade FROM profiles p WHERE p.id=? AND p.role='student' AND p.deleted_at IS NULL AND ${studentVisibleCondition(viewer,'p')} AND ${studentProgramCondition('p',program)}`,[studentId]);
 if(!student)throw notFound('Student was not found in your management scope.');
 if(program==='chinese'){
  const data=await catalog(false,studentId),lessons=data.lesson_progress.map(lesson=>({
   lessonId:lesson.lessonId,title:lesson.title,level:Number(data.lessons.find(row=>row.id===lesson.lessonId)?.level_id||1),percent:lesson.percent,updatedAt:lesson.updatedAt,
   groups:lesson.groups.map(group=>({id:group.id,title:group.title,available:group.available,percent:group.percent,
    modes:group.modes.map(mode=>({id:mode.id,title:mode.title,available:mode.available,total:mode.total,done:mode.done,percent:mode.percent,
     ...(mode.children?{children:mode.children.map(child=>({title:child.title,available:child.available,total:child.total,done:child.done,percent:child.percent}))}:{})}))}))
  }));
  const active=lessons.filter(lesson=>lesson.percent!==null),overallPercent=active.length?Math.round(active.reduce((sum,lesson)=>sum+lesson.percent,0)/active.length):null;
  return {student:{id:student.id,displayName:student.display_name,username:student.username},course:{id:'chinese',kind:'chinese',title:'Tiếng Trung'},overallPercent,lessons};
 }

 const [course]=await query(`SELECT c.id,c.title,c.level FROM courses c WHERE c.kind=? AND (
  EXISTS(SELECT 1 FROM course_enrollments e WHERE e.student_id=? AND e.course_id=c.id)
  OR EXISTS(SELECT 1 FROM course_orders o WHERE o.student_id=? AND o.course_id=c.id)
  OR EXISTS(SELECT 1 FROM course_free_grants g WHERE g.student_id=? AND g.course_id=c.id)
  OR c.level=?) ORDER BY CASE WHEN c.level=? THEN 0 ELSE 1 END,c.level LIMIT 1`,[program,studentId,studentId,studentId,Number(student.grade)||0,Number(student.grade)||0]);
 if(!course)throw notFound('Course was not found.');
 const grade=Number(course.level),courseId=course.id;
 const groups=buildSchoolGroups(await studyGroupRows(grade));
 const [runs,questionRows]=await Promise.all([
  query('SELECT items_json,answers_json FROM learning_runs WHERE profile_id=? AND course_id=?',[studentId,courseId]),
  query(`SELECT q.id,t.id topic_id FROM questions q JOIN topics t ON t.id=q.topic_id WHERE t.grade=? AND q.status='published'`,[grade])
 ]);
 const answered=new Set();
 for(const run of runs){const items=typeof run.items_json==='string'?JSON.parse(run.items_json):run.items_json,answers=typeof run.answers_json==='string'?JSON.parse(run.answers_json):run.answers_json;
  for(const item of items||[])if(hasAnswer(answers?.[item.id]))answered.add(item.id);
 }
 const byTopic=new Map();for(const row of questionRows){if(!byTopic.has(row.topic_id))byTopic.set(row.topic_id,new Set());byTopic.get(row.topic_id).add(row.id);}
 let courseDone=0,courseTotal=0;
 const lessons=groups.map(group=>{
  const topics=new Set(group.parts.map(part=>part.topicId)),ids=new Set([...topics].flatMap(topic=>[...(byTopic.get(topic)||[])])),done=[...ids].filter(id=>answered.has(id)).length,total=ids.size,pct=percent(done,total);
  courseDone+=done;courseTotal+=total;
  return {lessonId:group.id,title:group.title,level:grade,percent:pct,groups:[{id:group.id,title:group.title,available:total>0,percent:pct,modes:[{id:'questions',title:'Câu hỏi đã làm',available:total>0,total,done,percent:pct}]}]};
 });
 return {student:{id:student.id,displayName:student.display_name,username:student.username},course:{id:courseId,kind:program,title:course.title},overallPercent:percent(courseDone,courseTotal),lessons};
}
