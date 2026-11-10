import {query} from '../config/db.js';
import {requireCourse} from './course-service.js';
import {json} from '../repositories/chinese.js';
import {startPractice} from './practice-service.js';
import {getPracticeSession} from './practice-service.js';
import {badRequest} from '../utils/errors.js';
import {schoolSubjectName} from '../utils/school-subjects.js';

function dates(now=new Date()){
 const local=new Date(now.getTime()+7*3600000),day=local.toISOString().slice(0,10);
 return {day,today:new Date(day+'T00:00:00+07:00'),since:new Date(new Date(day+'T00:00:00+07:00').getTime()-6*86400000)};
}
export async function todayPlan(user,courseId){
 const course=await requireCourse(user,courseId),{day,today}=dates();
 if(course.kind==='chinese'){
  const sets=await query("SELECT s.id,s.title,l.title lesson_title,(SELECT COUNT(*) FROM chinese_items i WHERE i.set_id=s.id AND i.active=1 AND i.kind='vocabulary') words,(SELECT COUNT(*) FROM chinese_items i WHERE i.set_id=s.id AND i.active=1 AND i.kind='question') questions,(SELECT COUNT(*) FROM chinese_activities a WHERE a.lesson_id=l.id AND a.status='published') applied FROM chinese_sets s JOIN chinese_lessons l ON l.id=s.lesson_id WHERE l.level_id=? AND s.status='published' AND l.status='published' ORDER BY l.position,s.position,s.created_at",[course.level]);
  const due=await query("SELECT i.id,i.set_id,i.data FROM chinese_reviews r JOIN chinese_items i ON i.id=r.item_id JOIN chinese_sets s ON s.id=i.set_id JOIN chinese_lessons l ON l.id=s.lesson_id WHERE r.student_id=? AND i.active=1 AND i.kind='vocabulary' AND s.status='published' AND l.status='published' AND l.level_id=? AND r.next_review<=CURRENT_TIMESTAMP ORDER BY r.next_review,i.id LIMIT 5",[user,course.level]);
  let words=due;
  const firstWords=sets.find(s=>Number(s.words)>0);
  if(!words.length&&firstWords)words=await query("SELECT id,set_id,data FROM chinese_items WHERE set_id=? AND active=1 AND kind='vocabulary' ORDER BY position LIMIT 5",[firstWords.id]);
  const chosen=sets.find(s=>words.some(w=>w.set_id===s.id))||sets[0];
  return {day,course,kind:'chinese',minutes:10,words:words.map(w=>({id:w.id,hanzi:json(w.data).hanzi,meaning:json(w.data).meaning,href:'/pages/student/chinese/?'+new URLSearchParams({set:w.set_id,mode:'cards',word:w.id})})),activity:chosen?{title:chosen.lesson_title,href:'/pages/student/chinese/?'+new URLSearchParams({set:chosen.id,mode:chosen.applied?'apply':'cards'}),applied:!!chosen.applied}:null,reason:due.length?'Ôn các từ đã đến lịch, rồi vận dụng trong câu.':'Học một nhóm từ nhỏ, rồi luyện vận dụng.'};
 }
 const wrong=await query("SELECT q.topic_id,COUNT(*) wrong FROM practice_answers a JOIN practice_sessions p ON p.id=a.session_id JOIN questions q ON q.id=a.question_id JOIN topics t ON t.id=q.topic_id WHERE p.student_id=? AND a.is_correct=0 AND t.grade=? AND q.status='published' GROUP BY q.topic_id ORDER BY wrong DESC,q.topic_id",[user,course.level]);
 const topics=await query("SELECT t.id,t.name,t.subject_id,COUNT(q.id) total FROM topics t JOIN questions q ON q.topic_id=t.id AND q.status='published' WHERE t.grade=? GROUP BY t.id,t.name,t.subject_id HAVING COUNT(q.id)>=10 ORDER BY t.subject_id,t.sort_order,t.id",[course.level]);
 const topic=wrong.map(w=>topics.find(t=>t.id===w.topic_id)).find(Boolean)||topics[Number(day.replaceAll('-',''))%Math.max(1,topics.length)]||null;
 const recent=topic?await query("SELECT id,status,answered_count,correct_count,total_questions FROM practice_sessions WHERE student_id=? AND topic_id=? AND started_at>=? ORDER BY started_at DESC LIMIT 1",[user,topic.id,today]):[];
 return {day,course,kind:course.kind,minutes:10,topic:topic?{...topic,subject:schoolSubjectName(topic.subject_id,course.level)}:null,reason:topic&&wrong.some(w=>w.topic_id===topic.id)?'Ưu tiên chủ đề con từng làm sai; lượt luyện sẽ đưa câu cần ôn lên trước.':'Một lượt 10 câu vừa sức trong khóa đang học.',recent:recent[0]||null};
}
export async function startToday(user,courseId){
 const plan=await todayPlan(user,courseId);if(!['primary','secondary'].includes(plan.kind)||!plan.topic)throw badRequest('Chưa có đủ 10 câu trong khóa này để tạo lượt luyện.');
 let session;
 if(plan.recent?.status==='in_progress')session=await getPracticeSession(user,plan.recent.id);
 else{
  const wrong=await query("SELECT a.question_id,MAX(a.answered_at) last_wrong FROM practice_answers a JOIN practice_sessions p ON p.id=a.session_id JOIN questions q ON q.id=a.question_id WHERE p.student_id=? AND q.topic_id=? AND a.is_correct=0 AND q.status='published' GROUP BY a.question_id ORDER BY last_wrong DESC LIMIT 10",[user,plan.topic.id]);
  session=await startPractice(user,plan.topic.id,wrong.map(q=>q.question_id));
 }
 return {href:'/pages/student/practice/?'+new URLSearchParams({session:session.id,subject:plan.topic.subject_id})};
}
export async function familyReport(user,courseId){
 const course=await requireCourse(user,courseId),{day,since}=dates();let rows=[];
 if(['primary','secondary'].includes(course.kind)){
  const [practice,exams,worksheets,challenges]=await Promise.all([
   query('SELECT p.id,p.status,p.started_at,p.finished_at completed_at,p.correct_count correct,p.total_questions total,t.name title,t.subject_id FROM practice_sessions p JOIN topics t ON t.id=p.topic_id WHERE p.student_id=? AND t.grade=? AND p.started_at>=? ORDER BY p.started_at DESC LIMIT 1000',[user,course.level,since]),
   query('SELECT p.id,p.status,p.started_at,p.submitted_at completed_at,p.correct_count correct,p.total_questions total,t.name title,t.subject_id FROM exam_attempts p JOIN topics t ON t.id=p.topic_id WHERE p.student_id=? AND t.grade=? AND p.started_at>=? ORDER BY p.started_at DESC LIMIT 1000',[user,course.level,since]),
   query('SELECT a.id,a.status,a.started_at,a.submitted_at completed_at,a.score,w.title,w.subject_id FROM worksheet_attempts a JOIN worksheets w ON w.id=a.worksheet_id WHERE a.student_id=? AND a.grade=? AND a.started_at>=? ORDER BY a.started_at DESC LIMIT 1000',[user,course.level,since]),
   query("SELECT c.id,c.status,c.started_at,c.finished_at completed_at,t.name title,c.subject_id,COUNT(a.question_id) total,COALESCE(SUM(a.is_correct),0) correct FROM challenges c JOIN topics t ON t.id=c.topic_id LEFT JOIN challenge_answers a ON a.challenge_id=c.id AND a.profile_id=? WHERE (c.challenger_id=? OR c.opponent_id=?) AND c.grade=? AND c.started_at>=? GROUP BY c.id,c.status,c.started_at,c.finished_at,t.name,c.subject_id ORDER BY c.started_at DESC LIMIT 1000",[user,user,user,course.level,since])
  ]);
  rows=[...practice.map(r=>({...r,kind:'Luyện tập'})),...exams.map(r=>({...r,kind:'Thi thử'})),...worksheets.map(r=>({...r,kind:'Phiếu bài tập'})),...challenges.map(r=>({...r,kind:'Thách đấu'}))];
 }else{
  const attempts=await query('SELECT a.*,l.level_id FROM chinese_attempts a LEFT JOIN chinese_sets s ON s.id=a.set_id LEFT JOIN chinese_lessons l ON l.id=s.lesson_id WHERE a.student_id=? AND a.abandoned_at IS NULL AND a.started_at>=? ORDER BY a.started_at DESC LIMIT 1000',[user,since]);
  rows=attempts.filter(a=>a.level_id===Number(course.level)||(json(a.snapshot).course_ids||[]).includes(course.id)).map(a=>{const snapshot=json(a.snapshot),answers=Object.values(json(a.answers));return {id:a.id,kind:a.test_id?'Kiểm tra tiếng Trung':'Quiz tiếng Trung',title:snapshot.title,subject_id:'chinese',status:a.finished_at?'finished':'in_progress',started_at:a.started_at,completed_at:a.finished_at,correct:answers.filter(a=>a.locked&&a.correct).length,total:snapshot.items.length,score:a.score};});
 }
 const guided=await query('SELECT id,title,status,created_at,finished_at,items_json,answers_json FROM learning_runs WHERE profile_id=? AND course_id=? AND created_at>=? ORDER BY created_at DESC LIMIT 1000',[user,courseId,since]);
 rows.push(...guided.map(r=>{const items=json(r.items_json),answers=Object.values(json(r.answers_json));return {id:r.id,title:r.title,kind:'Buổi học cá nhân',status:r.status,started_at:r.created_at,completed_at:r.finished_at,subject_id:items[0]?.subject||'chinese',correct:answers.filter(a=>a.correct).length,total:items.length};}));
 rows=rows.map(r=>({...r,correct:r.correct==null?null:Number(r.correct),total:r.total==null?null:Number(r.total),score:r.score==null?(Number(r.total)>0?Math.round(Number(r.correct)/Number(r.total)*100):null):Number(r.score),subject:schoolSubjectName(r.subject_id,course.level)})).sort((a,b)=>new Date(b.started_at)-new Date(a.started_at));
 const completed=rows.filter(r=>r.completed_at&&r.status!=='pending_review'),scored=completed.filter(r=>r.score!=null),subjects=[];
 for(const id of [...new Set(completed.map(r=>r.subject_id))]){const done=completed.filter(r=>r.subject_id===id&&r.score!=null);subjects.push({id,title:schoolSubjectName(id,course.level),completed:done.length,average:done.length?Math.round(done.reduce((n,r)=>n+r.score,0)/done.length):null});}
 const weak=[...completed].filter(r=>r.score!=null&&r.score<70).sort((a,b)=>a.score-b.score).slice(0,3);
 const minutes=Math.round(completed.reduce((n,r)=>n+Math.max(0,Math.min(1800,(new Date(r.completed_at)-new Date(r.started_at))/1000)),0)/60);
 return {day,since:since.toISOString(),course,summary:{active_days:new Set(completed.map(r=>new Date(new Date(r.completed_at).getTime()+7*3600000).toISOString().slice(0,10))).size,completed:completed.length,in_progress:rows.filter(r=>!r.completed_at).length,pending_review:rows.filter(r=>r.status==='pending_review').length,average:scored.length?Math.round(scored.reduce((n,r)=>n+r.score,0)/scored.length):null,estimated_minutes:minutes},subjects,weak,recent:rows.slice(0,30),note:'Báo cáo 7 ngày của khóa đang chọn. Thời lượng là ước tính từ lúc mở đến lúc nộp, tối đa 30 phút mỗi lượt; không phải thời gian tương tác thực. Tự luyện chưa lưu kết quả không tính vào báo cáo.'};
}
