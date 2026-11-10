import {query,dialectSql} from '../config/db.js';
import {requireCourse} from './course-service.js';
import {studentCatalog} from './course-chinese-view.js';
import {json} from '../repositories/chinese.js';
import {familyReport} from './learning-support.js';
import {z} from 'zod';
import {parse} from '../validators/chinese.js';

export async function searchLearning(user,courseId,value){
 const term=parse(z.string().trim().min(1).max(80),value).normalize('NFC').toLocaleLowerCase('vi');
 const course=await requireCourse(user,courseId),results=[];
 if(course.kind==='chinese'){
  const catalog=await studentCatalog(user,courseId);
  for(const lesson of catalog.lessons){if(lesson.title.toLocaleLowerCase('vi').includes(term))results.push({title:lesson.title,detail:'Bài học HSK'+lesson.level_id,href:'/pages/student/chinese/?'+new URLSearchParams({level:lesson.level_id,lesson:lesson.id})});}
  const rows=await query("SELECT i.id,i.set_id,i.data,l.title FROM chinese_items i JOIN chinese_sets s ON s.id=i.set_id JOIN chinese_lessons l ON l.id=s.lesson_id WHERE i.active=1 AND i.kind='vocabulary' AND s.status='published' AND l.status='published' AND l.level_id=? ORDER BY l.position,i.position LIMIT 10000",[course.level]);
  const normalize=s=>String(s||'').normalize('NFD').replace(/\p{M}/gu,'').toLocaleLowerCase('vi');
  for(const row of rows){const d=json(row.data);if([d.hanzi,d.pinyin,d.meaning].some(v=>normalize(v).includes(normalize(term))))results.push({title:d.hanzi+' · '+(d.pinyin||'')+' · '+d.meaning,detail:row.title,href:'/pages/student/chinese/?'+new URLSearchParams({set:row.set_id,mode:'words',word:row.id})});if(results.length>=100)break;}
 }else{
  const rows=await query('SELECT id,name,subject_id FROM topics WHERE grade=? ORDER BY sort_order,id',[course.level]);
  for(const row of rows)if(row.name.toLocaleLowerCase('vi').includes(term))results.push({title:row.name,detail:row.subject_id,href:'/pages/student/practice/?'+new URLSearchParams({topic:row.id,subject:row.subject_id})});
  const questions=await query("SELECT q.prompt,t.id,t.name,t.subject_id FROM questions q JOIN topics t ON t.id=q.topic_id WHERE t.grade=? AND q.status='published' ORDER BY t.sort_order,q.id LIMIT 10000",[course.level]);
  for(const q of questions)if(q.prompt.toLocaleLowerCase('vi').includes(term))results.push({title:q.prompt,detail:q.name,href:'/pages/student/practice/?'+new URLSearchParams({topic:q.id,subject:q.subject_id})});
 }
 return results.slice(0,100);
}
export async function wrongNotebook(user,courseId){
 const course=await requireCourse(user,courseId),rows=[],latest=new Map();
 if(course.kind==='chinese'){
  const allowed=await studentCatalog(user,courseId),ids=new Set(allowed.sets.map(s=>s.id));
  const attempts=await query('SELECT id,snapshot,answers,finished_at,started_at FROM chinese_attempts WHERE student_id=? AND abandoned_at IS NULL ORDER BY started_at DESC LIMIT 300',[user]);
  const seen=new Set();
  for(const a of attempts){const answers=json(a.answers);for(const i of json(a.snapshot).items){const answer=answers[i.id];if(!ids.has(i.set_id)||!answer?.locked||seen.has(i.id))continue;seen.add(i.id);latest.set(i.id,new Date(a.finished_at||a.started_at).getTime());if(answer.correct)continue;rows.push({id:i.id,title:i.data.prompt,explanation:i.data.explanation||'',answer:i.data.accepted.join(' / '),selected:answer.value,href:'/pages/student/chinese/?attempt='+a.id,set_id:i.set_id,kind:'chinese'});}}
 }else{
  const attempts=await query("SELECT a.question_id,a.is_correct,a.answered_at event_at,p.id,p.topic_id,q.prompt,t.subject_id,qa.explanation FROM practice_answers a JOIN practice_sessions p ON p.id=a.session_id JOIN questions q ON q.id=a.question_id JOIN topics t ON t.id=q.topic_id JOIN question_answers qa ON qa.question_id=q.id WHERE p.student_id=? AND t.grade=? AND q.status='published' ORDER BY a.answered_at DESC LIMIT 1000",[user,course.level]);
  // Exam answers are shown only after submission; never reveal an active exam.
  const exams=await query('SELECT a.question_id,a.is_correct,e.submitted_at event_at,q.prompt,qa.explanation,e.id,t.subject_id FROM exam_answers a JOIN exam_attempts e ON e.id=a.attempt_id JOIN questions q ON q.id=a.question_id JOIN topics t ON t.id=q.topic_id JOIN question_answers qa ON qa.question_id=q.id WHERE e.student_id=? AND t.grade=? AND e.submitted_at IS NOT NULL ORDER BY e.submitted_at DESC LIMIT 1000',[user,course.level]);
  const challenges=await query("SELECT a.question_id,a.is_correct,a.answered_at event_at,q.prompt,qa.explanation,c.id,c.subject_id FROM challenge_answers a JOIN challenges c ON c.id=a.challenge_id JOIN questions q ON q.id=a.question_id JOIN question_answers qa ON qa.question_id=q.id WHERE a.profile_id=? AND c.grade=? AND c.status='finished' ORDER BY a.answered_at DESC LIMIT 1000",[user,course.level]);
  const events=[...attempts.map(a=>({...a,kind:'primary',href:'/pages/student/practice/?'+new URLSearchParams({session:a.id,subject:a.subject_id})})),...exams.map(a=>({...a,kind:'exam',href:'/pages/student/exam/?attempt='+a.id+'&subject='+a.subject_id})),...challenges.map(a=>({...a,kind:'challenge',href:'/pages/student/challenge/?id='+a.id}))].sort((a,b)=>new Date(b.event_at)-new Date(a.event_at));
  const seen=new Set();for(const a of events){if(seen.has(a.question_id))continue;seen.add(a.question_id);latest.set(a.question_id,new Date(a.event_at).getTime());if(a.is_correct)continue;rows.push({id:a.question_id,title:a.prompt,explanation:a.explanation||'',href:a.href,topic_id:a.topic_id,kind:a.kind});}
  const sheets=await query("SELECT id,worksheet_id,snapshot,results,submitted_at FROM worksheet_attempts WHERE student_id=? AND grade=? AND status='completed' ORDER BY submitted_at DESC LIMIT 200",[user,course.level]);
  const sheetSeen=new Set();for(const sheet of sheets)for(const result of json(sheet.results)||[]){const key=sheet.worksheet_id+':'+result.id;if(sheetSeen.has(key))continue;sheetSeen.add(key);if(result.correct!==false)continue;const item=json(sheet.snapshot).items.find(i=>i.id===result.id);if(item)rows.push({id:key,title:item.prompt,answer:result.expected,explanation:result.explanation||'',href:'/pages/student/worksheets/?attempt='+sheet.id,kind:'worksheet'});}
 }
 const guided=await query('SELECT id,items_json,answers_json,created_at FROM learning_runs WHERE profile_id=? AND course_id=? ORDER BY created_at DESC LIMIT 500',[user,courseId]);
 const result=new Map(rows.map(r=>[r.id,r]));
 for(const run of guided)for(const item of json(run.items_json)||[]){const answer=json(run.answers_json)[item.id];if(!answer)continue;const at=new Date(answer.at||run.created_at).getTime();if((latest.get(item.id)||0)>at)continue;latest.set(item.id,at);if(answer.correct){result.delete(item.id);continue;}
 result.set(item.id,{id:item.id,title:item.prompt,explanation:item.explanation||'',topic_id:course.kind==='chinese'?undefined:item.skill,set_id:course.kind==='chinese'?item.skill:undefined,kind:course.kind==='chinese'?'chinese':'guided',href:'/pages/student/session/?run='+encodeURIComponent(run.id)});
 }
 return [...result.values()].slice(0,200);
}
export async function weeklyProgress(user,courseId){
 const report=await familyReport(user,courseId);
 const [goal]=await query('SELECT target_days FROM learning_goals WHERE student_id=? AND course_id=?',[user,courseId]);
 return {days:report.summary.active_days,completed:report.summary.completed,target:goal?.target_days||3,since:report.since,day:report.day};
}
export async function saveGoal(user,courseId,body){
 await requireCourse(user,courseId);const d=parse(z.object({target:z.number().int().min(1).max(7)}),body);
 await query(dialectSql('INSERT INTO learning_goals(student_id,course_id,target_days) VALUES (?,?,?) ON DUPLICATE KEY UPDATE target_days=VALUES(target_days)','INSERT INTO learning_goals(student_id,course_id,target_days) VALUES (?,?,?) ON CONFLICT(student_id,course_id) DO UPDATE SET target_days=EXCLUDED.target_days'),[user,courseId,d.target]);return d;
}
export async function dueReminder(user,courseId){
 const course=await requireCourse(user,courseId);if(course.kind!=='chinese')return {due:0};
 const [row]=await query("SELECT COUNT(*) total FROM chinese_reviews r JOIN chinese_items i ON i.id=r.item_id JOIN chinese_sets s ON s.id=i.set_id JOIN chinese_lessons l ON l.id=s.lesson_id WHERE r.student_id=? AND r.next_review<=CURRENT_TIMESTAMP AND i.active=1 AND i.kind='vocabulary' AND s.status='published' AND l.status='published' AND l.level_id=?",[user,course.level]);return {due:Number(row.total)};
}
