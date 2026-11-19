// Additive release: preserves every existing row, including original content.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {parseEnv} from 'node:util';
import {createHash} from 'node:crypto';
import {loadSchoolSimple,seedSchoolSimple} from './lib/seed-school-simple.mjs';
const args=process.argv.slice(2),apply=args.includes('--apply'),foundations=args.includes('--foundations'),schemaOnly=args.includes('--schema-only'),target=args.find(a=>a.startsWith('--target='))?.slice(9)||'local';
assert(args.every(a=>['--apply','--foundations','--schema-only','--target=local','--target=production'].includes(a)));
const stable=v=>v instanceof Date?v.toISOString():Buffer.isBuffer(v)?v.toString('base64'):Array.isArray(v)?v.map(stable):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])])):v;
const digest=rows=>createHash('sha256').update(JSON.stringify(rows.map(row=>JSON.stringify(stable(row))).sort())).digest('hex');
const additive=new Set(['topics','curriculum_chapters','curriculum_lessons','questions','question_options','question_answers','school_study_guides','schema_migrations']);
let db,stage='source';
try{
 const content=schemaOnly?null:await loadSchoolSimple();
 const config=parseEnv(await fs.readFile(new URL('../'+(target==='production'?'.env.vercel':'.env'),import.meta.url),'utf8'));
 if(target==='production'){
  assert.equal(config.DB_DRIVER,'postgres');assert.equal(config.PGSCHEMA,'ttnava_stage');assert.equal(new URL(config.SUPABASE_URL).hostname,'njaasgcfgjismpmzoncb.supabase.co');
 }else{assert.equal(config.DB_DRIVER||'mysql','mysql');assert(['localhost','127.0.0.1','::1'].includes(config.DB_HOST||'127.0.0.1'));}
 Object.assign(process.env,config);process.env.PGPOOL_SIZE='1';db=await import('../src/config/db.js');stage='snapshot';
 const keys=await db.query(db.dialectSql("SELECT TABLE_NAME table_name,COLUMN_NAME column_name,ORDINAL_POSITION position FROM information_schema.key_column_usage WHERE CONSTRAINT_SCHEMA=DATABASE() AND CONSTRAINT_NAME='PRIMARY' ORDER BY TABLE_NAME,ORDINAL_POSITION","SELECT k.table_name,k.column_name,k.ordinal_position position FROM information_schema.table_constraints t JOIN information_schema.key_column_usage k ON k.constraint_catalog=t.constraint_catalog AND k.constraint_schema=t.constraint_schema AND k.constraint_name=t.constraint_name WHERE t.table_schema=current_schema() AND t.constraint_type='PRIMARY KEY' ORDER BY k.table_name,k.ordinal_position"));
 const primary=new Map();for(const key of keys){assert(/^[a-z][a-z0-9_]*$/u.test(key.table_name));if(!primary.has(key.table_name))primary.set(key.table_name,[]);primary.get(key.table_name).push(key.column_name);}
 const tables=[...primary.keys()];
 const snapshot=async run=>{const state={};for(const table of tables){const rows=await run('SELECT * FROM '+table),columns=primary.get(table);state[table]={count:rows.length,hash:digest(rows),keys:new Set(rows.map(row=>JSON.stringify(columns.map(key=>stable(row[key])))))};}return state;};
 let before=await snapshot(db.query);
 const migration='046_school_simple.sql',sql=await fs.readFile(new URL('../sql/'+(db.isPostgres?'postgres':'migrations')+'/'+migration,import.meta.url),'utf8');
 const installed=(await db.query('SELECT name FROM schema_migrations WHERE name=?',[migration])).length>0;
 const guides=content?.groups.filter(g=>Boolean(g.metadata.foundation)===foundations)||[],plan={target,mode:apply?'applied':'read-only',foundations,schemaOnly,schemaPending:!installed,guides:guides.length,questions:guides.reduce((n,row)=>n+row.questions.length,0),protectedTables:tables.length};
 if(!apply)console.log(JSON.stringify({ready:true,...plan}));
 else{
  const directory=new URL('../backups/school-simple/',import.meta.url);await fs.mkdir(directory,{recursive:true});
  const backup=new URL(new Date().toISOString().replace(/[:.]/gu,'-')+'-'+target+'-before.json',directory);
  const saveBackup=()=>fs.writeFile(backup,JSON.stringify({at:new Date().toISOString(),target,hashes:Object.fromEntries(Object.entries(before).map(([table,row])=>[table,{count:row.count,hash:row.hash}]))},null,2),'utf8');await saveBackup();
  // MySQL DDL commits implicitly; this migration creates two new tables only.
  if(!installed&&!db.isPostgres){stage='schema';for(const statement of sql.split(/;\s*(?:\r?\n|$)/u).map(s=>s.trim()).filter(Boolean))await db.query(statement);}
  const result=await db.withTransaction(async connection=>{
   const run=async(s,p=[])=>(await connection.query(s,p))[0];
   if(db.isPostgres){await run('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');await run("SET LOCAL lock_timeout='5s'");before=await snapshot(run);await saveBackup();if(!installed)await run(sql);}
   stage='guides-and-questions';const seeded=content?await seedSchoolSimple(run,{postgres:db.isPostgres,content,foundations}):null;
   if(!installed)await run('INSERT INTO schema_migrations(name) VALUES (?)',[migration]);
   stage='data-preservation';
   for(const table of tables){
    const columns=primary.get(table),rows=await run('SELECT * FROM '+table),original=rows.filter(row=>before[table].keys.has(JSON.stringify(columns.map(key=>stable(row[key])))));
    assert.equal(original.length,before[table].count,'Existing rows removed: '+table);assert.equal(digest(original),before[table].hash,'Existing rows changed: '+table);
    if(!additive.has(table))assert.equal(rows.length,before[table].count,'Unexpected data inserted: '+table);
   }
   return {seeded};
  });
  console.log(JSON.stringify({ready:true,...plan,...result,existingDataPreserved:true,backup:backup.pathname.split('/backups/').at(-1)}));
 }
}catch(error){console.error(JSON.stringify({ready:false,target,stage,code:error.code||error.name,message:error.name==='AssertionError'?error.message:(error.code?'Database release could not finish; connection details withheld.':error.message)}));process.exitCode=1;}
finally{await db?.closePool();}
