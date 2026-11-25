// Apply the additive HSK reward schema required by Vercel. Preview is read-only.
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import dotenv from 'dotenv';

dotenv.config({path:new URL('../.env.vercel',import.meta.url),quiet:true});
dotenv.config({path:new URL('../.env.supabase',import.meta.url),quiet:true});
process.env.DB_DRIVER='postgres';process.env.PGSCHEMA='ttnava_stage';process.env.PGPORT='6543';process.env.PGPOOL_SIZE='1';
const apply=process.argv.includes('--apply');
assert(process.argv.slice(2).every(arg=>arg==='--apply'),'Chỉ hỗ trợ --apply. Mặc định là kiểm tra chỉ đọc.');
process.env.PG_READ_ONLY=apply?'false':'true';
assert.equal(new URL(process.env.SUPABASE_URL).hostname,'njaasgcfgjismpmzoncb.supabase.co');
assert(process.env.PGHOST.endsWith('.pooler.supabase.com'));
assert(process.env.PGUSER.endsWith('.njaasgcfgjismpmzoncb'));
assert.equal(process.env.PGSCHEMA,'ttnava_stage');
const [{query,withTransaction,closePool},{createHash}]=await Promise.all([import('../src/config/db.js'),import('node:crypto')]);
const migrations=['053_chinese_hsk1_test_rewards.sql','054_chinese_active_study_time.sql'];
const protectedTables={
 profiles:'SELECT id,role,deleted_at FROM profiles ORDER BY id',
 chinese_tests:'SELECT id,title,set_ids,duration_seconds,pass_percent,status FROM chinese_tests ORDER BY id',
 chinese_attempts:'SELECT id,student_id,test_id,set_id,snapshot,answers,started_at,ends_at,finished_at,score,diamonds_delta,abandoned_at FROM chinese_attempts ORDER BY id',
 diamond_ledger:'SELECT id,profile_id,amount,reason,ref_type,ref_id,created_at FROM diamond_ledger ORDER BY id',
 student_quest_claims:'SELECT id,profile_id,course_id,claim_day,task_key,created_at FROM student_quest_claims ORDER BY id',
};
const digest=rows=>createHash('sha256').update(JSON.stringify(rows)).digest('hex');
async function snapshot(run){const out={};for(const [name,sql]of Object.entries(protectedTables)){const rows=await run(sql);out[name]={count:rows.length,sha256:digest(rows)};}return out;}
async function schemaState(run){
 const columns=await run("SELECT table_name,column_name FROM information_schema.columns WHERE table_schema=current_schema() AND ((table_name='chinese_tests' AND column_name IN ('question_count','reward_policy')) OR (table_name='chinese_attempts' AND column_name IN ('active_seconds','activity_ping_at')))"),tables=await run("SELECT table_name FROM information_schema.tables WHERE table_schema=current_schema() AND table_name='chinese_daily_study'"),applied=await run("SELECT name FROM schema_migrations WHERE name IN (?,?)",migrations);
 return {columns:columns.map(x=>x.table_name+'.'+x.column_name).sort(),dailyTable:tables.length===1,applied:applied.map(x=>x.name).sort()};
}
try{
 const before=await snapshot(query),state=await schemaState(query);
 if(apply){
  const migrationResult=await withTransaction(async c=>{
   const run=async(sql,params=[])=>((await c.query(sql,params))[0]);
   await run("SELECT pg_advisory_xact_lock(hashtext('ttnava-chinese-active-study-schema'))");
   await run("SET LOCAL lock_timeout='5s'");
   await run('LOCK TABLE profiles,chinese_tests,chinese_attempts,diamond_ledger,student_quest_claims IN SHARE MODE');
   const current=await schemaState(run);
   const protectedBefore=await snapshot(run),directory=new URL('../backups/chinese-active-study/',import.meta.url);
   await mkdir(directory,{recursive:true});
   await writeFile(new URL('before-migration-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json',directory),JSON.stringify({target:'ttnava_stage',schema:current,protected:protectedBefore},null,2));
   for(const name of migrations){
    const already=current.applied.includes(name);
    if(!already){const source=await readFile(new URL('../sql/postgres/'+name,import.meta.url),'utf8');await run(source);await run('INSERT INTO schema_migrations(name) VALUES (?) ON CONFLICT(name) DO NOTHING',[name]);}
   }
   const afterState=await schemaState(run),after=await snapshot(run);
   assert(afterState.dailyTable,'chinese_daily_study was not created');
   assert.deepEqual(afterState.columns,['chinese_attempts.active_seconds','chinese_attempts.activity_ping_at','chinese_tests.question_count','chinese_tests.reward_policy']);
   for(const table of Object.keys(protectedBefore))assert.deepEqual(after[table],protectedBefore[table],`Existing ${table} data changed`);
   return {applied:migrations.filter(name=>!current.applied.includes(name)),schemaReady:true,protectedDataUnchanged:true};
  });
  console.log(JSON.stringify({ok:true,mode:'applied',...migrationResult}));
 }else console.log(JSON.stringify({ok:true,mode:'read-only-preview',schemaReady:state.dailyTable&&state.columns.length===4,missingColumns:['chinese_tests.question_count','chinese_tests.reward_policy','chinese_attempts.active_seconds','chinese_attempts.activity_ping_at'].filter(name=>!state.columns.includes(name)),dailyTable:state.dailyTable,applied:state.applied,protected:before}));
}catch(error){console.error(JSON.stringify({ok:false,code:error.code||error.name,message:error.name==='AssertionError'?error.message:'Chinese study schema preparation failed; private connection details omitted.'}));process.exitCode=1;}
finally{await closePool();}
