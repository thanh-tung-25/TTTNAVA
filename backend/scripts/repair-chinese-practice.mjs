// Repair fill and dialogue exercises in ten published HSK 1 lessons. Preview first;
// apply the exact reviewed plan in one transaction with a content backup.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {parseEnv} from 'node:util';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import mysql from 'mysql2/promise';
import {createPostgresDatabase} from '../src/config/postgres.js';
import {postgresParameters} from '../src/config/postgres-parameters.js';
import {repairCurriculumPractice} from '../src/services/chinese-practice-repair.js';
import {validateCurriculumChinese} from '../src/services/chinese-curriculum.js';
import {validateActivities} from '../src/services/chinese-activities.js';

const args=process.argv.slice(2),remote=args.includes('--production'),apply=args.includes('--apply'),at=args.indexOf('--expected'),expected=at<0?null:args[at+1];
assert(args.every((arg,i)=>['--apply','--production','--expected'].includes(arg)||at>=0&&i===at+1),'Unsupported argument');
if(apply)assert(/^[a-f0-9]{64}$/.test(expected||''),'Apply requires the preview fingerprint');
const settings=parseEnv(await readFile(new URL(remote?'../.env.vercel':'../.env',import.meta.url),'utf8'));
if(remote){assert.equal(settings.DB_DRIVER,'postgres');assert.equal(settings.PGSCHEMA,'ttnava_stage');}
else{assert.equal(settings.DB_DRIVER||'mysql','mysql');assert(['localhost','127.0.0.1','::1'].includes(settings.DB_HOST));assert.equal(settings.DB_NAME,'kids_learning');}
const json=v=>typeof v==='string'?JSON.parse(v):v;
const stable=v=>v instanceof Date?v.toISOString():Array.isArray(v)?v.map(stable):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])])):v;
const hash=v=>createHash('sha256').update(JSON.stringify(stable(v))).digest('hex');
const pg=remote?createPostgresDatabase({...settings,PG_READ_ONLY:apply?'false':'true'},fileURLToPath(new URL('../',import.meta.url))):null;
let connection,stage='connect';
try{
 if(!remote){connection=await mysql.createConnection({host:settings.DB_HOST,port:Number(settings.DB_PORT||3306),user:settings.DB_USER,password:settings.DB_PASS,database:settings.DB_NAME,charset:'utf8mb4',timezone:'Z'});await connection.query("SET time_zone='+00:00'");}
 const execute=async client=>{
  const run=async(sql,params=[])=>{if(!remote)return (await client.query(sql,params))[0];const s=postgresParameters(sql,params);return (await client.query(s.text,s.values)).rows;};
  if(remote){await run('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');if(apply)await run("SELECT pg_advisory_xact_lock(hashtext('ttnava-chinese-curriculum-sync'))");}
  const lessons=await run("SELECT id,position,title FROM chinese_lessons WHERE level_id=1 AND status='published' ORDER BY position"+(apply?' FOR UPDATE':''));
  assert.equal(lessons.length,10);const plans=[];stage='plan';
  for(let number=1;number<=10;number++){
   const lesson=lessons.find(l=>Number(l.position)===number);assert(lesson);
   const [old]=await run('SELECT * FROM chinese_activities WHERE lesson_id=?'+(apply?' FOR UPDATE':''),[lesson.id]);assert(old);assert.equal(old.status,'published');
   old.data=json(old.data);const next=repairCurriculumPractice(number,old.data);
   validateActivities({...next,status:old.status,revision:Number(old.revision)});
   const fill=next.tasks.filter(t=>t.type==='fill');validateCurriculumChinese(fill,number);
   assert.equal(fill.length,10);assert.equal(new Set(fill.map(t=>t.answer)).size,10);
   const dialogue=next.tasks.filter(t=>t.type==='dialogue');validateCurriculumChinese(dialogue,number);
   assert.equal(dialogue.length,10);assert(dialogue.every(t=>t.options.length===3&&new Set(t.options).size===3));
   assert.deepEqual(next.tasks.filter(t=>!['fill','dialogue'].includes(t.type)),old.data.tasks.filter(t=>!['fill','dialogue'].includes(t.type)));
   plans.push({lesson,old,next,changed:hash(old.data)!==hash(next)});
  }
  const fingerprint=hash(plans),changed=plans.filter(p=>p.changed);
  const report=plans.map(p=>({lesson:Number(p.lesson.position),changed:p.changed,old_fill:p.old.data.tasks.filter(t=>t.type==='fill').length,old_distinct_answers:new Set(p.old.data.tasks.filter(t=>t.type==='fill').map(t=>t.answer)).size,new_fill:10,new_answers:p.next.tasks.filter(t=>t.type==='fill').map(t=>t.answer),old_dialogue:p.old.data.tasks.filter(t=>t.type==='dialogue').length,new_dialogue:10}));
  if(!apply)return {mode:'preview',target:remote?'production':'local',fingerprint,changed_lessons:changed.length,lessons:report};
  assert.equal(fingerprint,expected,'Content changed since preview; no writes applied');
  if(!changed.length)return {mode:'unchanged',target:remote?'production':'local',fingerprint,changed_lessons:0};
  const protectedTables=['profiles','courses','course_enrollments','course_orders','course_access_audit','diamond_ledger','chinese_reviews','chinese_review_events','chinese_progress','chinese_attempts','chinese_daily_study','chinese_tests','chinese_speaking_submissions','chinese_speaking_clips','chinese_ai_chat_sessions','chinese_street_progress'];
  const protectedHash=async()=>{
   const result={};for(const table of protectedTables){
    if(remote){const [r]=await run(`SELECT count(*) total,md5(coalesce(string_agg(to_jsonb(t)::text,'' ORDER BY to_jsonb(t)::text),'')) digest FROM ${table} t`);result[table]=r;}
    else result[table]=hash((await run('SELECT * FROM '+table)).map(r=>JSON.stringify(stable(r))).sort());
   }return result;
  };
  const before=await protectedHash();stage='backup';
  const directory=new URL('../backups/chinese-practice-repair/',import.meta.url);await mkdir(directory,{recursive:true});
  const backup=new URL((remote?'production-':'local-')+new Date().toISOString().replace(/[:.]/g,'-')+'.json',directory);
  await writeFile(backup,JSON.stringify({fingerprint,lessons:plans.map(({lesson,old})=>({lesson,activities:old})),protected:before},null,2),'utf8');
  stage='apply';
  for(const p of changed)await run('UPDATE chinese_activities SET data=?,revision=revision+1,updated_at=CURRENT_TIMESTAMP WHERE lesson_id=? AND revision=?',[JSON.stringify(p.next),p.lesson.id,p.old.revision]);
  stage='verify';
  for(const p of plans){
   const [saved]=await run('SELECT * FROM chinese_activities WHERE lesson_id=?',[p.lesson.id]);
   assert.equal(hash(json(saved.data)),hash(p.next));assert.equal(saved.status,p.old.status);
   assert.equal(Number(saved.revision),Number(p.old.revision)+(p.changed?1:0));
   assert.equal(hash(repairCurriculumPractice(Number(p.lesson.position),json(saved.data))),hash(p.next));
  }
  assert.deepEqual(await protectedHash(),before,'Student records changed; roll back');
  return {mode:'applied',target:remote?'production':'local',fingerprint,backup:fileURLToPath(backup),history_preserved:true,changed_lessons:changed.length,lessons:report};
 };
 let result;
 if(remote)result=await pg.transaction(execute);
 else{await connection.beginTransaction();try{result=await execute(connection);if(apply)await connection.commit();else await connection.rollback();}catch(e){await connection.rollback();throw e;}}
 console.log(JSON.stringify(result,null,2));
}catch(error){console.error(JSON.stringify({ready:false,stage,code:error.code||error.name,message:error.name==='AssertionError'?error.message:'Repair failed; private connection details omitted.'}));process.exitCode=1;}
finally{await connection?.end().catch(()=>{});await pg?.close();}
