// Preview by default. Apply only the exact plan fingerprint, with a private backup.
import {createHash} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import dotenv from 'dotenv';
import {planSourceQuiz} from '../src/services/chinese-quiz-source.js';
import {q1QuizVocabulary} from '../src/data/chinese-q1-quiz-vocabulary.js';

const args=process.argv.slice(2),production=args.includes('--production'),apply=args.includes('--apply'),expected=args[args.indexOf('--expected')+1];
if(apply&&(!args.includes('--expected')||!/^[a-f0-9]{64}$/.test(expected)))throw Error('Áp dụng cần fingerprint từ bản xem trước.');
if(production){dotenv.config({path:new URL('../.env.vercel',import.meta.url),quiet:true});dotenv.config({path:new URL('../.env.supabase',import.meta.url),quiet:true});process.env.DB_DRIVER='postgres';process.env.PGPORT='6543';process.env.PG_READ_ONLY=apply?'false':'true';}
else process.env.DB_DRIVER='mysql';
const {withTransaction,closePool,isPostgres}=await import('../src/config/db.js');
const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'&&!(value instanceof Date)?Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])])):value;
const hash=value=>createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
const json=value=>typeof value==='string'?JSON.parse(value):value;
try{
 const result=await withTransaction(async c=>{
  const run=async(sql,p=[])=>(await c.query(sql,p))[0];
  if(isPostgres)await run('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
  const lessons=await run("SELECT l.id,l.position,s.id AS set_id,d.filename FROM chinese_lessons l JOIN chinese_sets s ON s.lesson_id=l.id LEFT JOIN chinese_documents d ON d.id=s.document_id WHERE l.level_id=1 AND l.status='published' AND s.status='published' ORDER BY l.position,s.position");
  if(lessons.length!==10)throw Error('Cần đúng 10 bộ HSK 1 để đối chiếu an toàn.');
  const plans=[],before=[];
  for(const source of q1QuizVocabulary){
   const matches=lessons.filter(l=>Number(l.position)===source.number);
   if(matches.length!==1||matches[0].filename!==`cau-hoi-tu-vung-tieng-trung-bai-${source.number}.docx`)throw Error('Tài liệu khác nguồn dự kiến.');
   const target=matches[0],items=(await run('SELECT * FROM chinese_items WHERE set_id=? ORDER BY position,id'+(apply?' FOR UPDATE':''),[target.set_id])).map(i=>({...i,data:json(i.data)}));
   before.push({lesson:source.number,set_id:target.set_id,items});
   plans.push(planSourceQuiz({number:source.number,setId:target.set_id,items}));
  }
  const fingerprint=hash({before,plans:plans.map(p=>p.questions)}),report=plans.map(p=>p.report);
  if(!apply)return {mode:'preview',target:production?'production-postgres':'local-mysql',fingerprint,lessons:report};
  if(fingerprint!==expected)throw Error('Ngân hàng đã đổi sau bản xem trước; chưa áp dụng gì.');
  const protectedTables=['chinese_attempts','chinese_reviews','chinese_progress','diamond_ledger'];
  const protectedHash=async()=>{
   const result={};for(const table of protectedTables){const rows=await run(`SELECT * FROM ${table}`);result[table]=hash(rows.map(canonical).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b))));}return result;
  };
  const protectedBefore=await protectedHash();
  const folder=new URL('../backups/chinese-quiz-source/',import.meta.url);await mkdir(folder,{recursive:true});
  const backup=new URL(`${new Date().toISOString().replace(/[:.]/g,'-')}-${production?'production':'local'}.json`,folder);
  await writeFile(backup,JSON.stringify({fingerprint,protected:protectedBefore,curriculum:before},null,2),'utf8');
  let changed=0;
  for(const plan of plans){
   if(plan.hidden.length){await run(`UPDATE chinese_items SET active=0 WHERE set_id=? AND id IN (${plan.hidden.map(()=>'?').join(',')})`,[plan.set_id,...plan.hidden.map(q=>q.id)]);changed+=plan.hidden.length;}
   const writes=[];
   for(const q of plan.questions){
    const old=before.find(b=>b.set_id===plan.set_id).items.find(i=>i.id===q.id);
    if(old&&old.active===1&&Number(old.position)===q.position&&hash(old.data)===hash(q.data))continue;
    writes.push(q);
   }
   for(let start=0;start<writes.length;start+=50){
    const batch=writes.slice(start,start+50),values=batch.map(()=>'(?,?,?,?,?,1)').join(',');
    const update=isPostgres?"ON CONFLICT(id) DO UPDATE SET data=EXCLUDED.data,position=EXCLUDED.position,active=1 WHERE chinese_items.set_id=EXCLUDED.set_id AND chinese_items.kind='question'":"ON DUPLICATE KEY UPDATE data=VALUES(data),position=VALUES(position),active=1";
    await run(`INSERT INTO chinese_items(id,set_id,kind,position,data,active) VALUES ${values} ${update}`,batch.flatMap(q=>[q.id,plan.set_id,'question',q.position,JSON.stringify(q.data)]));
    changed+=batch.length;
   }
   const after=(await run('SELECT * FROM chinese_items WHERE set_id=? ORDER BY position,id',[plan.set_id])).map(i=>({...i,data:json(i.data)}));
   const active=after.filter(i=>i.kind==='question'&&Number(i.active)===1);
   if(hash(active.map(i=>({id:i.id,position:i.position,data:i.data})))!==hash(plan.questions.map(i=>({id:i.id,position:i.position,data:i.data}))))throw Error('Ngân hàng sau cập nhật không khớp nguồn.');
   const rerun=planSourceQuiz({number:plan.number,setId:plan.set_id,items:after});
   const persisted=rows=>rows.map(({id,position,data})=>({id,position,data}));
   if(hash(persisted(rerun.questions))!==hash(persisted(plan.questions)))throw Error('Chạy lại sẽ làm thay đổi câu hỏi.');
   const oldOther=before.find(b=>b.set_id===plan.set_id).items.filter(i=>i.kind!=='question'),newOther=after.filter(i=>i.kind!=='question');
   if(hash(oldOther)!==hash(newOther))throw Error('Nội dung ngoài quiz bị đổi.');
  }
  if(hash(await protectedHash())!==hash(protectedBefore))throw Error('Lịch sử hoặc kim cương bị đổi; rollback.');
  return {mode:'applied',target:production?'production-postgres':'local-mysql',fingerprint,changed,backup:backup.pathname,history_preserved:true,lessons:report};
 });console.log(JSON.stringify(result,null,2));
}catch(error){console.error(JSON.stringify({ready:false,code:error.code||error.name,message:['Error','AssertionError'].includes(error.name)?error.message:'Đối chiếu thất bại; thông tin kết nối được ẩn.'}));process.exitCode=1;}
finally{await closePool();}
