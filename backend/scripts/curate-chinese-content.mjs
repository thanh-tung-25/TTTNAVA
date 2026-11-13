// Soft-hide repetitive definitions, keep existing IDs and student records.
// Default: read-only plan. Apply requires the exact reviewed fingerprint.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {parseEnv} from 'node:util';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import mysql from 'mysql2/promise';
import {createPostgresDatabase} from '../src/config/postgres.js';
import {postgresParameters} from '../src/config/postgres-parameters.js';
import {curateChineseLesson} from '../src/services/chinese-content-curation.js';
import {issues} from '../src/validators/chinese.js';
import {validateActivities} from '../src/services/chinese-activities.js';
const args=process.argv.slice(2),apply=args.includes('--apply'),at=args.indexOf('--expected'),expected=at<0?null:args[at+1],remote=args.includes('--production');
assert(args.every((arg,i)=>['--apply','--production','--expected'].includes(arg)||at>=0&&i===at+1),'Unsupported argument');if(apply)assert(/^[a-f0-9]{64}$/.test(expected||''),'Apply requires reviewed --expected fingerprint');
const root=new URL('../../',import.meta.url),settings=parseEnv(await readFile(new URL(remote?'backend/.env.vercel':'backend/.env',root),'utf8'));
if(remote){assert.equal(settings.DB_DRIVER,'postgres');assert.equal(settings.PGSCHEMA,'ttnava_stage');assert.equal(new URL(settings.SUPABASE_URL).hostname,'njaasgcfgjismpmzoncb.supabase.co');}
else{assert.equal(settings.DB_DRIVER||'mysql','mysql');assert(['localhost','127.0.0.1','::1'].includes(settings.DB_HOST));assert.equal(settings.DB_NAME,'kids_learning');}
const json=value=>typeof value==='string'?JSON.parse(value):value;
const stable=value=>value instanceof Date?value.toISOString():Array.isArray(value)?value.map(stable):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,stable(value[key])])):value;
const hash=value=>createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
const pg=remote?createPostgresDatabase({...settings,PG_READ_ONLY:apply?'false':'true'},fileURLToPath(new URL('../',import.meta.url))):null;
let connection,stage='connect';
try{
 if(!remote){connection=await mysql.createConnection({host:settings.DB_HOST,port:Number(settings.DB_PORT||3306),user:settings.DB_USER,password:settings.DB_PASS,database:settings.DB_NAME,charset:'utf8mb4',timezone:'Z'});await connection.query("SET time_zone='+00:00'");}
 const execute=async client=>{
  const run=async(sql,params=[])=>{if(!remote)return (await client.query(sql,params))[0];const statement=postgresParameters(sql,params);return (await client.query(statement.text,statement.values)).rows;};
  if(apply&&remote)await run("SELECT pg_advisory_xact_lock(hashtext('ttnava-chinese-curriculum-sync'))");
  const lessons=await run("SELECT id,position,title FROM chinese_lessons WHERE level_id=1 AND status='published' ORDER BY position"+(apply?' FOR UPDATE':''));assert.equal(lessons.length,10);
  const source=[],plans=[],seenWords=new Set();stage='plan';
  for(let n=1;n<=10;n++){
   const lesson=lessons.find(l=>Number(l.position)===n);assert(lesson);
   const sets=await run("SELECT id,title,position,status FROM chinese_sets WHERE lesson_id=? AND status='published' ORDER BY position"+(apply?' FOR UPDATE':''),[lesson.id]);assert.equal(sets.length,1);const set=sets[0];
   const items=(await run('SELECT * FROM chinese_items WHERE set_id=? AND active=1 ORDER BY position,id'+(apply?' FOR UPDATE':''),[set.id])).map(item=>({...item,active:Number(item.active),data:json(item.data)}));
   const [activity]=await run('SELECT * FROM chinese_activities WHERE lesson_id=?'+(apply?' FOR UPDATE':''),[lesson.id]);assert(activity);activity.data=json(activity.data);
   const plan=curateChineseLesson({number:n,items,activities:activity.data,seenWords});assert.deepEqual(issues(plan.items),[]);assert(plan.report.after.questions>=20);assert(Object.values(plan.report.activity_types).every(count=>count>0));validateActivities({...plan.activities,revision:activity.revision,status:activity.status});
   source.push({lesson,set,items,activity});plans.push({...plan,lesson,set,oldActivity:activity});
  }
  const fingerprint=hash(source),report=plans.map(p=>p.report),changes=plans.reduce((total,p)=>total+p.removed.length+p.taskRemovals.length+p.items.filter(item=>{const old=source.find(s=>s.set.id===p.set.id).items.find(i=>i.id===item.id);return old.position!==item.position||hash(old.data)!==hash(item.data);}).length,0);
  if(!apply)return {ready:true,target:remote?'production-postgres':'local-mysql',mode:'preview',fingerprint,changes,lessons:report};
  assert.equal(fingerprint,expected,'Curriculum changed since preview; no writes applied');
  const protectedTables=['profiles','courses','course_enrollments','course_orders','course_access_audit','diamond_ledger','chinese_reviews','chinese_review_events','chinese_progress','chinese_attempts','chinese_tests','chinese_speaking_submissions','chinese_speaking_clips','chinese_ai_chat_sessions','chinese_street_progress'];
  const protectedHash=async()=>{const result={};for(const table of protectedTables){const rows=await run('SELECT * FROM '+table);result[table]={count:rows.length,hash:hash(rows.map(row=>JSON.stringify(stable(row))).sort())};}return result;};
  const before=await protectedHash();stage='backup';
  const directory=new URL('backend/backups/chinese-curation/',root);await mkdir(directory,{recursive:true});const backup='backend/backups/chinese-curation/'+(remote?'production-':'local-')+new Date().toISOString().replace(/[:.]/g,'-')+'.json';
  await writeFile(new URL(backup,root),JSON.stringify({created_at:new Date().toISOString(),target:remote?'production-postgres':'local-mysql',fingerprint,source,protected_before:before},null,2),'utf8');stage='apply';
  for(const plan of plans){
   const next=new Map(plan.items.map(item=>[item.id,{...item,active:1}]));for(const {item}of plan.removed)next.set(item.id,{...item,active:0});
   const previous=source.find(s=>s.set.id===plan.set.id).items,updates=[...next.values()].filter(item=>{const old=previous.find(i=>i.id===item.id);return old.active!==item.active||old.position!==item.position||hash(old.data)!==hash(item.data);});
   for(let start=0;start<updates.length;start+=75){const rows=updates.slice(start,start+75),params=[];let sql='UPDATE chinese_items SET ';
    for(const [index,column]of ['active','position','data'].entries()){if(index)sql+=',';sql+=column+'=CASE id ';for(const row of rows){sql+='WHEN ? THEN '+(column==='data'&&remote?'?::jsonb':'?')+' ';params.push(row.id,column==='data'?JSON.stringify(row.data):row[column]);}sql+='ELSE '+column+' END ';}
    sql+='WHERE set_id=? AND id IN ('+rows.map(()=>'?').join(',')+')';params.push(plan.set.id,...rows.map(row=>row.id));await run(sql,params);
   }
   if(hash(plan.oldActivity.data)!==hash(plan.activities))await run('UPDATE chinese_activities SET data=?,revision=revision+1,updated_at=CURRENT_TIMESTAMP WHERE lesson_id=?',[JSON.stringify(plan.activities),plan.lesson.id]);
  }
  stage='verify';const verifySeen=new Set();
  for(const plan of plans){const items=(await run('SELECT * FROM chinese_items WHERE set_id=? AND active=1 ORDER BY position,id',[plan.set.id])).map(i=>({...i,active:Number(i.active),data:json(i.data)}));assert.equal(items.length,plan.items.length);for(let index=0;index<items.length;index++){assert.equal(items[index].id,plan.items[index].id);assert.equal(hash(items[index].data),hash(plan.items[index].data));}
   const [activity]=await run('SELECT data FROM chinese_activities WHERE lesson_id=?',[plan.lesson.id]);assert.equal(hash(json(activity.data)),hash(plan.activities));
   const rerun=curateChineseLesson({number:Number(plan.lesson.position),items,activities:json(activity.data),seenWords:verifySeen});assert.equal(rerun.removed.length,0);assert.equal(rerun.taskRemovals.length,0);assert.equal(hash(rerun.items.map(i=>({id:i.id,position:i.position,data:i.data}))),hash(items.map(i=>({id:i.id,position:i.position,data:i.data}))),'Rerun would change the published bank');assert.equal(hash(rerun.activities),hash(plan.activities));
  }
  assert.deepEqual(await protectedHash(),before,'Student history or accounts changed; roll back');
  return {ready:true,target:remote?'production-postgres':'local-mysql',mode:'applied',fingerprint,backup,history_preserved:true,changes,lessons:report};
 };
 let result;if(remote)result=await pg.transaction(execute);else{await connection.beginTransaction();try{result=await execute(connection);if(apply)await connection.commit();else await connection.rollback();}catch(error){await connection.rollback();throw error;}}
 console.log(JSON.stringify(result,null,2));
}catch(error){console.error(JSON.stringify({ready:false,stage,code:error.code||error.name,message:error.name==='AssertionError'?error.message:'Curation failed; private connection details omitted.'}));process.exitCode=1;}
finally{await connection?.end().catch(()=>{});await pg?.close();}
