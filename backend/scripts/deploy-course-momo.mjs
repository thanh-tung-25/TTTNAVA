// Scoped, additive deployment. No payment requests or functional tests are run.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {parseEnv} from 'node:util';
import {createHash} from 'node:crypto';

const args=process.argv.slice(2),apply=args.includes('--apply'),target=args.find(a=>a.startsWith('--target='))?.slice(9)||'local';
const root=new URL('../../',import.meta.url),expectedProject='njaasgcfgjismpmzoncb';
const stable=v=>v instanceof Date?v.toISOString():Buffer.isBuffer(v)?v.toString('base64'):Array.isArray(v)?v.map(stable):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])])):v;
const digest=rows=>createHash('sha256').update(JSON.stringify(rows.map(r=>JSON.stringify(stable(r))).sort())).digest('hex');
let closePool,stage='configuration';
try{
 assert(args.every(a=>a==='--apply'||a==='--target=local'||a==='--target=production'));
 assert(['local','production'].includes(target));
 const config=parseEnv(await readFile(new URL('backend/'+(target==='production'?'.env.vercel':'.env'),root),'utf8'));
 if(target==='production'){
  assert.equal(config.DB_DRIVER,'postgres');assert.equal(config.PGSCHEMA,'ttnava_stage');
  assert.equal(new URL(config.SUPABASE_URL).hostname,expectedProject+'.supabase.co');
  assert(config.PGHOST.endsWith('.pooler.supabase.com'));assert(config.PGUSER.endsWith('.'+expectedProject));
 }else{assert.equal(config.DB_DRIVER||'mysql','mysql');assert(['localhost','127.0.0.1','::1'].includes(config.DB_HOST||'127.0.0.1'));}
 Object.assign(process.env,config);
 const db=await import('../src/config/db.js');closePool=db.closePool;
 const file=new URL('../sql/'+(db.isPostgres?'postgres':'migrations')+'/040_course_momo.sql',import.meta.url),sql=await readFile(file,'utf8');
 const tableRows=await db.query(db.dialectSql('SELECT table_name FROM information_schema.tables WHERE table_schema=DATABASE()','SELECT table_name FROM information_schema.tables WHERE table_schema=current_schema()'));
 const tables=new Set(tableRows.map(r=>r.table_name||r.TABLE_NAME));
 const protectedTables=['profiles','courses','course_enrollments','course_orders','course_access_audit','chinese_progress','chinese_reviews','chinese_review_events','chinese_attempts','chinese_speaking_submissions','practice_sessions','practice_answers','exam_attempts','diamond_ledger','learning_runs','study_activity_sessions'].filter(t=>tables.has(t));
 stage='snapshot';
 // MySQL DDL commits implicitly, so create the NEW tables before taking a
 // consistent snapshot; defer the cohort INSERTs to the transaction below.
 const statements=sql.split(/;\s*(?:\r?\n|$)/u).map(s=>s.trim()).filter(Boolean);
 if(apply&&!db.isPostgres)for(const statement of statements.filter(s=>!/^INSERT /iu.test(s)))await db.query(statement);
 const result=await db.withTransaction(async c=>{
  const run=async(s,p=[]) => (await c.query(s,p))[0];
  if(db.isPostgres)await run('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
  const before={};for(const table of protectedTables)before[table]=digest(await run('SELECT * FROM '+table));
  const enrollments=await run('SELECT * FROM course_enrollments'),orders=await run('SELECT * FROM course_orders');
  if(!apply)return {existing_people:new Set(enrollments.map(e=>e.student_id)).size,existing_entitlements:enrollments.length};
  stage='backup';const directory=new URL('backend/backups/course-payments/',root);await mkdir(directory,{recursive:true});
  const backup='backend/backups/course-payments/'+new Date().toISOString().replace(/[:.]/gu,'-')+'-'+target+'.json';
  await writeFile(new URL(backup,root),JSON.stringify({created_at:new Date().toISOString(),target,protected_hashes:before,enrollments,orders},null,2),'utf8');
  stage='apply';
  for(const statement of statements.filter(s=>db.isPostgres||/^INSERT /iu.test(s)))await run(statement);
  for(const table of protectedTables)assert.equal(digest(await run('SELECT * FROM '+table)),before[table],'An existing data table changed: '+table);
  const [counts]=await run("SELECT COUNT(*) entitlements,COUNT(DISTINCT student_id) people FROM course_paid_access WHERE origin='existing'");
  return {backup,existing_people:Number(counts.people),existing_entitlements:Number(counts.entitlements),original_data_preserved:true};
 });
 console.log(JSON.stringify({ready:true,target,mode:apply?'applied':'read-only',...result}));
}catch(error){console.error(JSON.stringify({ready:false,target,stage,code:error.code||'PAYMENT_DEPLOY_FAILED',message:error.name==='AssertionError'?error.message:'Cập nhật thanh toán chưa hoàn tất; không in thông tin kết nối.'}));process.exitCode=1;}
finally{await closePool?.();}
