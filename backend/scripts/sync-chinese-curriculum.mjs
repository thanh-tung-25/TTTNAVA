// One reviewed source for cards, listening, quizzes, reading, speaking, AI,
// activities, street missions and the original downloadable Word archives.
import {createHash} from 'node:crypto';
import {mkdir,writeFile,readFile,readdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
import dotenv from 'dotenv';
import {planCurriculum} from '../src/services/chinese-curriculum.js';
import {buildCurriculumWord,zipCurriculumArtifacts} from '../src/services/chinese-curriculum-word.js';
import {q1QuizVocabulary} from '../src/data/chinese-q1-quiz-vocabulary.js';
import {issues} from '../src/validators/chinese.js';
import {quizVersions} from '../src/services/chinese-quiz-state.js';

const args=process.argv.slice(2),production=args.includes('--production'),apply=args.includes('--apply'),expected=args[args.indexOf('--expected')+1],exportFiles=args.includes('--export-word');
if(apply&&(!args.includes('--expected')||!/^[a-f0-9]{64}$/.test(expected)))throw Error('Cần fingerprint từ bản xem trước.');
if(production){dotenv.config({path:new URL('../.env.vercel',import.meta.url),quiet:true});dotenv.config({path:new URL('../.env.supabase',import.meta.url),quiet:true});process.env.DB_DRIVER='postgres';process.env.PGPORT='6543';process.env.PG_READ_ONLY=apply?'false':'true';}
else process.env.DB_DRIVER='mysql';
const {withTransaction,closePool,isPostgres}=await import('../src/config/db.js');
const {archiveFile,DOCX_MIME}=await import('../src/services/private-storage.js');
const {validateActivities}=await import('../src/services/chinese-activities.js');
const {streetSettingsSchema}=await import('../src/services/chinese-street.js');
const canonical=v=>Buffer.isBuffer(v)?{sha256:digest(v)}:Array.isArray(v)?v.map(canonical):v&&typeof v==='object'&&!(v instanceof Date)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
const digest=v=>createHash('sha256').update(v).digest('hex'),hash=v=>digest(JSON.stringify(canonical(v))),json=v=>typeof v==='string'?JSON.parse(v):v;
const root=new URL('../../',import.meta.url),backupRoot=new URL('../backups/chinese-curriculum/',import.meta.url);
const filename=(kind,n)=>`${kind}-bai-${n}.docx`;
let stage='preview';
try{
 const result=await withTransaction(async c=>{
  const run=async(sql,p=[])=>(await c.query(sql,p))[0];if(isPostgres)await run('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
  const targets=await run("SELECT l.id,l.position,l.title,s.id AS set_id,s.document_id,s.speaking_settings,d.filename,d.sha256 FROM chinese_lessons l JOIN chinese_sets s ON s.lesson_id=l.id JOIN chinese_documents d ON d.id=s.document_id WHERE l.level_id=1 AND l.status='published' AND s.status='published' ORDER BY l.position");
  assert.equal(targets.length,10);const banks=[];
  for(const source of q1QuizVocabulary){
   const matching=targets.filter(t=>Number(t.position)===source.number);assert.equal(matching.length,1);const target=matching[0];assert.equal(target.filename,filename('cau-hoi-tu-vung-tieng-trung',source.number));
   const items=(await run('SELECT * FROM chinese_items WHERE set_id=? ORDER BY position,id'+(apply?' FOR UPDATE':''),[target.set_id])).map(i=>({...i,data:json(i.data)}));
   const plan=planCurriculum({number:source.number,setId:target.set_id,items,speakingSettings:target.speaking_settings});
   const previousQuiz=items.filter(i=>i.kind==='question'&&Number(i.active)===1&&i.data.approved),nextQuiz=plan.items.filter(i=>i.kind==='question');
   assert.deepEqual([...quizVersions(nextQuiz)],[...quizVersions(previousQuiz)],'Bộ quiz đã chốt phải giữ nguyên câu và thứ tự.');
   assert.deepEqual(issues(plan.items),[]);validateActivities({...plan.activities,status:'published',revision:0});streetSettingsSchema.parse({...plan.street,revision:0});
   const document=await buildCurriculumWord(plan);
   assert.equal(document.items.filter(i=>i.kind==='vocabulary').length,source.words.length);assert.equal(document.items.filter(i=>i.kind==='question').length,plan.report.quiz);assert.equal(document.items.filter(i=>i.data.practice==='speaking').length,10);assert.equal(document.items.filter(i=>i.kind==='unknown').length,0);
   const wordRows=document.items.filter(i=>i.kind==='vocabulary');assert.deepEqual(wordRows.map(i=>[i.data.hanzi,i.data.pinyin,i.data.meaning]),source.words.map(w=>[w.hanzi,w.pinyin,w.meaning]));
   const [activities]=await run('SELECT * FROM chinese_activities WHERE lesson_id=?',[target.id]),[chat]=await run('SELECT * FROM chinese_ai_chat_settings WHERE lesson_id=?',[target.id]),[street]=await run('SELECT * FROM chinese_street_lessons WHERE lesson_id=?',[target.id]);
   const old={items,activities,chat,street};const ids=new Set(plan.items.map(i=>i.id));
   const retired=items.filter(i=>Number(i.active)===1&&!ids.has(i.id));
   const changed=plan.items.filter(i=>{const old=items.find(o=>o.id===i.id);return !old||Number(old.active)!==1||old.position!==i.position||hash(old.data)!==hash(i.data);});
   const activityChanged=hash(json(activities?.data))!==hash(plan.activities)||activities?.status!=='published',chatChanged=hash(json(chat?.data))!==hash(plan.chat),streetChanged=hash(json(street?.data))!==hash(plan.street);
   banks.push({target,old,plan,document,retired,changed,activityChanged,chatChanged,streetChanged,documentChanged:target.sha256!==digest(document.buffer)});
  }
  const fingerprint=hash(banks.map(b=>({target:b.target,old:b.old,items:b.plan.items,activities:b.plan.activities,chat:b.plan.chat,street:b.plan.street,word:digest(b.document.buffer)})));
  const report=banks.map(b=>({...b.plan.report,retired:b.retired.length,item_updates:b.changed.length,activities_changed:b.activityChanged,chat_changed:b.chatChanged,street_changed:b.streetChanged,word_changed:b.documentChanged}));
  if(!apply&&!exportFiles)return {mode:'preview',target:production?'production':'local',fingerprint,lessons:report};
  if(apply)assert.equal(fingerprint,expected,'Dữ liệu đã đổi sau xem trước.');
  const protectedNames=['chinese_attempts','chinese_reviews','chinese_progress','diamond_ledger','chinese_speaking_submissions','chinese_speaking_clips','chinese_ai_chat_sessions','chinese_street_progress'];
  const protectedHash=async()=>{const out={};for(const table of protectedNames){if(isPostgres){const [r]=await run(`SELECT count(*) total,md5(coalesce(string_agg(to_jsonb(t)::text,'' ORDER BY to_jsonb(t)::text),'')) digest FROM ${table} t`);out[table]=r;}else out[table]=hash((await run(`SELECT * FROM ${table}`)).map(canonical).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b))));}return out;};
  const before=await protectedHash(),directory=new URL(new Date().toISOString().replace(/[:.]/g,'-')+'-'+(production?'production':'local')+'/',backupRoot);await mkdir(directory,{recursive:true});
  const backups=[];
  for(const b of banks){const [doc]=await run('SELECT * FROM chinese_documents WHERE id=?',[b.target.document_id]);await writeFile(new URL(b.target.filename,directory),doc.original);let asset=null;if(production)[asset]=await run('SELECT * FROM file_assets WHERE asset_key=?',['chinese_documents/'+b.target.document_id]);backups.push({target:b.target,old:b.old,document:{...doc,original:undefined},asset});}
  await writeFile(new URL('backup.json',directory),JSON.stringify({fingerprint,protected:before,banks:backups},null,2));
  if(exportFiles){
   stage='export-word';const output=new URL('tai-lieu/tieng-trung-dong-bo/',root);await mkdir(output,{recursive:true});const legacy=[],localBackups=[],saved=new Set(),localRoot=path.resolve(fileURLToPath(new URL('tai-lieu/',root)));
   async function replaceLocal(file,bytes){
    file=path.resolve(file);if(!file.startsWith(localRoot+path.sep))throw Error('Invalid artifact target');
    if(!saved.has(file)){const old=await readFile(file).catch(e=>{if(e.code!=='ENOENT')throw e;return null;});if(old){const name='local-'+digest(file).slice(0,16)+path.extname(file);await writeFile(new URL(name,directory),old);localBackups.push({file:path.relative(localRoot,file),backup:name});}saved.add(file);}
    await writeFile(file,bytes);
   }
   async function walk(dir){for(const entry of await readdir(dir,{withFileTypes:true})){if(entry.isDirectory())await walk(path.join(dir,entry.name));else if(/\.(docx|txt|json)$/.test(entry.name)&&/(?:tieng-trung|luyen-noi)/.test(dir))legacy.push(path.join(dir,entry.name));}}
   await walk(fileURLToPath(new URL('tai-lieu/',root)));
   for(const b of banks){
    const n=b.plan.number,variants={all:b.document.buffer};for(const section of ['vocabulary','speaking','reading','activities','ai','street'])variants[section]=(await buildCurriculumWord(b.plan,section)).buffer;
    const names={all:filename('cau-hoi-tu-vung-tieng-trung',n),vocabulary:filename('tu-vung-tieng-trung',n),speaking:filename('luyen-noi',n),reading:filename('bai-doc',n),activities:filename('van-dung',n),ai:filename('giao-tiep-ai',n),street:filename('pho-tieng-trung',n)};
    const pack=JSON.stringify({version:'user-vocabulary-2026-11-14',lesson:n,title:b.plan.source.title,vocabulary:b.plan.words.map(w=>w.data),questions:b.plan.items.filter(i=>i.kind==='question').map(i=>i.data),speaking:b.plan.items.filter(i=>i.data.practice==='speaking').map(i=>i.data),activities:b.plan.activities,chat:b.plan.chat,street:b.plan.street},null,2)+'\n';
    for(const [kind,name]of Object.entries(names))await replaceLocal(fileURLToPath(new URL(name,output)),variants[kind]);
    await replaceLocal(fileURLToPath(new URL(`du-lieu-bai-${n}.json`,output)),pack);
    for(const file of legacy){
     if(path.basename(file)===`du-lieu-bai-${n}.json`){await replaceLocal(file,pack);continue;}
     if(path.basename(file)===`cau-hoi-tu-vung-tieng-trung-bai-${n}.txt`){await replaceLocal(file,b.document.raw.replace(/[ \t]+$/gm,''));continue;}
     const match=path.basename(file).match(/^(cau-hoi-tu-vung-tieng-trung|tu-vung-tieng-trung|tu-vung-nhap-web|luyen-noi)-bai-(\d+)\.docx$/);if(!match||Number(match[2])!==n)continue;
     const kind=match[1]==='cau-hoi-tu-vung-tieng-trung'?'all':match[1]==='luyen-noi'?'speaking':'vocabulary';
     await replaceLocal(file,variants[kind]);
    }
   }
   const guide='# Tài liệu Tiếng Trung đồng bộ\n\nNguồn: danh sách đầy đủ 570 dòng người dùng xác nhận ngày 14/11/2026; 569 mục từ sau khi gộp 读 trùng trong bài 6, giữ đủ hai nghĩa. Mỗi bài có Word từ vựng, tài liệu tổng hợp có quiz, luyện nói, bài đọc, vận dụng, giao tiếp AI và Phố tiếng Trung. Câu luyện tập chỉ dùng từ bài 1 đến bài đang học. File JSON và bản chữ đi kèm cũng dùng bộ này. Quiz hỏi từ mới trước rồi đến vận dụng; không dùng quy tắc 3 câu mỗi từ của bộ cũ.\n\nXuất lại bằng backend/scripts/sync-chinese-curriculum.mjs --export-word. Đồng bộ online theo docs/chinese-curriculum-sync.md; không chạy các trình tạo Word dựa trên PDF cũ.\n';
   await replaceLocal(fileURLToPath(new URL('README.md',output)),guide);
   for(const [folder,numbers]of [['tieng-trung-bai-3-6',[3,4,5,6]],['tieng-trung-bai-7-10',[7,8,9,10]]]){
    const dir=path.join(localRoot,folder);await replaceLocal(path.join(dir,'HUONG-DAN.md'),guide);
    await replaceLocal(path.join(dir,'thong-ke.json'),JSON.stringify(banks.filter(b=>numbers.includes(b.plan.number)).map(b=>b.plan.report),null,2)+'\n');
    const files=await readdir(dir);await replaceLocal(path.join(localRoot,folder+'.zip'),await zipCurriculumArtifacts(await Promise.all(files.sort().map(async name=>[name,await readFile(path.join(dir,name))]))));
   }
   await replaceLocal(path.join(localRoot,'tieng-trung-luyen-noi','cau-hoi-va-tieu-chi.md'),guide+'\n'+banks.filter(b=>b.plan.number<=6).map(b=>'## Bài '+b.plan.number+'\n\n'+b.plan.items.filter(i=>i.data.practice==='speaking').map((i,n)=>`${n+1}. ${i.data.text} — ${i.data.meaning}\n\n   Tham khảo: ${i.data.answer_reference}\n\n   ${i.data.assessment_notes}`).join('\n\n')).join('\n\n'));
   const files=await readdir(output);await replaceLocal(path.join(localRoot,'tieng-trung-dong-bo.zip'),await zipCurriculumArtifacts(await Promise.all(files.sort().map(async name=>[name,await readFile(new URL(name,output))]))));
   await writeFile(new URL('local-artifacts.json',directory),JSON.stringify(localBackups,null,2));
  }
  if(apply){
   stage='apply-content';
   for(const b of banks){
    if(b.retired.length)await run(`UPDATE chinese_items SET active=0 WHERE set_id=? AND id IN (${b.retired.map(()=>'?').join(',')})`,[b.target.set_id,...b.retired.map(i=>i.id)]);
    for(let start=0;start<b.changed.length;start+=50){const batch=b.changed.slice(start,start+50),update=isPostgres?'ON CONFLICT(id) DO UPDATE SET kind=EXCLUDED.kind,position=EXCLUDED.position,data=EXCLUDED.data,active=1':'ON DUPLICATE KEY UPDATE kind=VALUES(kind),position=VALUES(position),data=VALUES(data),active=1';await run(`INSERT INTO chinese_items(id,set_id,kind,position,data,active) VALUES ${batch.map(()=>'(?,?,?,?,?,1)').join(',')} ${update}`,batch.flatMap(i=>[i.id,b.target.set_id,i.kind,i.position,JSON.stringify(i.data)]));}
    if(b.activityChanged)await run(isPostgres?"INSERT INTO chinese_activities(lesson_id,status,data,revision) VALUES (?,'published',?,1) ON CONFLICT(lesson_id) DO UPDATE SET status='published',data=EXCLUDED.data,revision=chinese_activities.revision+1,updated_at=CURRENT_TIMESTAMP":"INSERT INTO chinese_activities(lesson_id,status,data,revision) VALUES (?,'published',?,1) ON DUPLICATE KEY UPDATE status='published',data=VALUES(data),revision=revision+1,updated_at=CURRENT_TIMESTAMP",[b.target.id,JSON.stringify(b.plan.activities)]);
    if(b.chatChanged)await run(isPostgres?'INSERT INTO chinese_ai_chat_settings(lesson_id,data) VALUES (?,?) ON CONFLICT(lesson_id) DO UPDATE SET data=EXCLUDED.data,updated_at=CURRENT_TIMESTAMP':'INSERT INTO chinese_ai_chat_settings(lesson_id,data) VALUES (?,?) ON DUPLICATE KEY UPDATE data=VALUES(data),updated_at=CURRENT_TIMESTAMP',[b.target.id,JSON.stringify(b.plan.chat)]);
    if(b.streetChanged)await run(isPostgres?'INSERT INTO chinese_street_lessons(lesson_id,data,revision) VALUES (?,?,1) ON CONFLICT(lesson_id) DO UPDATE SET data=EXCLUDED.data,revision=chinese_street_lessons.revision+1,updated_at=CURRENT_TIMESTAMP':'INSERT INTO chinese_street_lessons(lesson_id,data,revision) VALUES (?,?,1) ON DUPLICATE KEY UPDATE data=VALUES(data),revision=revision+1,updated_at=CURRENT_TIMESTAMP',[b.target.id,JSON.stringify(b.plan.street)]);
    if(b.documentChanged){await archiveFile('chinese_documents/'+b.target.document_id,b.document.buffer,DOCX_MIME,b.target.filename,run);await run('UPDATE chinese_documents SET original=?,raw_text=?,sha256=? WHERE id=?',[b.document.buffer,b.document.raw,digest(b.document.buffer),b.target.document_id]);}
    const after=(await run('SELECT * FROM chinese_items WHERE set_id=? ORDER BY position,id',[b.target.set_id])).map(i=>({...i,data:json(i.data)}));
    const persisted=items=>items.map(({id,kind,position,data})=>({id,kind,position,data})).sort((a,b)=>a.id.localeCompare(b.id));assert.equal(hash(persisted(after.filter(i=>Number(i.active)===1))),hash(persisted(b.plan.items)));
    const rerun=planCurriculum({number:b.plan.number,setId:b.target.set_id,items:after,speakingSettings:b.target.speaking_settings});assert.equal(hash(persisted(rerun.items)),hash(persisted(b.plan.items)),'Rerun changes curriculum');
   }
   assert.equal(hash(await protectedHash()),hash(before),'Student history changed');
  }
  return {mode:apply?'applied':'exported',target:production?'production':'local',fingerprint,backup:directory.pathname,history_preserved:true,lessons:report};
 });console.log(JSON.stringify(result,null,2));
}catch(error){console.error(JSON.stringify({ready:false,stage,code:error.code||error.name,message:['Error','AssertionError'].includes(error.name)?error.message:'Đồng bộ thất bại; thông tin kết nối được ẩn.'}));process.exitCode=1;}
finally{await closePool();}
