import { randomUUID, createHash } from 'node:crypto';
import { z } from 'zod';
import { query, withTransaction } from '../config/db.js';
import { badRequest, AppError, notFound } from '../utils/errors.js';
import { json, one, getSet, getItems, publicItem, catalog } from '../repositories/chinese.js';
import { parse, lessonSchema, setSchema, testSchema, issues, normalizeAnswer } from '../validators/chinese.js';
import { extractChinese } from './chinese-import.js';
export { catalog };
const txRun = c => async (sql,p=[]) => (await c.query(sql,p))[0];
export async function saveLesson(id, body) {
 const d=parse(lessonSchema,body); id ||= randomUUID();
 await query(`INSERT INTO chinese_lessons (id,level_id,title,position,description,image_url,status) VALUES (?,?,?,?,?,?,?)
 ON DUPLICATE KEY UPDATE level_id=VALUES(level_id),title=VALUES(title),position=VALUES(position),description=VALUES(description),image_url=VALUES(image_url),status=VALUES(status)`,[id,d.level_id,d.title,d.position,d.description,d.image_url,d.status]); return {id};
}
export async function importWord(body,file) {
 const lesson=await one('SELECT * FROM chinese_lessons WHERE id=?',[body.lesson_id]);
 if (Number(body.level_id)!==lesson.level_id) throw badRequest('Bài không thuộc HSK đã chọn');
 const title=parse(z.string().trim().min(1).max(255),body.title);
 const sha=createHash('sha256').update(file.buffer).digest('hex');
 const duplicates=await query('SELECT id,filename FROM chinese_documents WHERE sha256=?',[sha]);
 if (duplicates.length && body.allow_duplicate!=='true') throw new AppError(409,'DUPLICATE_DOCUMENT','Tệp đã được nhập. Chọn tạo bộ mới hoặc hủy.',duplicates);
 const extracted=await extractChinese(file.buffer), id=randomUUID(), doc=randomUUID();
 // Keep invalid/unrecognized source content for review, rather than silently dropping it.
 await withTransaction(async c => {
  const run=txRun(c);
  await run('INSERT INTO chinese_documents (id,filename,sha256,original,raw_text) VALUES (?,?,?,?,?)',[doc,file.originalname.slice(0,255),sha,file.buffer,extracted.raw]);
  await run('INSERT INTO chinese_sets (id,lesson_id,document_id,title) VALUES (?,?,?,?)',[id,lesson.id,doc,title]);
  for (const [p,i] of extracted.items.entries()) await run('INSERT INTO chinese_items (id,set_id,kind,position,data) VALUES (?,?,?,?,?)',[randomUUID(),id,i.kind,p+1,JSON.stringify(i.data)]);
 }); return {id,warnings:extracted.warnings,issues:issues(extracted.items)};
}
export async function detail(id,admin,user) {
 const set=await getSet(id,admin), items=await getItems(id);
 const progress=admin?[]:await query('SELECT * FROM chinese_progress WHERE student_id=? AND set_id=?',[user,id]);
 return {set,items:admin?items:items.map(publicItem),issues:admin?issues(items):undefined,progress:progress[0]||null};
}
export async function saveSet(id,body) {
 const d=parse(setSchema,body), errors=issues(d.items);
 for(const i of d.items)if(i.kind==='question'&&i.data.vocabulary_id&&!d.items.some(v=>v.kind==='vocabulary'&&v.id===i.data.vocabulary_id))throw badRequest('Từ vựng liên kết phải thuộc bộ đang mở và chưa bị xóa');
 if(d.status==='published' && errors.length) throw badRequest('Chưa thể xuất bản',errors);
 return withTransaction(async c => {
  const run=txRun(c); await one('SELECT id FROM chinese_sets WHERE id=? FOR UPDATE',[id],run);
  const old=await getItems(id,run), allowed=new Set(old.map(i=>i.id));
  for(const i of d.items) if(i.id && !allowed.has(i.id)) throw badRequest('Mục nội dung không thuộc bộ đang mở');
  if(new Set(d.items.filter(i=>i.id).map(i=>i.id)).size!==d.items.filter(i=>i.id).length) throw badRequest('ID nội dung trùng');
  await run('UPDATE chinese_sets SET title=?,status=?,processing_status=? WHERE id=?',[d.title,d.status,errors.length?'review':'ready',id]);
  await run('UPDATE chinese_items SET active=0 WHERE set_id=?',[id]);
  for(const [p,i] of d.items.entries()) await run(`INSERT INTO chinese_items (id,set_id,kind,position,data) VALUES (?,?,?,?,?) ON DUPLICATE KEY UPDATE kind=VALUES(kind),position=VALUES(position),data=VALUES(data),active=1`,[i.id||randomUUID(),id,i.kind,p+1,JSON.stringify(i.data)]);
  return {id,issues:errors};
 });
}
export async function review(user,itemId,body) {
 const d=parse(z.object({event_id:z.string().uuid(),memory:z.enum(['new','review','remembered']).optional(),favorite:z.boolean().optional()}),body);
 return withTransaction(async c=>{
  const run=txRun(c), item=await one("SELECT * FROM chinese_items WHERE id=? AND kind='vocabulary' AND active=1",[itemId],run);
  await getSet(item.set_id,false,run);
  await run('INSERT INTO chinese_reviews (student_id,item_id) VALUES (?,?) ON DUPLICATE KEY UPDATE student_id=VALUES(student_id)',[user,itemId]);
  const r=await one('SELECT * FROM chinese_reviews WHERE student_id=? AND item_id=? FOR UPDATE',[user,itemId],run);
  const event=await run('INSERT IGNORE INTO chinese_review_events (id,student_id,item_id) VALUES (?,?,?)',[d.event_id,user,itemId]);
  if(!event.affectedRows) return r;
  const count=r.review_count+(d.memory?1:0), days=d.memory==='remembered'?Math.min(30,2**Math.min(count,5)):d.memory==='review'?1:0;
  const due=new Date(Date.now()+(days?days*86400000:10*60000));
  await run(`UPDATE chinese_reviews SET memory=?,favorite=?,review_count=?,last_review=?,next_review=?,last_event=? WHERE student_id=? AND item_id=?`,[d.memory??r.memory,d.favorite??r.favorite,count,d.memory?new Date():r.last_review,d.memory?due:r.next_review,d.event_id,user,itemId]);
  return one('SELECT * FROM chinese_reviews WHERE student_id=? AND item_id=?',[user,itemId],run);
 });
}
export async function progress(user,id,body) {
 const d=parse(z.object({last_item:z.string().uuid().nullable(),read_items:z.array(z.string().uuid()).max(1000)}),body);
 await getSet(id); const items=await getItems(id), ids=new Set(items.map(i=>i.id));
 if(d.last_item&&!ids.has(d.last_item) || d.read_items.some(v=>!items.some(i=>i.id===v&&['reading','grammar','dialogue'].includes(i.kind)))) throw badRequest('Nội dung không thuộc bộ');
 await withTransaction(async c=>{
  const run=txRun(c);
  await run(`INSERT INTO chinese_progress (student_id,set_id,last_item,read_items) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE student_id=VALUES(student_id)`,[user,id,d.last_item,'[]']);
  const previous=await one('SELECT read_items FROM chinese_progress WHERE student_id=? AND set_id=? FOR UPDATE',[user,id],run);
  const merged=[...new Set([...json(previous.read_items),...d.read_items])];
  await run('UPDATE chinese_progress SET last_item=?,read_items=?,updated_at=CURRENT_TIMESTAMP(3) WHERE student_id=? AND set_id=?',[d.last_item,JSON.stringify(merged),user,id]);
 });return {saved:true};
}
export async function notebook(user,filters) {
 const rows=await query(`SELECT i.*,s.title set_title,s.lesson_id,l.level_id,r.memory,r.favorite,r.review_count,r.wrong_count,r.next_review FROM chinese_reviews r JOIN chinese_items i ON i.id=r.item_id JOIN chinese_sets s ON s.id=i.set_id JOIN chinese_lessons l ON l.id=s.lesson_id WHERE r.student_id=? AND i.active=1 AND s.status='published' AND l.status='published' ORDER BY r.next_review`,[user]);
 return rows.filter(r=>(!filters.level_id||r.level_id===Number(filters.level_id))&&(!filters.lesson_id||r.lesson_id===filters.lesson_id)&&(!filters.set_id||r.set_id===filters.set_id)&&(!filters.filter||filters.filter==='favorite'&&r.favorite||filters.filter==='new'&&r.memory==='new'||filters.filter==='wrong'&&r.wrong_count>0||filters.filter==='due'&&r.next_review&&new Date(r.next_review)<=new Date())).map(i=>({...i,data:json(i.data)}));
}
export async function saveTest(id,body) {
 const d=parse(testSchema,body); for(const setId of d.set_ids) await getSet(setId,true);
 const all=(await Promise.all(d.set_ids.map(s=>getItems(s)))).flat().filter(i=>i.kind==='question');
 if(d.status==='published' && (!all.length || issues(all).length)) throw badRequest('Bài kiểm tra cần câu hỏi hợp lệ, đã duyệt');
 id ||= randomUUID(); await query(`INSERT INTO chinese_tests (id,title,set_ids,duration_seconds,pass_percent,status) VALUES (?,?,?,?,?,?) ON DUPLICATE KEY UPDATE title=VALUES(title),set_ids=VALUES(set_ids),duration_seconds=VALUES(duration_seconds),pass_percent=VALUES(pass_percent),status=VALUES(status)`,[id,d.title,JSON.stringify([...new Set(d.set_ids)]),d.duration_seconds,d.pass_percent,d.status]);return {id};
}
export async function tests(admin) {
 const rows=await query(`SELECT * FROM chinese_tests ${admin?'':"WHERE status='published'"}`), result=[];
 for(const row of rows) { row.set_ids=json(row.set_ids); if(!admin) { try { for(const s of row.set_ids) await getSet(s); } catch { continue; } } result.push(row); } return result;
}
export async function start(user,body) {
 const d=parse(z.object({test_id:z.string().uuid().optional(),set_id:z.string().uuid().optional()}),body);
 if(Boolean(d.test_id)===Boolean(d.set_id)) throw badRequest('Chọn bài kiểm tra hoặc bộ luyện tập');
 let sources, duration=null, title='Luyện tập', pass=70;
 if(d.test_id) { const t=await one("SELECT * FROM chinese_tests WHERE id=? AND status='published'",[d.test_id]); sources=json(t.set_ids);duration=t.duration_seconds;title=t.title;pass=t.pass_percent; } else sources=[d.set_id];
 let items=[]; for(const s of sources) {await getSet(s);items.push(...(await getItems(s)).filter(i=>i.kind==='question'&&i.data.approved));}
 if(!items.length||items.length>1000||issues(items).length) throw badRequest('Chưa đủ câu hỏi hợp lệ');
 const id=randomUUID(); await withTransaction(async c=>{
  const run=txRun(c);
  await run('INSERT INTO chinese_attempts (id,student_id,test_id,set_id,snapshot,answers,ends_at) VALUES (?,?,?,?,?,?,?)',[id,user,d.test_id??null,d.set_id??null,JSON.stringify({title,pass,items}),JSON.stringify({}),duration?new Date(Date.now()+duration*1000):null]);
  for(const source of sources)await run(`INSERT INTO chinese_progress (student_id,set_id,last_item,read_items) VALUES (?,?,NULL,'[]') ON DUPLICATE KEY UPDATE updated_at=CURRENT_TIMESTAMP(3)`,[user,source]);
 });return attempt(user,id);
}
function state(a) {
 const snapshot=json(a.snapshot), answers=json(a.answers), items=snapshot.items.map(i=>{
  const answer=answers[i.id]; return {...publicItem(i),result:answer?.locked||a.finished_at?{...answer,accepted:i.data.accepted,explanation:i.data.explanation}:undefined,selection:answer?.value};
 });
 return {id:a.id,title:snapshot.title,started_at:a.started_at,ends_at:a.ends_at,finished_at:a.finished_at,score:a.score,pass_percent:snapshot.pass,items};
}
async function finalize(a,run) {
 const snap=json(a.snapshot), answers=json(a.answers);
 for(const i of snap.items) { if(!answers[i.id]?.locked) answers[i.id]={value:answers[i.id]?.value??'',locked:true,correct:false}; }
 const score=Math.round(snap.items.filter(i=>answers[i.id].correct).length/snap.items.length*10000)/100;
 await run('UPDATE chinese_attempts SET answers=?,score=?,finished_at=CURRENT_TIMESTAMP(3) WHERE id=?',[JSON.stringify(answers),score,a.id]);
 return one('SELECT * FROM chinese_attempts WHERE id=?',[a.id],run);
}
export async function attempt(user,id,action=null,body={}) {
 return withTransaction(async c=>{
  const run=txRun(c); let a=await one('SELECT * FROM chinese_attempts WHERE id=? AND student_id=? FOR UPDATE',[id,user],run);
  if(!a.finished_at&&a.ends_at&&new Date(a.ends_at)<=new Date()) a=await finalize(a,run);
  if(a.finished_at||!action) return state(a);
  if(action==='finish') return state(await finalize(a,run));
  const d=parse(z.object({item_id:z.string().uuid(),value:z.string().max(20000),lock:z.boolean().default(false)}),body);
  const snap=json(a.snapshot), q=snap.items.find(i=>i.id===d.item_id); if(!q) throw notFound();
  const answers=json(a.answers); if(answers[q.id]?.locked) return state(a);
  if(['choice','listening'].includes(q.data.type)&&!q.data.options.includes(d.value)) throw badRequest('Lựa chọn không hợp lệ');
  const correct=q.data.accepted.some(v=>normalizeAnswer(v)===normalizeAnswer(d.value));
  answers[q.id]={value:d.value,locked:d.lock,...(d.lock?{correct}:{})};
  await run('UPDATE chinese_attempts SET answers=? WHERE id=?',[JSON.stringify(answers),id]);a.answers=answers;
  if(d.lock&&!correct&&q.data.vocabulary_id) {
   const v=await run("SELECT id FROM chinese_items WHERE id=? AND set_id=? AND kind='vocabulary'",[q.data.vocabulary_id,q.set_id]);
   if(v.length) await run(`INSERT INTO chinese_reviews (student_id,item_id,memory,wrong_count,next_review) VALUES (?,?,'review',1,CURRENT_TIMESTAMP(3)) ON DUPLICATE KEY UPDATE memory='review',wrong_count=wrong_count+1,next_review=CURRENT_TIMESTAMP(3)`,[user,q.data.vocabulary_id]);
  }
  return state(a);
 });
}
export async function history(user) {return query('SELECT id,test_id,set_id,started_at,ends_at,finished_at,score FROM chinese_attempts WHERE student_id=? ORDER BY started_at DESC LIMIT 200',[user]);}
export async function stats(filters={}) {
 const totals={}; for(const [name,sql] of Object.entries({lessons:'SELECT COUNT(*) n FROM chinese_lessons',sets:'SELECT COUNT(*) n FROM chinese_sets',vocabulary:"SELECT COUNT(*) n FROM chinese_items WHERE active=1 AND kind='vocabulary'",questions:"SELECT COUNT(*) n FROM chinese_items WHERE active=1 AND kind='question'",pending:"SELECT COUNT(*) n FROM chinese_sets WHERE processing_status='review'",attempts:'SELECT COUNT(*) n FROM chinese_attempts'})) totals[name]=(await query(sql))[0].n;
 const progress=await query(`SELECT p.*,u.display_name,s.title,l.level_id,l.id lesson_id FROM chinese_progress p JOIN profiles u ON u.id=p.student_id JOIN chinese_sets s ON s.id=p.set_id JOIN chinese_lessons l ON l.id=s.lesson_id WHERE (?='' OR p.student_id=?) AND (?='' OR l.level_id=?) AND (?='' OR l.id=?) AND (?='' OR s.id=?) ORDER BY p.updated_at DESC LIMIT 500`,[filters.student_id||'',filters.student_id||'',filters.level_id||'',filters.level_id||'',filters.lesson_id||'',filters.lesson_id||'',filters.set_id||'',filters.set_id||'']);
 const items=await query('SELECT id,set_id,kind FROM chinese_items WHERE active=1');
 const reviews=await query('SELECT student_id,item_id,memory,review_count,wrong_count FROM chinese_reviews');
 const attempts=await query('SELECT id,student_id,snapshot,answers,score,finished_at FROM chinese_attempts');
 for(const p of progress){
  const content=items.filter(i=>i.set_id===p.set_id&&i.kind!=='unknown'), ids=new Set(content.map(i=>i.id));
  const vocabulary=reviews.filter(r=>r.student_id===p.student_id&&ids.has(r.item_id));
  const read=new Set(json(p.read_items)); const locked=new Set();const scores=[];
  for(const a of attempts.filter(a=>a.student_id===p.student_id)){
   if(json(a.snapshot).items.some(i=>i.set_id===p.set_id)&&a.finished_at)scores.push(a.score);
   for(const [id,answer]of Object.entries(json(a.answers)))if(ids.has(id)&&answer.locked&&answer.value)locked.add(id);
  }
  p.learned_words=vocabulary.filter(r=>r.review_count>0).length;p.remembered_words=vocabulary.filter(r=>r.memory==='remembered').length;
  const completed=content.filter(i=>i.kind==='vocabulary'?vocabulary.some(r=>r.item_id===i.id&&r.review_count>0):i.kind==='question'?locked.has(i.id):read.has(i.id)).length;
  p.percent=content.length?Math.round(completed/content.length*100):0;p.completed=p.percent===100;p.test_scores=scores;
 }
 return {totals,progress};
}
