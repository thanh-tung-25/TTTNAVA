// Schema-only deployment. Every existing row must stay byte-for-byte identical.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {parseEnv} from 'node:util';
import {createHash} from 'node:crypto';
const args=process.argv.slice(2),apply=args.includes('--apply'),target=args.find(x=>x.startsWith('--target='))?.slice(9)||'local';
assert(args.every(x=>['--apply','--target=local','--target=production'].includes(x)));
const stable=v=>v instanceof Date?v.toISOString():Buffer.isBuffer(v)?v.toString('base64'):Array.isArray(v)?v.map(stable):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(key=>[key,stable(v[key])])):v;
const digest=rows=>createHash('sha256').update(JSON.stringify(rows.map(row=>JSON.stringify(stable(row))).sort())).digest('hex');
let db,stage='configuration';
try{
 const config=parseEnv(await fs.readFile(new URL('../'+(target==='production'?'.env.vercel':'.env'),import.meta.url),'utf8'));
 if(target==='production'){assert.equal(config.DB_DRIVER,'postgres');assert.equal(config.PGSCHEMA,'ttnava_stage');assert.equal(new URL(config.SUPABASE_URL).hostname,'njaasgcfgjismpmzoncb.supabase.co');}
 else{assert.equal(config.DB_DRIVER||'mysql','mysql');assert(['localhost','127.0.0.1','::1'].includes(config.DB_HOST||'127.0.0.1'));}
 Object.assign(process.env,config);process.env.PGPOOL_SIZE='1';db=await import('../src/config/db.js');
 const migration='050_school_curriculum_state.sql',installed=(await db.query('SELECT name FROM schema_migrations WHERE name=?',[migration])).length>0;
 const tables=(await db.query(db.dialectSql('SELECT table_name FROM information_schema.tables WHERE table_schema=DATABASE() AND table_type=\'BASE TABLE\'','SELECT table_name FROM information_schema.tables WHERE table_schema=current_schema() AND table_type=\'BASE TABLE\''))).map(row=>row.table_name||row.TABLE_NAME).sort();for(const table of tables)assert(/^[a-z][a-z0-9_]*$/u.test(table));
 const snapshot=async(run,excludeMigration=false)=>{
  if(db.isPostgres){
   // Fold canonical row JSON on the server; no full learner/content data download.
   const sql=tables.map(table=>`SELECT '${table}' table_name,COUNT(*) total,md5(COALESCE(string_agg(md5(to_jsonb(t)::text),'' ORDER BY md5(to_jsonb(t)::text)),'')) hash FROM ${table} t${excludeMigration&&table==='schema_migrations'?' WHERE t.name<>?':''}`).join(' UNION ALL ');
   return Object.fromEntries((await run(sql,excludeMigration?[migration]:[])).map(row=>[row.table_name,{count:Number(row.total),hash:row.hash}]));
  }
  const state={};for(const table of tables){const rows=await run('SELECT * FROM '+table),protectedRows=excludeMigration&&table==='schema_migrations'?rows.filter(row=>row.name!==migration):rows;state[table]={count:protectedRows.length,hash:digest(protectedRows)};}return state;
 };
 if(!apply)console.log(JSON.stringify({target,readOnly:true,schemaPending:!installed,protectedTables:tables.length}));
 else{
  const directory=new URL('../backups/school-lesson-management/',import.meta.url);await fs.mkdir(directory,{recursive:true});const backup=new URL(new Date().toISOString().replace(/[:.]/gu,'-')+'-'+target+'-schema.json',directory);
  const sql=await fs.readFile(new URL('../sql/'+(db.isPostgres?'postgres':'migrations')+'/'+migration,import.meta.url),'utf8');
  stage='snapshot';let before=db.isPostgres?null:await snapshot(db.query);
  if(!installed&&!db.isPostgres){stage='schema';for(const statement of sql.split(/;\s*(?:\r?\n|$)/u).map(s=>s.trim()).filter(Boolean))await db.query(statement);}
  await db.withTransaction(async connection=>{
   const run=async(s,p=[])=>(await connection.query(s,p))[0];
   if(db.isPostgres){await run('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');await run("SET LOCAL lock_timeout='5s'");before=await snapshot(run);}
   await fs.writeFile(backup,JSON.stringify({at:new Date().toISOString(),target,before},null,2),'utf8');
   stage='schema';if(!installed){if(db.isPostgres)await run(sql);await run('INSERT INTO schema_migrations(name) VALUES (?)',[migration]);}
   stage='preservation';
   const after=await snapshot(run,!installed);for(const table of tables){assert.equal(after[table].count,before[table].count,'Existing row count changed: '+table);assert.equal(after[table].hash,before[table].hash,'Existing data changed: '+table);}
  });
  console.log(JSON.stringify({target,applied:true,schemaPending:!installed,protectedTables:tables.length,existingDataPreserved:true,profilesUnchanged:true,newTables:['school_curriculum_state'],backup:backup.pathname.split('/backups/').at(-1)}));
 }
}catch(error){console.error(JSON.stringify({target,stage,error:error.name==='AssertionError'?error.message:error.code||error.name}));process.exitCode=1;}finally{await db?.closePool();}
