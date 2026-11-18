// Operator-requested production refund. Only append credits; never rewrite history.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {parseEnv} from 'node:util';
import {createHash} from 'node:crypto';

const args=process.argv.slice(2),apply=args.includes('--apply');
const root=new URL('../../',import.meta.url),project='njaasgcfgjismpmzoncb';
const stable=value=>value instanceof Date?value.toISOString():Buffer.isBuffer(value)?value.toString('base64'):Array.isArray(value)?value.map(stable):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,stable(value[key])])):value;
const digest=rows=>createHash('sha256').update(JSON.stringify(rows.map(row=>JSON.stringify(stable(row))).sort())).digest('hex');
const key=row=>[row.profile_id,row.ref_type,row.ref_id].join('|');
const sum=(rows,id)=>rows.filter(row=>row.profile_id===id).reduce((total,row)=>total+Number(row.amount),0);
let closePool,stage='configuration';
try{
 assert(args.includes('--target=production')&&args.every(arg=>['--target=production','--apply'].includes(arg)),'Production target must be explicit');
 const config=parseEnv(await readFile(new URL('backend/.env.vercel',root),'utf8'));
 assert.equal(config.DB_DRIVER,'postgres');assert.equal(config.PGSCHEMA,'ttnava_stage');
 assert.equal(new URL(config.SUPABASE_URL).hostname,project+'.supabase.co');
 assert(config.PGHOST.endsWith('.pooler.supabase.com')&&config.PGUSER.endsWith('.'+project));
 Object.assign(process.env,config);
 const db=await import('../src/config/db.js');closePool=db.closePool;
 const {insertLedger}=await import('../src/services/ledger-service.js');
 const sql=await readFile(new URL('../sql/postgres/043_store_diamond_refunds.sql',import.meta.url),'utf8');
 const result=await db.withTransaction(async connection=>{
  const run=async(statement,params=[]) => (await connection.query(statement,params))[0];
  await run('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
  if(apply)await run('SELECT pg_advisory_xact_lock(434343,20261118)');
  const people=await run("SELECT p.id,p.username,p.display_name FROM profiles p WHERE EXISTS(SELECT 1 FROM diamond_ledger dl WHERE dl.profile_id=p.id AND dl.reason='store_purchase' AND dl.amount<0) ORDER BY p.id"+(apply?' FOR UPDATE':''));
  if(apply)await run('LOCK TABLE diamond_ledger IN SHARE ROW EXCLUSIVE MODE');
  const ledger=await run('SELECT * FROM diamond_ledger ORDER BY id');
  const purchases=ledger.filter(row=>row.reason==='store_purchase'&&Number(row.amount)<0);
  const refunds=new Map(ledger.filter(row=>row.reason==='store_refund').map(row=>[key(row),row]));
  const pending=purchases.filter(row=>{
   assert.equal(row.ref_type,'store','Unexpected purchase source');
   const previous=refunds.get(key(row));
   if(previous)assert.equal(Number(previous.amount),-Number(row.amount),'Existing refund does not match its purchase');
   return !previous;
  });
  const report=people.map(person=>({username:person.username,name:person.display_name,purchases:purchases.filter(row=>row.profile_id===person.id).length,spent:-sum(purchases,person.id),previously_refunded:sum([...refunds.values()],person.id),before:sum(ledger,person.id),refund:-sum(pending,person.id),after:sum(ledger,person.id)-sum(pending,person.id)}));
  if(!apply)return {accounts:report,pending_transactions:pending.length,total_refund:report.reduce((total,row)=>total+row.refund,0)};
  stage='snapshot';
  const tables=new Set((await run('SELECT table_name FROM information_schema.tables WHERE table_schema=current_schema()')).map(row=>row.table_name));
  const protectedTables=['profiles','courses','course_enrollments','course_orders','course_access_audit','course_paid_access','course_free_periods','course_free_grants','course_registration_free','course_momo_settings','course_momo_payments','student_inventory','student_preferences','student_badges','student_quest_claims','chinese_progress','chinese_reviews','chinese_review_events','chinese_attempts','chinese_speaking_submissions','practice_sessions','practice_answers','exam_attempts','exam_answers','learning_runs','study_activity_sessions'].filter(table=>tables.has(table));
  const before={};for(const table of protectedTables)before[table]=digest(await run('SELECT * FROM '+table));
  const directory=new URL('backend/backups/diamond-refunds/',root);await mkdir(directory,{recursive:true});
  const stamp=new Date().toISOString().replace(/[:.]/g,'-');
  const backup='backend/backups/diamond-refunds/'+stamp+'-production.json';
  await writeFile(new URL(backup,root),JSON.stringify({created_at:new Date().toISOString(),ledger,protected_hashes:before,planned:report},null,2),'utf8');
  stage='refund';
  for(const statement of sql.split(';').map(value=>value.trim()).filter(value=>value&&!/^(?:BEGIN|COMMIT|SET LOCAL\b)/i.test(value)))await run(statement);
  for(const purchase of pending){
   const amount=-Number(purchase.amount);assert(Number.isSafeInteger(amount)&&amount>0&&amount<=32767,'Refund exceeds ledger limits');
   assert.equal(await insertLedger(connection,{profileId:purchase.profile_id,amount,reason:'store_refund',refType:'store',refId:purchase.ref_id}),1,'Refund was not appended');
  }
  stage='reconciliation';
  const after=await run('SELECT * FROM diamond_ledger ORDER BY id'),originalIds=new Set(ledger.map(row=>row.id));
  assert.equal(digest(after.filter(row=>originalIds.has(row.id))),digest(ledger),'Original ledger entries changed');
  const added=after.filter(row=>!originalIds.has(row.id));assert.equal(added.length,pending.length);
  for(const row of added){assert.equal(row.reason,'store_refund');const purchase=pending.find(original=>key(original)===key(row));assert(purchase);assert.equal(Number(row.amount),-Number(purchase.amount));}
  for(const table of protectedTables)assert.equal(digest(await run('SELECT * FROM '+table)),before[table],'Protected data changed: '+table);
  for(const person of people)assert.equal(sum(after,person.id),report.find(row=>row.username===person.username).after,'Balance does not match refund');
  return {accounts:report,refunded_transactions:added.length,total_refund:report.reduce((total,row)=>total+row.refund,0),original_data_preserved:true,backup};
 });
 console.log(JSON.stringify({ready:true,target:'production',mode:apply?'applied':'read-only',...result}));
}catch(error){
 console.error(JSON.stringify({ready:false,stage,code:error.code||'REFUND_FAILED',message:error.name==='AssertionError'?error.message:'Hoàn kim cương chưa hoàn tất; giao dịch được hủy nếu chưa commit.'}));process.exitCode=1;
}finally{await closePool?.();}
