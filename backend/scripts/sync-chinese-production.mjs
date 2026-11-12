// Reviewed, one-way curriculum sync. Default is READ ONLY. Existing online IDs,
// accounts and learning records are preserved. No media/student data is copied.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {parseEnv} from 'node:util';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import mysql from 'mysql2/promise';
import {createPostgresDatabase} from '../src/config/postgres.js';
import {itemSchema,issues,speakingSettingsSchema} from '../src/validators/chinese.js';
import {validateActivities} from '../src/services/chinese-activities.js';
import {streetSettingsSchema} from '../src/services/chinese-street.js';
import {defaultChatSettings} from '../../frontend/assets/js/chinese-ai-chat-data.js';

const root=new URL('../../',import.meta.url),args=process.argv.slice(2),apply=args.includes('--apply'),expectedAt=args.indexOf('--expected');
assert(args.every((arg,i)=>arg==='--apply'||arg==='--expected'||i===expectedAt+1&&expectedAt>=0),'Unsupported argument');
const expected=expectedAt>=0?args[expectedAt+1]:null;if(apply)assert(/^[a-f0-9]{64}$/.test(expected||''),'Apply requires a reviewed --expected fingerprint');
const local=parseEnv(await readFile(new URL('backend/.env',root),'utf8')),remote=parseEnv(await readFile(new URL('backend/.env.vercel',root),'utf8'));
assert.equal(local.DB_DRIVER||'mysql','mysql');assert(['localhost','127.0.0.1','::1'].includes(local.DB_HOST||'127.0.0.1'));assert.equal(local.DB_NAME,'kids_learning');
assert.equal(remote.DB_DRIVER,'postgres');assert.equal(remote.PGSCHEMA,'ttnava_stage');assert.equal(new URL(remote.SUPABASE_URL).hostname,'njaasgcfgjismpmzoncb.supabase.co');assert(remote.PGHOST.endsWith('.pooler.supabase.com'));assert(remote.PGUSER.endsWith('.njaasgcfgjismpmzoncb'));
const pg=createPostgresDatabase({...remote,PG_READ_ONLY:apply?'false':'true'},fileURLToPath(new URL('../',import.meta.url))),connection=await mysql.createConnection({host:local.DB_HOST,port:Number(local.DB_PORT||3306),user:local.DB_USER,password:local.DB_PASS,database:local.DB_NAME,charset:'utf8mb4'});
const json=v=>typeof v==='string'?JSON.parse(v):v;
const stable=v=>v instanceof Date?v.toISOString():Array.isArray(v)?v.map(stable):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])])):v;
const hash=v=>createHash('sha256').update(JSON.stringify(stable(v))).digest('hex');
const semanticData=data=>{const {vocabulary_id,...rest}=data;return rest;};
const identity=i=>i.kind==='vocabulary'?'vocabulary:'+i.data.hanzi.normalize('NFC').trim():i.kind==='question'?'question:'+hash(semanticData(i.data)):i.kind+':'+(i.data.practice||'')+':'+(i.data.text||i.data.title||'');
const parseItems=rows=>rows.map(i=>({...i,data:json(i.data)}));
const protectedNames=['profiles','courses','course_enrollments','course_orders','course_access_audit','diamond_ledger','chinese_reviews','chinese_review_events','chinese_progress','chinese_attempts','chinese_tests','chinese_speaking_submissions','chinese_speaking_clips','chinese_ai_chat_sessions','chinese_street_progress'];
const newTables=['chinese_ai_chat_settings','chinese_ai_chat_sessions','chinese_street_lessons','chinese_street_progress'];
let stage='source',backup;
try{
 const localRun=async(sql,p=[]) =>(await connection.query(sql,p))[0],source=[];
 const lessons=await localRun("SELECT * FROM chinese_lessons WHERE level_id=1 AND status='published' ORDER BY position");assert.equal(lessons.length,10);
 for(const number of Array.from({length:10},(_,i)=>i+1)){
  const matches=lessons.filter(l=>Number(l.position)===number);assert.equal(matches.length,1,'Ambiguous local lesson '+number);const lesson=matches[0];
  const sets=await localRun("SELECT s.*,d.filename,d.sha256 FROM chinese_sets s LEFT JOIN chinese_documents d ON d.id=s.document_id WHERE s.lesson_id=? AND s.status='published' ORDER BY s.position",[lesson.id]);assert.equal(sets.length,1);
  const set={...sets[0],speaking_settings:json(sets[0].speaking_settings)},items=parseItems(await localRun('SELECT * FROM chinese_items WHERE set_id=? AND active=1 ORDER BY position,id',[set.id]));
  items.forEach(i=>itemSchema.parse(i));assert.deepEqual(issues(items),[],'Invalid local items in lesson '+number);speakingSettingsSchema.parse(set.speaking_settings);
  const [activityRow]=await localRun('SELECT * FROM chinese_activities WHERE lesson_id=?',[lesson.id]);assert(activityRow);const activity={...activityRow,data:json(activityRow.data)};validateActivities({...activity.data,status:activity.status,revision:activity.revision});
  const [chatRow]=await localRun('SELECT data FROM chinese_ai_chat_settings WHERE lesson_id=?',[lesson.id]),[streetRow]=await localRun('SELECT data FROM chinese_street_lessons WHERE lesson_id=?',[lesson.id]);
  const chat=chatRow?json(chatRow.data):defaultChatSettings(lesson);assert.equal(typeof chat.opening,'string');assert(chat.required_words.length<=20);assert(chat.max_turns<=10);
  assert(streetRow,'Missing local street content');const street=json(streetRow.data);streetSettingsSchema.parse({...street,revision:0});
  source.push({number,lesson,set,items,activity,chat,street});
 }
 await connection.end();stage='plan';
 const migrations=await Promise.all(['035_chinese_ai_chat.sql','036_chinese_street.sql'].map(name=>readFile(new URL('backend/sql/postgres/'+name,root),'utf8')));
 const result=await pg.transaction(async client=>{
  const run=async(sql,p=[]) =>(await client.query(sql,p)).rows;
  await run('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
  if(apply){await run("SELECT pg_advisory_xact_lock(hashtext('ttnava-chinese-curriculum-sync'))");await run('SELECT id FROM chinese_levels WHERE id=1 FOR UPDATE');}
  const available=new Set((await run('SELECT table_name FROM information_schema.tables WHERE table_schema=current_schema()')).map(r=>r.table_name));
  const onlineLessons=await run("SELECT * FROM chinese_lessons WHERE level_id=1 AND status='published' ORDER BY position"+(apply?' FOR UPDATE':''));assert.equal(onlineLessons.length,10);
  const plans=[],itemMap=new Map();
  for(const sourceLesson of source){
   const {number,lesson,set,items}=sourceLesson,targets=onlineLessons.filter(l=>Number(l.position)===number);assert.equal(targets.length,1,'Ambiguous online lesson '+number);const target=targets[0];
   const sets=await run("SELECT s.*,d.filename,d.sha256 FROM chinese_sets s LEFT JOIN chinese_documents d ON d.id=s.document_id WHERE s.lesson_id=$1 AND s.status='published' ORDER BY s.position",[target.id]);assert.equal(sets.length,1);const targetSet={...sets[0],speaking_settings:json(sets[0].speaking_settings)};
   assert.equal(targetSet.filename,set.filename,'Unexpected source document');assert.equal(targetSet.sha256,set.sha256,'Word changed; requires a separate reviewed file update');
   const targetItems=parseItems(await run('SELECT * FROM chinese_items WHERE set_id=$1 AND active=1 ORDER BY position,id'+(apply?' FOR UPDATE':''),[targetSet.id]));assert.equal(targetItems.length,items.length,'Refusing to add/remove existing quiz or vocabulary items');
   const used=new Set(),pairs=[];
   for(const item of items){
    const key=identity(item),candidates=targetItems.filter(t=>!used.has(t.id)&&t.kind===item.kind&&identity(t)===key);
    let chosen=candidates.find(t=>t.id===item.id)|| (candidates.length===1?candidates[0]:candidates.find(t=>Number(t.position)===Number(item.position)));
    if(!chosen&&item.kind==='question'){const byPosition=targetItems.filter(t=>!used.has(t.id)&&t.kind===item.kind&&Number(t.position)===Number(item.position));if(byPosition.length===1)chosen=byPosition[0];}
    assert(chosen,'Could not safely match '+item.kind+' in lesson '+number);used.add(chosen.id);itemMap.set(item.id,chosen.id);pairs.push({source:item,target:chosen});
   }
   assert.equal(used.size,targetItems.length,'Unmatched online items');
   const [oldActivity]=await run('SELECT * FROM chinese_activities WHERE lesson_id=$1'+(apply?' FOR UPDATE':''),[target.id]);assert(oldActivity);oldActivity.data=json(oldActivity.data);
   const [oldChat]=available.has('chinese_ai_chat_settings')?await run('SELECT * FROM chinese_ai_chat_settings WHERE lesson_id=$1',[target.id]):[];
   const [oldStreet]=available.has('chinese_street_lessons')?await run('SELECT * FROM chinese_street_lessons WHERE lesson_id=$1',[target.id]):[];
   plans.push({source:sourceLesson,target,targetSet,pairs,oldActivity,oldChat:oldChat?{...oldChat,data:json(oldChat.data)}:null,oldStreet:oldStreet?{...oldStreet,data:json(oldStreet.data)}:null});
  }
  for(const plan of plans){
   plan.changes=plan.pairs.map(pair=>{const data=structuredClone(pair.source.data);if(data.vocabulary_id){assert(itemMap.has(data.vocabulary_id),'Unmapped vocabulary reference');data.vocabulary_id=itemMap.get(data.vocabulary_id);}return {...pair,nextData:data};}).filter(p=>hash(p.nextData)!==hash(p.target.data)||Number(p.source.position)!==Number(p.target.position));
   plan.activityChanged=hash(plan.source.activity.data)!==hash(plan.oldActivity.data)||plan.source.activity.status!==plan.oldActivity.status;
   plan.chatChanged=hash(plan.source.chat)!==hash(plan.oldChat?.data||null);plan.streetChanged=hash(plan.source.street)!==hash(plan.oldStreet?.data||null);
  }
  const fingerprint=hash({schema:newTables.map(name=>({name,present:available.has(name)})),migrations,plans:plans.map(p=>({source:p.source,target:p.target,targetSet:p.targetSet,pairs:p.pairs,oldActivity:p.oldActivity,oldChat:p.oldChat,oldStreet:p.oldStreet}))});
  if(apply)assert.equal(fingerprint,expected,'Content changed since the reviewed preview; no changes applied');
  const report=plans.map(p=>({lesson:p.source.number,items:p.source.items.length,item_updates:p.changes.length,activity_update:p.activityChanged,chat_update:p.chatChanged,street_update:p.streetChanged,source_lesson_id:p.source.lesson.id,online_lesson_id:p.target.id}));
  if(!apply)return {mode:'read-only-preview',fingerprint,missing_tables:newTables.filter(t=>!available.has(t)),lessons:report};
  stage='backup';
  const fingerprintProtected=async()=>{const result={};for(const table of protectedNames.filter(t=>available.has(t))){const [r]=await run(`SELECT count(*) total,md5(coalesce(string_agg(to_jsonb(t)::text,'' ORDER BY to_jsonb(t)::text),'')) digest FROM ${table} t`);result[table]=r;}return result;};
  const before=await fingerprintProtected();
  const directory=new URL('backend/backups/chinese-production-sync/',root);await mkdir(directory,{recursive:true});backup='backend/backups/chinese-production-sync/'+new Date().toISOString().replace(/[:.]/g,'-')+'.json';
  await writeFile(new URL(backup,root),JSON.stringify({created_at:new Date().toISOString(),project:'njaasgcfgjismpmzoncb',schema:'ttnava_stage',fingerprint,protected_before:before,existing_tables:[...available],curriculum:plans.map(({target,targetSet,pairs,oldActivity,oldChat,oldStreet})=>({lesson:target,set:targetSet,items:pairs.map(p=>p.target),activity:oldActivity,chat:oldChat,street:oldStreet}))},null,2),'utf8');
  stage='apply-schema';for(const sql of migrations)await client.query(sql);
  stage='apply-content';
  for(const plan of plans){
   for(const p of plan.changes)await run('UPDATE chinese_items SET data=$1,position=$2 WHERE id=$3 AND set_id=$4',[JSON.stringify(p.nextData),p.source.position,p.target.id,plan.targetSet.id]);
   if(plan.activityChanged)await run('UPDATE chinese_activities SET data=$1,status=$2,revision=revision+1,updated_at=CURRENT_TIMESTAMP WHERE lesson_id=$3',[JSON.stringify(plan.source.activity.data),plan.source.activity.status,plan.target.id]);
   if(plan.chatChanged)await run('INSERT INTO chinese_ai_chat_settings(lesson_id,data) VALUES ($1,$2) ON CONFLICT(lesson_id) DO UPDATE SET data=EXCLUDED.data,updated_at=CURRENT_TIMESTAMP',[plan.target.id,JSON.stringify(plan.source.chat)]);
   if(plan.streetChanged)await run('INSERT INTO chinese_street_lessons(lesson_id,data,revision) VALUES ($1,$2,1) ON CONFLICT(lesson_id) DO UPDATE SET data=EXCLUDED.data,revision=chinese_street_lessons.revision+1,updated_at=CURRENT_TIMESTAMP',[plan.target.id,JSON.stringify(plan.source.street)]);
  }
  stage='verify';
  for(const plan of plans){
   const rows=parseItems(await run('SELECT * FROM chinese_items WHERE set_id=$1 AND active=1 ORDER BY position,id',[plan.targetSet.id]));assert.equal(rows.length,plan.source.items.length);
   for(const pair of plan.pairs){const current=rows.find(i=>i.id===pair.target.id),data=structuredClone(pair.source.data);if(data.vocabulary_id)data.vocabulary_id=itemMap.get(data.vocabulary_id);assert.equal(hash(current.data),hash(data));assert.equal(Number(current.position),Number(pair.source.position));}
   const [chat]=await run('SELECT data FROM chinese_ai_chat_settings WHERE lesson_id=$1',[plan.target.id]),[street]=await run('SELECT data FROM chinese_street_lessons WHERE lesson_id=$1',[plan.target.id]);assert.equal(hash(json(chat.data)),hash(plan.source.chat));assert.equal(hash(json(street.data)),hash(plan.source.street));
  }
  assert.deepEqual(await fingerprintProtected(),before,'Accounts, history or course access changed');
  return {mode:'applied-production',fingerprint,backup,history_preserved:true,lessons:report};
 });
 console.log(JSON.stringify({ready:true,project:'njaasgcfgjismpmzoncb',schema:'ttnava_stage',...result},null,2));
}catch(error){console.error(JSON.stringify({ready:false,stage,code:error.code||error.name,message:error.name==='AssertionError'?error.message:'Sync failed; private connection details omitted.'}));process.exitCode=1;}
finally{await connection.end().catch(()=>{});await pg.close();}
