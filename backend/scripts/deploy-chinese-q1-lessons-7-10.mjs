// Copy only the four reviewed local lessons to the established Production DB.
// Default is a read-only preview; --apply adds new rows, never overwrites data.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {parseEnv} from 'node:util';
import {createHash} from 'node:crypto';
import mysql from 'mysql2/promise';

const root=new URL('../../',import.meta.url),apply=process.argv.includes('--apply');
const expectedProject='njaasgcfgjismpmzoncb',schema='ttnava_stage',numbers=[7,8,9,10];
const stable=v=>v instanceof Date?v.toISOString():Buffer.isBuffer(v)?v.toString('base64'):Array.isArray(v)?v.map(stable):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])])):v;
const hash=v=>createHash('sha256').update(JSON.stringify(stable(v))).digest('hex');
const parse=v=>typeof v==='string'?JSON.parse(v):v;
const counts=items=>Object.fromEntries(['vocabulary','question','grammar','reading','speaking'].map(kind=>[kind,items.filter(item=>kind==='speaking'?item.data.practice==='speaking':item.kind===kind).length]));
let closePool,stage='configuration';
try{
 assert(process.argv.slice(2).every(arg=>arg==='--apply'),'Unsupported argument');
 const local=parseEnv(await readFile(new URL('backend/.env',root),'utf8')),remote=parseEnv(await readFile(new URL('backend/.env.vercel',root),'utf8'));
 assert.equal(local.DB_DRIVER||'mysql','mysql');assert(['127.0.0.1','localhost','::1'].includes(local.DB_HOST||'127.0.0.1'));
 assert.equal(remote.DB_DRIVER,'postgres');assert.equal(remote.PGSCHEMA,schema);
 assert.equal(new URL(remote.SUPABASE_URL).hostname,expectedProject+'.supabase.co');assert(remote.PGHOST.endsWith('.pooler.supabase.com'));assert(remote.PGUSER.endsWith('.'+expectedProject));
 stage='local-source';
 const connection=await mysql.createConnection({host:local.DB_HOST||'127.0.0.1',port:Number(local.DB_PORT||3306),user:local.DB_USER||'root',password:local.DB_PASS||'',database:local.DB_NAME||'kids_learning',charset:'utf8mb4'}),sources=[];
 try{
  for(const number of numbers){
   const [lessons]=await connection.query("SELECT * FROM chinese_lessons WHERE level_id=1 AND position=? AND status='published'",[number]);assert.equal(lessons.length,1,`Local lesson ${number}: ambiguous or unpublished`);const lesson=lessons[0];
   assert(lesson.description.includes('q1-7-10:'),`Local lesson ${number}: unexpected source`);
   const [sets]=await connection.query("SELECT * FROM chinese_sets WHERE lesson_id=? AND status='published'",[lesson.id]);assert.equal(sets.length,1,`Local lesson ${number}: expected one published set`);const set={...sets[0],speaking_settings:parse(sets[0].speaking_settings)};
   const [documents]=await connection.query('SELECT * FROM chinese_documents WHERE id=?',[set.document_id]);assert.equal(documents.length,1);const document=documents[0];assert.equal(document.filename,`cau-hoi-tu-vung-tieng-trung-bai-${number}.docx`);assert(Buffer.isBuffer(document.original));assert.equal(createHash('sha256').update(document.original).digest('hex'),document.sha256);
   const [rows]=await connection.query('SELECT * FROM chinese_items WHERE set_id=? AND active=1 ORDER BY position,id',[set.id]);const items=rows.map(item=>({...item,data:parse(item.data)}));assert(items.length>50);
   const [activities]=await connection.query("SELECT * FROM chinese_activities WHERE lesson_id=? AND status='published'",[lesson.id]);assert.equal(activities.length,1);const activity={...activities[0],data:parse(activities[0].data)};assert.equal(activity.data.tasks.length,40);
   sources.push({number,lesson,set,document,items,activity});
  }
 }finally{await connection.end();}
 Object.assign(process.env,remote,{PG_READ_ONLY:apply?'false':'true'});
 const db=await import('../src/config/db.js');closePool=db.closePool;assert(db.isPostgres);
 const {query,withTransaction}=db,{itemSchema,issues,speakingSettingsSchema}=await import('../src/validators/chinese.js'),{validateActivities}=await import('../src/services/chinese-activities.js');
 for(const source of sources){source.items.forEach(item=>itemSchema.parse(item));assert.deepEqual(issues(source.items),[]);speakingSettingsSchema.parse(source.set.speaking_settings);validateActivities({...source.activity.data,status:'published',revision:0});assert.equal(counts(source.items).speaking,10);}
 stage='production-preview';
 const available=new Set((await query('SELECT table_name FROM information_schema.tables WHERE table_schema=current_schema()')).map(row=>row.table_name));
 const tables=['chinese_levels','chinese_lessons','chinese_documents','chinese_sets','chinese_items','chinese_activities','chinese_reviews','chinese_review_events','chinese_progress','chinese_attempts','chinese_tests','chinese_speaking_submissions','chinese_speaking_clips'].filter(table=>available.has(table));
 assert(tables.includes('chinese_speaking_submissions'),'Production speaking schema is not ready');
 let backup;
 const result=await withTransaction(async c=>{
  const run=async(sql,p=[]) => (await c.query(sql,p))[0];
  // A consistent snapshot avoids mistaking other users' concurrent study for
  // an unintended change made by this content-only transaction.
  await run('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
  if(apply){await run("SELECT pg_advisory_xact_lock(hashtext('ttnava-q1-lessons-7-10'))");await run('SELECT id FROM chinese_levels WHERE id=1 FOR UPDATE');}
  const existing=await run('SELECT * FROM chinese_lessons WHERE level_id=1 ORDER BY position');
  const planned=[];
  for(const source of sources){
   const matches=existing.filter(row=>Number(row.position)===source.number||row.title.includes(source.lesson.title.split(' — ')[0].replace(/^Bài\s*\d+[.\s]*/u,'')));
   assert(matches.length<=1,`Production lesson ${source.number}: ambiguous target`);
   if(matches.length){
    const sets=await run('SELECT * FROM chinese_sets WHERE lesson_id=?',[matches[0].id]);assert.equal(sets.length,1,`Production lesson ${source.number}: refusing to replace existing sets`);
    const items=(await run('SELECT kind,position,data,active FROM chinese_items WHERE set_id=? AND active=1 ORDER BY position,id',[sets[0].id])).map(row=>({...row,data:parse(row.data)}));
    assert.equal(hash(items.map(({kind,data})=>({kind,data}))),hash(source.items.map(({kind,data})=>({kind,data}))),`Production lesson ${source.number} already exists with different content; no overwrite`);
    planned.push({...source,exists:true,remoteLessonId:matches[0].id,remoteSetId:sets[0].id});continue;
   }
   for(const [table,ids]of [['chinese_lessons',[source.lesson.id]],['chinese_sets',[source.set.id]],['chinese_documents',[source.document.id]],['chinese_items',source.items.map(item=>item.id)]]){
    const collision=await run(`SELECT id FROM ${table} WHERE id IN (${ids.map(()=>'?').join(',')}) LIMIT 1`,ids);assert.equal(collision.length,0,`Unexpected ID collision in ${table}`);
   }
   planned.push({...source,exists:false});
  }
  const additions=planned.filter(source=>!source.exists),newIds={chinese_lessons:additions.map(s=>s.lesson.id),chinese_documents:additions.map(s=>s.document.id),chinese_sets:additions.map(s=>s.set.id),chinese_items:additions.flatMap(s=>s.items.map(item=>item.id)),chinese_activities:additions.map(s=>s.lesson.id)};
  const fingerprints=async(excludeNew=false)=>{
   const result={};for(const table of tables){const ids=excludeNew?newIds[table]:null,column=table==='chinese_activities'?'lesson_id':'id',filter=ids?.length?` WHERE ${column} NOT IN (${ids.map(()=>'?').join(',')})`:'';
    const [row]=await run(`SELECT COUNT(*) AS count,md5(COALESCE(string_agg(to_jsonb(t)::text,'' ORDER BY to_jsonb(t)::text),'')) AS digest FROM (SELECT * FROM ${table}${filter}) t`,ids||[]);result[table]=row;
   }return result;
  };
  const before=await fingerprints();
  if(apply&&additions.length){
   const directory=new URL('backend/backups/chinese-q1-7-10-online/',root);await mkdir(directory,{recursive:true});backup='backend/backups/chinese-q1-7-10-online/'+new Date().toISOString().replace(/[:.]/g,'-')+'.json';
   await writeFile(new URL(backup,root),JSON.stringify({created_at:new Date().toISOString(),project:expectedProject,schema,before,additions:additions.map(s=>({number:s.number,lesson_id:s.lesson.id,set_id:s.set.id,document_id:s.document.id,items:s.items.length,document_sha256:s.document.sha256}))},null,2),'utf8');
   stage='production-add-only';
   for(const source of additions){
    const {lesson,set,document,items,activity}=source;
    await run('INSERT INTO chinese_lessons(id,level_id,title,position,description,image_url,status) VALUES (?,?,?,?,?,?,?)',[lesson.id,1,lesson.title,lesson.position,lesson.description,lesson.image_url||'','published']);
    // The API supports a private bytea fallback when no Storage asset exists.
    // Four small Word documents and the lesson rows commit atomically together.
    await run('INSERT INTO chinese_documents(id,filename,sha256,original,raw_text) VALUES (?,?,?,?,?)',[document.id,document.filename,document.sha256,document.original,document.raw_text]);
    await run('INSERT INTO chinese_sets(id,lesson_id,document_id,title,position,status,processing_status,speaking_settings) VALUES (?,?,?,?,?,?,?,?)',[set.id,lesson.id,document.id,set.title,set.position,'published','ready',JSON.stringify(set.speaking_settings)]);
    for(let index=0;index<items.length;index+=100){const batch=items.slice(index,index+100);await run(`INSERT INTO chinese_items(id,set_id,kind,position,data,active) VALUES ${batch.map(()=>'(?,?,?,?,?,?)').join(',')}`,batch.flatMap(item=>[item.id,set.id,item.kind,item.position,JSON.stringify(item.data),1]));}
    await run('INSERT INTO chinese_activities(lesson_id,status,data,revision) VALUES (?,?,?,?)',[lesson.id,'published',JSON.stringify(activity.data),activity.revision]);
    const saved=await run('SELECT kind,data FROM chinese_items WHERE set_id=? AND active=1 ORDER BY position,id',[set.id]);assert.equal(hash(saved.map(item=>({...item,data:parse(item.data)}))),hash(items.map(({kind,data})=>({kind,data}))));
   }
  }
  assert.deepEqual(await fingerprints(apply),before,'Existing course data or history changed');
  return planned.map(source=>({lesson:source.number,status:source.exists?'already-present':apply?'added':'would-add',lesson_id:source.remoteLessonId||source.lesson.id,set_id:source.remoteSetId||source.set.id,...counts(source.items),activities:source.activity.data.tasks.length,assigned:source.items.filter(item=>item.data.practice==='speaking'&&item.data.speaking_selected!==false).length}));
 });
 console.log(JSON.stringify({ready:true,mode:apply?'applied-production':'read-only-preview',project:expectedProject,schema,oldContentAndHistoryPreserved:true,backup,lessons:result},null,2));
}catch(error){console.error(JSON.stringify({ready:false,stage,code:error.code||error.name,message:error.name==='AssertionError'?error.message:'Content sync failed; credentials were not printed.'}));process.exitCode=1;}
finally{await closePool?.();}
