import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {query,withTransaction,dialectSql} from '../config/db.js';
import {AppError,badRequest,notFound} from '../utils/errors.js';
import {parseJson} from '../utils/normalize.js';
import {validateClientAnswer,isAnswerCorrect} from '../utils/answers.js';
import {seededShuffle} from '../utils/hash.js';
import {requireCourse} from './course-service.js';
import {loadQuestionsByIds} from './question-service.js';
import {wrongNotebook} from './study-hub.js';
import {familyReport} from './learning-support.js';

export const json=value=>parseJson(value)||{};
export const txRun=c=>async(sql,p=[])=>(await c.query(sql,p))[0];
export const localDay=(date=new Date())=>new Date(new Date(date).getTime()+7*3600000).toISOString().slice(0,10);
export const runLink=id=>'/pages/student/session/?run='+encodeURIComponent(id);
export async function activeStudent(id,run=query,lock=false){
 const [student]=await run("SELECT * FROM profiles WHERE id=? AND role='student' AND deleted_at IS NULL"+(lock?' FOR UPDATE':''),[id]);
 if(!student)throw notFound();return student;
}
export async function preferences(user){
 const [row]=await query('SELECT * FROM student_preferences WHERE profile_id=?',[user]);
 return row||{profile_id:user,minutes:10,font_scale:'normal',speech_rate:1,effects_enabled:1,companion:'owl',companion_name:'Cú nhỏ',equipped_frame:null,equipped_background:null,onboarding_at:null};
}
export async function savePreferences(user,body){
 const d=z.object({minutes:z.union([z.literal(5),z.literal(10),z.literal(15)]).optional(),font_scale:z.enum(['normal','large']).optional(),speech_rate:z.number().min(.5).max(1.5).optional(),effects_enabled:z.boolean().optional(),companion:z.enum(['owl','panda','bunny']).optional(),companion_name:z.string().trim().min(1).max(40).optional(),onboarded:z.boolean().optional()}).strict().parse(body);
 await withTransaction(async c=>{const run=txRun(c);await activeStudent(user,run,true);const [old]=await run('SELECT * FROM student_preferences WHERE profile_id=?',[user]);
  if(!old)await run('INSERT INTO student_preferences(profile_id) VALUES (?)',[user]);
  const changes=Object.entries(d).filter(([k])=>k!=='onboarded');
  if(d.onboarded)changes.push(['onboarding_at',new Date()]);
  if(changes.length)await run('UPDATE student_preferences SET '+changes.map(([k])=>k+'=?').join(',')+' WHERE profile_id=?',[...changes.map(([k,v])=>k==='effects_enabled'?Number(v):v),user]);
 });return preferences(user);
}
export async function learningCatalog(user,courseId){
 const course=await requireCourse(user,courseId);
 let rows;
 if(course.kind==='chinese')rows=await query("SELECT s.id,s.title AS name,l.title AS section,COUNT(i.id) total FROM chinese_sets s JOIN chinese_lessons l ON l.id=s.lesson_id LEFT JOIN chinese_items i ON i.set_id=s.id AND i.active=1 AND i.kind IN ('question','vocabulary') WHERE l.level_id=? AND s.status='published' AND l.status='published' GROUP BY s.id,s.title,l.title,l.position,s.position ORDER BY l.position,s.position,s.id",[course.level]);
 else rows=await query("SELECT t.id,t.name,t.subject_id,COUNT(q.id) total FROM topics t LEFT JOIN questions q ON q.topic_id=t.id AND q.status='published' WHERE t.grade=? GROUP BY t.id,t.name,t.subject_id,t.sort_order ORDER BY t.subject_id,t.sort_order,t.id",[course.level]);
 const [focus]=await query('SELECT topic_id,set_id FROM student_focus WHERE profile_id=? AND course_id=?',[user,courseId]);
 return {course,items:rows.map(r=>({...r,total:Number(r.total)})),focus:focus||{}};
}
export async function labVocabulary(user,courseId){
 const course=await requireCourse(user,courseId);if(course.kind!=='chinese')return [];
 const rows=await query("SELECT i.id,i.data FROM chinese_items i JOIN chinese_sets s ON s.id=i.set_id JOIN chinese_lessons l ON l.id=s.lesson_id WHERE i.active=1 AND i.kind='vocabulary' AND s.status='published' AND l.status='published' AND l.level_id=? ORDER BY l.position,s.position,i.position LIMIT 100",[course.level]);
 return rows.map(r=>({id:r.id,...json(r.data)})).filter(r=>r.hanzi&&r.meaning).map(({id,hanzi,pinyin,meaning})=>({id,hanzi,pinyin,meaning}));
}
export async function saveFocus(user,courseId,body){
 const {itemId}=z.object({itemId:z.string().max(60).nullable()}).strict().parse(body),catalog=await learningCatalog(user,courseId);
 if(itemId&&!catalog.items.some(r=>r.id===itemId))throw badRequest('Bài học không thuộc khóa đang chọn.');
 await withTransaction(async c=>{const run=txRun(c);await activeStudent(user,run,true);await run('DELETE FROM student_focus WHERE profile_id=? AND course_id=?',[user,courseId]);
  await run('INSERT INTO student_focus(profile_id,course_id,topic_id,set_id) VALUES (?,?,?,?)',[user,courseId,catalog.course.kind==='chinese'?null:itemId,catalog.course.kind==='chinese'?itemId:null]);
 });return {saved:true};
}
export async function sourceItems(user,courseId,{itemId=null,review=false,count=10,subject=null}={}){
 const course=await requireCourse(user,courseId);let items=[];
 if(course.kind==='chinese'){
  const rows=await query("SELECT i.*,s.title AS set_title FROM chinese_items i JOIN chinese_sets s ON s.id=i.set_id JOIN chinese_lessons l ON l.id=s.lesson_id WHERE i.active=1 AND i.kind IN ('question','vocabulary') AND l.level_id=? AND s.status='published' AND l.status='published'"+(itemId?' AND s.id=?':'')+' ORDER BY l.position,s.position,i.position LIMIT 3000',[course.level,...(itemId?[itemId]:[])]);
  const vocabulary=rows.filter(r=>r.kind==='vocabulary').map(r=>({...r,data:json(r.data)}));
  for(const row of rows){const d=json(row.data);
   if(row.kind==='question'&&Array.isArray(d.accepted)&&d.accepted.length){
    const choices=Array.isArray(d.options)?d.options.filter(o=>typeof o==='string'):[],correct=choices.filter(o=>d.accepted.includes(o));
    const options=d.type==='choice'&&choices.length>=2&&correct.length===1?seededShuffle(choices,randomUUID()).map((text,i)=>({key:String(i),text})):[];
    items.push({id:row.id,type:options.length?'single_choice':'fill_in',prompt:d.prompt+(!options.length&&choices.length?'\nTừ/cụm từ gợi ý: '+choices.join(' · '):''),options,answer:options.length?{key:options.find(o=>o.text===correct[0]).key}:{accepted:d.accepted},explanation:d.explanation||'',skill:row.set_id,label:row.set_title,subject:'chinese'});
   }
   else if(row.kind==='vocabulary'&&d.hanzi&&d.meaning){
    const others=[...new Set(vocabulary.map(v=>v.data.meaning).filter(m=>m&&m!==d.meaning))].slice(0,3);if(!others.length)continue;
    const options=seededShuffle([d.meaning,...others],randomUUID()).map((text,i)=>({key:String(i),text}));
    items.push({id:row.id,type:'single_choice',prompt:'Chọn nghĩa của '+d.hanzi+(d.pinyin?' ('+d.pinyin+')':''),options,answer:{key:options.find(o=>o.text===d.meaning).key},explanation:d.hanzi+' · '+(d.pinyin||'')+' · '+d.meaning,skill:row.set_id,label:row.set_title,subject:'chinese'});
   }
  }
 }else{
  const rows=await query("SELECT q.id,t.id AS topic_id,t.name,t.subject_id FROM questions q JOIN topics t ON t.id=q.topic_id WHERE q.status='published' AND t.grade=?"+(itemId?' AND t.id=?':'')+(subject?' AND t.subject_id=?':'')+' ORDER BY '+dialectSql('RAND()','random()')+' LIMIT 100',[course.level,...(itemId?[itemId]:[]),...(subject?[subject]:[])]);
  const chosen=seededShuffle(rows,randomUUID()).slice(0,Math.max(80,count*6)),questions=await loadQuestionsByIds(chosen.map(r=>r.id)),byId=new Map(chosen.map(r=>[r.id,r]));
  items=questions.map(q=>({id:q.id,type:q.type,prompt:q.prompt,options:q.options,answer:q.answer,explanation:q.explanation||'',skill:byId.get(q.id).topic_id,label:byId.get(q.id).name,subject:byId.get(q.id).subject_id}));
 }
 items=seededShuffle(items,randomUUID());
 const wrong=review?await wrongNotebook(user,courseId):[],wrongIds=new Set(wrong.map(r=>r.id));
 if(review&&wrongIds.size){
  if(course.kind!=='chinese'){
   const preferred=await loadQuestionsByIds([...wrongIds].filter(id=>!id.includes(':')).slice(0,100));
   const allowedTopics=await query('SELECT id,name,subject_id FROM topics WHERE grade=?',[course.level]);const topics=new Map(allowedTopics.map(t=>[t.id,t]));
   for(const q of preferred){const topic=topics.get(q.topic_id);if(q.status!=='published'||!topic||itemId&&q.topic_id!==itemId)continue;items.unshift({id:q.id,type:q.type,prompt:q.prompt,options:q.options,answer:q.answer,explanation:q.explanation||'',skill:q.topic_id,label:topic.name,subject:topic.subject_id});}
  }
  items.sort((a,b)=>Number(wrongIds.has(b.id))-Number(wrongIds.has(a.id)));
 }
 const seen=new Set();items=items.filter(q=>{if(seen.has(q.id))return false;seen.add(q.id);return true;}).map(q=>({...q,was_wrong:wrongIds.has(q.id)}));
 if(!items.length)throw new AppError(409,'LEARNING_CONTENT_EMPTY','Bài này chưa có câu hỏi đã xuất bản phù hợp. Bạn hãy chọn bài khác hoặc vào hoạt động tương tác.');
 return items.slice(0,count);
}
export async function insertLearningRun(run,user,courseId,items,kind,title){
 const id=randomUUID();await run('INSERT INTO learning_runs(id,profile_id,course_id,run_kind,title,items_json,answers_json,draft_json) VALUES (?,?,?,?,?,?,?,?)',[id,user,courseId,kind,title,JSON.stringify(items),'{}','{}']);return id;
}
export async function startLearningRun(user,courseId,body={}){
 const d=z.object({kind:z.enum(['daily','review','weekend','diagnostic']).default('daily'),itemId:z.string().max(60).nullable().optional(),minutes:z.union([z.literal(5),z.literal(10),z.literal(15)]).optional(),subject:z.string().max(20).optional()}).strict().parse(body);
 const prefs=await preferences(user);await requireCourse(user,courseId);
 const focus=(await query('SELECT topic_id,set_id FROM student_focus WHERE profile_id=? AND course_id=?',[user,courseId]))[0];
 const itemId=d.itemId===undefined?(focus?.topic_id||focus?.set_id||null):d.itemId;
 const items=await sourceItems(user,courseId,{itemId,review:d.kind==='review',count:d.kind==='diagnostic'?5:d.minutes||prefs.minutes,subject:d.subject});
 const title={daily:'Buổi học hôm nay',review:'Ôn và sửa lỗi',weekend:'Thử thách tuần',diagnostic:'Khám phá điểm xuất phát'}[d.kind];
 const id=await withTransaction(async c=>{const run=txRun(c);await activeStudent(user,run,true);return insertLearningRun(run,user,courseId,items,d.kind,title);});
 return {id,href:runLink(id)};
}
export async function ownedLearningRun(user,id,run=query,lock=false){
 const [row]=await run('SELECT * FROM learning_runs WHERE id=? AND profile_id=?'+(lock?' FOR UPDATE':''),[id,user]);if(!row)throw notFound();return row;
}
function publicRun(row){
 const items=json(row.items_json),answers=json(row.answers_json),done=Object.keys(answers).length,index=items.findIndex(q=>!Object.hasOwn(answers,q.id));
 const correct=Object.values(answers).filter(a=>a.correct).length;
 const clean=q=>({id:q.id,type:q.type,prompt:q.prompt,options:q.options,subject:q.subject,skill:q.skill,label:q.label});
 return {id:row.id,courseId:row.course_id,title:row.title,kind:row.run_kind,status:row.status,total:items.length,answered:done,correct,percent:items.length?Math.round(correct/items.length*100):0,index:index<0?items.length:index,revision:Number(row.revision||0),draft:json(row.draft_json),question:index<0?null:clean(items[index]),finishedAt:row.finished_at,
  feedback:items.filter(q=>answers[q.id]).map(q=>({...clean(q),selected:answers[q.id].answer,correct:answers[q.id].correct,expected:q.answer,explanation:q.explanation})),next:row.status==='finished'?{review:'/pages/student/study-hub/?view=wrong',progress:'/pages/student/progress/'}:null};
}
export async function learningRunState(user,id){const row=await ownedLearningRun(user,id);await requireCourse(user,row.course_id);return publicRun(row);}
const draftSchema=z.object({revision:z.number().int().min(0),answer:z.object({key:z.string().max(40).optional(),keys:z.array(z.string().max(40)).max(20).optional(),value:z.union([z.string().max(200),z.boolean()]).optional()}).strict()}).strict();
export async function saveLearningDraft(user,id,body){
 const d=draftSchema.parse(body),row=await ownedLearningRun(user,id);await requireCourse(user,row.course_id);
 return withTransaction(async c=>{const run=txRun(c),current=await ownedLearningRun(user,id,run,true);if(current.status!=='open')throw badRequest('Buổi học đã hoàn thành.');
  if(Number(current.revision)!==d.revision)throw new AppError(409,'LEARNING_REVISION_CONFLICT','Bài đã được cập nhật ở thiết bị khác. Hãy tải lại để tiếp tục đúng câu.');
  await run('UPDATE learning_runs SET draft_json=?,revision=revision+1 WHERE id=?',[JSON.stringify(d.answer),id]);return {saved:true,revision:d.revision+1};
 });
}
export async function answerLearningRun(user,id,body){
 const d=z.object({questionId:z.string().max(80),answer:z.unknown(),revision:z.number().int().min(0)}).strict().parse(body),row=await ownedLearningRun(user,id);await requireCourse(user,row.course_id);
 await withTransaction(async c=>{const run=txRun(c),current=await ownedLearningRun(user,id,run,true),items=json(current.items_json),answers=json(current.answers_json);
  if(Object.hasOwn(answers,d.questionId))return;
  if(current.status!=='open')throw badRequest('Buổi học đã hoàn thành.');
  if(Number(current.revision)!==d.revision)throw new AppError(409,'LEARNING_REVISION_CONFLICT','Bài đã được cập nhật ở thiết bị khác. Hãy tải lại.');
  const question=items.find(q=>!Object.hasOwn(answers,q.id));if(!question||question.id!==d.questionId)throw badRequest('Bạn hãy hoàn thành câu đang làm trước.');
  const answer=validateClientAnswer(question,d.answer);answers[question.id]={answer,correct:isAnswerCorrect(question,answer),at:new Date().toISOString()};
  await run('UPDATE learning_runs SET answers_json=?,draft_json=?,revision=revision+1 WHERE id=?',[JSON.stringify(answers),'{}',id]);
 });return learningRunState(user,id);
}
export async function finishLearningRun(user,id){
 const original=await ownedLearningRun(user,id);await requireCourse(user,original.course_id);
 await withTransaction(async c=>{const run=txRun(c);await activeStudent(user,run,true);const row=await ownedLearningRun(user,id,run,true);if(row.status==='finished')return;
  const items=json(row.items_json),answers=json(row.answers_json);if(items.some(q=>!Object.hasOwn(answers,q.id)))throw badRequest('Bạn còn câu chưa trả lời. Bài đã được lưu để học tiếp.');
  const now=new Date(),day=localDay(now),correct=Object.values(answers).filter(a=>a.correct).length,repaired=items.filter(q=>q.was_wrong&&answers[q.id].correct).length;
  for(const key of [...new Set(items.map(q=>q.skill))]){
   const questions=items.filter(q=>q.skill===key),hits=questions.filter(q=>answers[q.id].correct).length;
   const [old]=await run('SELECT * FROM learning_skill_state WHERE profile_id=? AND course_id=? AND skill_key=?',[user,row.course_id,key]);
   const previousDay=old?.last_success_day instanceof Date?old.last_success_day.toISOString().slice(0,10):String(old?.last_success_day||'').slice(0,10);
   const successes=hits/questions.length>=.8?(Number(old?.spaced_successes||0)+Number(previousDay!==day)):0;
   const due=new Date(now.getTime()+([1,3,7,14][Math.min(successes,3)])*86400000);
   if(old)await run('UPDATE learning_skill_state SET attempts=attempts+?,correct_count=correct_count+?,spaced_successes=?,last_success_day=?,last_seen_at=?,next_review_at=? WHERE profile_id=? AND course_id=? AND skill_key=?',[questions.length,hits,successes,hits/questions.length>=.8?day:old.last_success_day,now,due,user,row.course_id,key]);
   else await run('INSERT INTO learning_skill_state(profile_id,course_id,skill_key,label,attempts,correct_count,spaced_successes,last_success_day,last_seen_at,next_review_at) VALUES (?,?,?,?,?,?,?,?,?,?)',[user,row.course_id,key,questions[0].label,questions.length,hits,successes,hits/questions.length>=.8?day:null,now,due]);
  }
  await run("UPDATE learning_runs SET status='finished',finished_at=? WHERE id=?",[now,id]);
  await run('INSERT INTO learning_events(id,profile_id,course_id,event_kind,ref_id,event_day,details_json) VALUES (?,?,?,?,?,?,?)',[randomUUID(),user,row.course_id,'run_finished',id,day,JSON.stringify({total:items.length,correct,repaired,kind:row.run_kind,types:[...new Set(items.map(q=>q.type))]})]);
 });return learningRunState(user,id);
}
export async function learningHint(user,id,level){
 const state=await learningRunState(user,id);if(!state.question)throw badRequest('Không còn câu cần gợi ý.');
 const n=z.coerce.number().int().min(1).max(2).parse(level),q=state.question;
 const text=n===1?(q.subject==='toan'?'Đọc lại dữ kiện, xác định điều cần tìm và ghi phép tính hoặc hệ thức có thể dùng.':'Đọc hoặc nghe lại câu, tìm từ khóa và liên hệ với bài đã học.'):(q.type==='fill_in'?'Viết câu trả lời ngắn, kiểm tra dấu, đơn vị và cách viết trước khi chốt.':'Thử từng phương án với dữ kiện, giải thích vì sao hợp lý rồi loại những phương án mâu thuẫn.');
 return {level:n,text,source:'Gợi ý cách làm theo dạng câu'};
}
export async function experienceProgress(user,courseId){
 await requireCourse(user,courseId);const rows=await query('SELECT * FROM learning_skill_state WHERE profile_id=? AND course_id=? ORDER BY next_review_at,skill_key',[user,courseId]);
 return rows.map(r=>({...r,attempts:Number(r.attempts),correct_count:Number(r.correct_count),spaced_successes:Number(r.spaced_successes),status:Number(r.spaced_successes)>=2?'vững':Number(r.correct_count)/Math.max(1,Number(r.attempts))>=.7?'đang tiến bộ':'cần luyện thêm',due:r.next_review_at&&new Date(r.next_review_at)<=new Date()}));
}
export async function experienceDashboard(user,courseId){
 const [prefs,report,skills,runs]=await Promise.all([preferences(user),familyReport(user,courseId),experienceProgress(user,courseId),query('SELECT id,title,status,created_at,finished_at FROM learning_runs WHERE profile_id=? AND course_id=? ORDER BY created_at DESC LIMIT 20',[user,courseId])]);
 let resume=runs.find(r=>r.status==='open');if(resume)resume={...resume,href:runLink(resume.id)};
 if(!resume&&report.course.kind!=='chinese'){
  const [old]=await query("SELECT p.id,t.name,t.subject_id FROM practice_sessions p JOIN topics t ON t.id=p.topic_id WHERE p.student_id=? AND t.grade=? AND p.status='in_progress' ORDER BY p.started_at DESC LIMIT 1",[user,report.course.level]);
  if(old)resume={title:old.name,href:'/pages/student/practice/?'+new URLSearchParams({session:old.id,subject:old.subject_id})};
 }
 if(!resume&&report.course.kind==='chinese'){
  const pending=await query('SELECT a.id,a.snapshot,l.level_id FROM chinese_attempts a LEFT JOIN chinese_sets s ON s.id=a.set_id LEFT JOIN chinese_lessons l ON l.id=s.lesson_id WHERE a.student_id=? AND a.finished_at IS NULL AND a.abandoned_at IS NULL ORDER BY a.started_at DESC LIMIT 20',[user]);
  const row=pending.find(r=>Number(r.level_id)===Number(report.course.level)||(json(r.snapshot).course_ids||[]).includes(courseId));if(row)resume={title:json(row.snapshot).title||'Bài Tiếng Trung đang học',href:'/pages/student/chinese/?attempt='+row.id};
 }
 const completed=runs.filter(r=>r.status==='finished').length;
 return {prefs,course:report.course,resume,runs:runs.map(r=>({...r,href:runLink(r.id)})),skills,week:report.summary,completedRuns:completed,weak:report.weak,day:localDay(),suggestion:skills.find(r=>r.due)||skills.find(r=>r.status==='cần luyện thêm')||null};
}
