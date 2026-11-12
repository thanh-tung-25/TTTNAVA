// Explicit deployment only. Default is read-only; --apply creates the result
// tables and copies ONLY six reviewed speaking sections + missing L1/L2 words.
// All other course data, account data and learning history must remain intact.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {parseEnv} from 'node:util';
import mysql from 'mysql2/promise';
import {speakingLessonBanks} from '../src/data/chinese-speaking-lessons-1-6.js';

const root=new URL('../../',import.meta.url),args=process.argv.slice(2),apply=args.includes('--apply');
const expectedProject='njaasgcfgjismpmzoncb',schema='ttnava_stage';
const stable=v=>v instanceof Date?v.toISOString():Array.isArray(v)?v.map(stable):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])])):v;
const digest=rows=>createHash('sha256').update(JSON.stringify(rows.map(r=>JSON.stringify(stable(r))).sort())).digest('hex');
let closePool,stage='configuration';
try{
 assert(args.every(arg=>arg==='--apply'),'Unsupported argument');
 const local=parseEnv(await readFile(new URL('backend/.env',root),'utf8'));
 const remote=parseEnv(await readFile(new URL('backend/.env.vercel',root),'utf8'));
 assert.equal(remote.DB_DRIVER,'postgres');assert.equal(remote.PGSCHEMA,schema);
 assert.equal(new URL(remote.SUPABASE_URL).hostname,expectedProject+'.supabase.co');
 assert(remote.PGHOST.endsWith('.pooler.supabase.com'));assert(remote.PGUSER.endsWith('.'+expectedProject));
 assert.equal(local.DB_DRIVER||'mysql','mysql');assert(['localhost','127.0.0.1','::1'].includes(local.DB_HOST||'127.0.0.1'));
 stage='local-source';
 const connection=await mysql.createConnection({host:local.DB_HOST||'127.0.0.1',port:Number(local.DB_PORT||3306),user:local.DB_USER||'root',password:local.DB_PASS||'',database:local.DB_NAME||'kids_learning',charset:'utf8mb4'});
 const sources=[];
 try{
  for(const definition of speakingLessonBanks){
   const filename=`cau-hoi-tu-vung-tieng-trung-bai-${definition.lesson}.docx`;
   const [sets]=await connection.query(`SELECT s.id,s.speaking_settings FROM chinese_sets s JOIN chinese_lessons l ON l.id=s.lesson_id JOIN chinese_documents d ON d.id=s.document_id WHERE l.level_id=1 AND l.position=? AND l.status='published' AND s.status='published' AND d.filename=?`,[definition.lesson,filename]);
   assert.equal(sets.length,1,`Local lesson ${definition.lesson}: ambiguous source`);
   const [items]=await connection.query('SELECT kind,data FROM chinese_items WHERE set_id=? AND active=1 ORDER BY position,id',[sets[0].id]);
   const bank=items.map(i=>({...i,data:typeof i.data==='string'?JSON.parse(i.data):i.data})).filter(i=>i.kind==='dialogue'&&i.data.practice==='speaking');
   assert.equal(bank.length,10,`Local lesson ${definition.lesson}: expected 10 questions`);
   sources.push({lesson:definition.lesson,filename,settings:typeof sets[0].speaking_settings==='string'?JSON.parse(sets[0].speaking_settings):sets[0].speaking_settings,selection:bank.map(i=>i.data.speaking_selected!==false),pack:{...definition,questions:bank.map(({data:d})=>({text:d.text,meaning:d.meaning,answer_reference:d.answer_reference,assessment_notes:d.assessment_notes}))}});
  }
 }finally{await connection.end();}
 // Override process config only inside this one deployment process, never the
 // development .env or the production website's runtime environment.
 Object.assign(process.env,remote);
 const db=await import('../src/config/db.js');closePool=db.closePool;
 const {query,withTransaction}=db;
 const {json}=await import('../src/repositories/chinese.js');
 const {replaceSpeakingQuestionBank,planSpeakingQuestionBank}=await import('../src/services/chinese-speaking-question-bank.js');
 const {supplementVocabulary}=await import('../src/services/chinese-vocabulary-supplement.js');
 const {speakingSettingsSchema}=await import('../src/validators/chinese.js');
 assert(db.isPostgres);
 for(const source of sources){speakingSettingsSchema.parse(source.settings);planSpeakingQuestionBank([],source.pack,source.settings);}
 stage='postgres-preview';
 const tables=await query("SELECT table_name FROM information_schema.tables WHERE table_schema=current_schema() AND table_name IN ('chinese_speaking_submissions','chinese_speaking_clips')");
 const resultsReady=tables.length===2;
 const backup=[];let backupPath;
 const report=await withTransaction(async c=>{
  const run=async(sql,params=[]) => (await c.query(sql,params))[0],targets=[];
  for(const source of sources){
   const sets=await run(`SELECT s.id,s.speaking_settings FROM chinese_sets s JOIN chinese_lessons l ON l.id=s.lesson_id JOIN chinese_documents d ON d.id=s.document_id WHERE l.level_id=1 AND l.position=? AND l.status='published' AND s.status='published' AND d.filename=? FOR UPDATE OF s`,[source.lesson,source.filename]);
   assert.equal(sets.length,1,`Production lesson ${source.lesson}: ambiguous source`);
   const set=sets[0],items=(await run('SELECT * FROM chinese_items WHERE set_id=? ORDER BY position,id',[set.id])).map(i=>({...i,data:json(i.data)}));
   const speaking=await replaceSpeakingQuestionBank(set.id,{pack:source.pack},c);
   const words=source.lesson<=2?await supplementVocabulary(set.id,{expectedCount:source.lesson===1?79:100},c):null;
   backup.push({lesson:source.lesson,set_id:set.id,speaking_settings:json(set.speaking_settings),items:items.filter(i=>i.kind==='dialogue'&&i.data.practice==='speaking')});
   targets.push({source,set,items,speaking,words});
  }
  const ids=targets.map(t=>t.set.id),marks=ids.map(()=>'?').join(',');
  const beforeItems=targets.flatMap(t=>t.items).filter(i=>!(i.kind==='dialogue'&&i.data.practice==='speaking'));
  const originalIds=new Set(beforeItems.map(i=>i.id));
  const history=async()=>({
   lessons:await run(`SELECT l.* FROM chinese_lessons l JOIN chinese_sets s ON s.lesson_id=l.id WHERE s.id IN (${marks})`,ids),
   set_metadata:(await run(`SELECT * FROM chinese_sets WHERE id IN (${marks})`,ids)).map(({speaking_settings,...r})=>r),
   activities:await run(`SELECT a.* FROM chinese_activities a JOIN chinese_sets s ON s.lesson_id=a.lesson_id WHERE s.id IN (${marks})`,ids),
   progress:await run(`SELECT * FROM chinese_progress WHERE set_id IN (${marks})`,ids),
   reviews:await run(`SELECT r.* FROM chinese_reviews r JOIN chinese_items i ON i.id=r.item_id WHERE i.set_id IN (${marks})`,ids),
   review_events:await run(`SELECT r.* FROM chinese_review_events r JOIN chinese_items i ON i.id=r.item_id WHERE i.set_id IN (${marks})`,ids),
   attempts:await run(`SELECT * FROM chinese_attempts WHERE set_id IN (${marks})`,ids),
   ...(resultsReady?{speaking_results:await run(`SELECT * FROM chinese_speaking_submissions WHERE set_id IN (${marks})`,ids)}:{})
  });
  const before=Object.fromEntries(Object.entries(await history()).map(([k,v])=>[k,digest(v)]));
  if(apply){
   stage='postgres-apply';
   const directory=new URL('backend/backups/chinese-speaking-deploy/',root);await mkdir(directory,{recursive:true});
   backupPath='backend/backups/chinese-speaking-deploy/'+new Date().toISOString().replace(/[:.]/g,'-')+'.json';
   await writeFile(new URL(backupPath,root),JSON.stringify({created_at:new Date().toISOString(),project:expectedProject,schema,sections:backup,history_hashes:before,original_item_hash:digest(beforeItems)},null,2),'utf8');
   await run(await readFile(new URL('../sql/postgres/034_chinese_speaking_assessment.sql',import.meta.url),'utf8'));
  }
  const results=[];
  for(const target of targets){
   const {source,set}=target;
   const changed=await replaceSpeakingQuestionBank(set.id,{pack:source.pack,apply,expectedFingerprint:target.speaking.fingerprint},c);
   const words=source.lesson<=2?await supplementVocabulary(set.id,{apply,expectedCount:source.lesson===1?79:100},c):null;
   if(apply){
    const bank=(await run("SELECT id,data FROM chinese_items WHERE set_id=? AND active=1 AND kind='dialogue' ORDER BY position,id",[set.id])).map(i=>({...i,data:json(i.data)})).filter(i=>i.data.practice==='speaking');
    assert.equal(bank.length,source.pack.questions.length);
    for(const [n,item]of bank.entries())if(item.data.speaking_selected!==source.selection[n])await run('UPDATE chinese_items SET data=? WHERE id=?',[JSON.stringify({...item.data,speaking_selected:source.selection[n]}),item.id]);
    const [current]=await run('SELECT speaking_settings FROM chinese_sets WHERE id=?',[set.id]);
    if(JSON.stringify(stable(json(current.speaking_settings)))!==JSON.stringify(stable(source.settings)))await run('UPDATE chinese_sets SET speaking_settings=? WHERE id=?',[JSON.stringify(source.settings),set.id]);
   }
   results.push({lesson:source.lesson,questions:changed.questions,assigned:source.selection.filter(Boolean).length,speaking_changes:changed.changes,missing_vocabulary:words?.missing_count||0,added_vocabulary:words?.added||0});
  }
  const afterItems=(await run(`SELECT * FROM chinese_items WHERE set_id IN (${marks})`,ids)).map(i=>({...i,data:json(i.data)})).filter(i=>originalIds.has(i.id));
  assert.equal(digest(afterItems),digest(beforeItems),'Existing vocabulary/quiz content changed');
  assert.deepEqual(Object.fromEntries(Object.entries(await history()).map(([k,v])=>[k,digest(v)])),before,'Learning history or unrelated metadata changed');
  return results;
 });
 console.log(JSON.stringify({ready:true,mode:apply?'applied-production':'read-only-preview',targetProject:expectedProject,schema,resultTablesReady:resultsReady||apply,backup:backupPath,historyPreserved:true,lessons:report},null,2));
}catch(error){console.error(JSON.stringify({ready:false,stage,code:error.code||'DEPLOY_CHECK_FAILED',message:error.name==='AssertionError'?error.message:'Deployment check failed; no credentials printed.'}));process.exitCode=1;}
finally{await closePool?.();}
