// Scoped additive release. No enrollments, prices, profiles or results are updated.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {parseEnv} from 'node:util';
import {createHash} from 'node:crypto';
import {loadHighschoolCatalog,seedHighschoolCatalog} from './lib/seed-highschool.mjs';
import {loadHighschoolContent,seedHighschoolContent} from './lib/seed-highschool-content.mjs';

const args=process.argv.slice(2),apply=args.includes('--apply'),catalogOnly=args.includes('--catalog-only'),schemaOnly=args.includes('--schema-only'),target=args.find(a=>a.startsWith('--target='))?.slice(9)||'local';
assert(args.every(a=>['--apply','--catalog-only','--schema-only','--target=local','--target=production'].includes(a)));
const stable=value=>value instanceof Date?value.toISOString():Buffer.isBuffer(value)?value.toString('base64'):Array.isArray(value)?value.map(stable):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,stable(value[key])])):value;
const digest=rows=>createHash('sha256').update(JSON.stringify(rows.map(row=>JSON.stringify(stable(row))).sort())).digest('hex');
const additive=new Set(['subjects','courses','topics','curriculum_chapters','curriculum_lessons','questions','question_options','question_answers','school_lesson_materials','schema_migrations']);
let db,stage='source';
try{
 const catalog=await loadHighschoolCatalog(),content=catalogOnly||schemaOnly?null:await loadHighschoolContent();
 const config=parseEnv(await fs.readFile(new URL('../'+(target==='production'?'.env.vercel':'.env'),import.meta.url),'utf8'));
 if(target==='production'){
  assert.equal(config.DB_DRIVER,'postgres');assert.equal(config.PGSCHEMA,'ttnava_stage');assert.equal(new URL(config.SUPABASE_URL).hostname,'njaasgcfgjismpmzoncb.supabase.co');
 }else{assert.equal(config.DB_DRIVER||'mysql','mysql');assert(['localhost','127.0.0.1','::1'].includes(config.DB_HOST||'127.0.0.1'));}
 Object.assign(process.env,config);process.env.PGPOOL_SIZE='1';
 db=await import('../src/config/db.js');stage='snapshot';
 const keys=await db.query(db.dialectSql("SELECT TABLE_NAME table_name,COLUMN_NAME column_name,ORDINAL_POSITION position FROM information_schema.key_column_usage WHERE CONSTRAINT_SCHEMA=DATABASE() AND CONSTRAINT_NAME='PRIMARY' ORDER BY TABLE_NAME,ORDINAL_POSITION","SELECT k.table_name,k.column_name,k.ordinal_position position FROM information_schema.table_constraints t JOIN information_schema.key_column_usage k ON k.constraint_catalog=t.constraint_catalog AND k.constraint_schema=t.constraint_schema AND k.constraint_name=t.constraint_name WHERE t.table_schema=current_schema() AND t.constraint_type='PRIMARY KEY' ORDER BY k.table_name,k.ordinal_position"));
 const primary=new Map();for(const key of keys){assert(/^[a-z][a-z0-9_]*$/u.test(key.table_name));if(!primary.has(key.table_name))primary.set(key.table_name,[]);primary.get(key.table_name).push(key.column_name);}
 const tables=[...primary.keys()];
 const snapshot=async run=>{const state={};for(const table of tables){const rows=await run('SELECT * FROM '+table),columns=primary.get(table);state[table]={count:rows.length,hash:digest(rows),keys:new Set(rows.map(row=>JSON.stringify(columns.map(key=>stable(row[key])))))};}return state;};
 let before=await snapshot(db.query);
 const migration='045_highschool.sql',sql=await fs.readFile(new URL('../sql/'+(db.isPostgres?'postgres':'migrations')+'/'+migration,import.meta.url),'utf8');
 const installed=(await db.query('SELECT name FROM schema_migrations WHERE name=?',[migration])).length>0;
 const plan={target,mode:apply?'applied':'read-only',schemaOnly,schemaPending:!installed,books:27,chapters:239,lessons:1082,materialLessons:content?.length||0,questions:content?.reduce((n,row)=>n+row.questions.length,0)||0,protectedTables:tables.length};
 if(!apply){console.log(JSON.stringify({ready:true,...plan}));}
 else{
  const directory=new URL('../backups/high-school/',import.meta.url);await fs.mkdir(directory,{recursive:true});
  const backup=new URL(new Date().toISOString().replace(/[:.]/gu,'-')+'-'+target+'-before.json',directory);
  const originals={};for(const table of ['subjects','courses','curriculum_chapters','curriculum_lessons','topics'])originals[table]=await db.query('SELECT * FROM '+table);
  await fs.writeFile(backup,JSON.stringify({at:new Date().toISOString(),target,hashes:Object.fromEntries(Object.entries(before).map(([table,row])=>[table,{count:row.count,hash:row.hash}])),catalog:originals},null,2),'utf8');
  // MySQL commits DDL implicitly; all statements only widen existing constraints.
  if(!installed&&!db.isPostgres){stage='schema';for(const statement of sql.split(/;\s*(?:\r?\n|$)/u).map(s=>s.trim()).filter(Boolean))await db.query(statement);}
  const result=await db.withTransaction(async connection=>{
   const run=async(s,p=[])=>(await connection.query(s,p))[0];
   if(db.isPostgres){
    await run('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');await run("SET LOCAL lock_timeout='5s'");
    before=await snapshot(run);
    await fs.writeFile(backup,JSON.stringify({at:new Date().toISOString(),target,hashes:Object.fromEntries(Object.entries(before).map(([table,row])=>[table,{count:row.count,hash:row.hash}])),catalog:originals},null,2),'utf8');
    if(!installed)await run(sql);
   }
   stage='catalog';const seeded=schemaOnly?null:await seedHighschoolCatalog(run,{postgres:db.isPostgres,catalog});
   stage='materials';const materials=content?await seedHighschoolContent(run,{postgres:db.isPostgres,rows:content}):null;
   if(!installed)await run('INSERT INTO schema_migrations(name) VALUES (?)',[migration]);
   if(!schemaOnly){
    const [counts]=await run("SELECT COUNT(DISTINCT c.id) chapters,COUNT(l.id) lessons FROM curriculum_chapters c LEFT JOIN curriculum_lessons l ON l.chapter_id=c.id WHERE c.grade BETWEEN 10 AND 12");
    assert(Number(counts.chapters)>=239&&Number(counts.lessons)>=1082,'THPT catalog rows are missing');
    if(content){const [coverage]=await run('SELECT COUNT(*) total FROM school_lesson_materials m JOIN curriculum_lessons l ON l.id=m.lesson_id JOIN curriculum_chapters c ON c.id=l.chapter_id WHERE c.grade BETWEEN 10 AND 12');assert(Number(coverage.total)>=content.length,'THPT materials are missing');}
   }
   stage='data-preservation';
   for(const table of tables){
    const columns=primary.get(table),rows=await run('SELECT * FROM '+table),original=rows.filter(row=>before[table].keys.has(JSON.stringify(columns.map(key=>stable(row[key])))));
    assert.equal(original.length,before[table].count,'Existing rows removed: '+table);assert.equal(digest(original),before[table].hash,'Existing rows changed: '+table);
    if(!additive.has(table))assert.equal(rows.length,before[table].count,'Unexpected data inserted: '+table);
   }
   return {seeded,materials};
  });
  console.log(JSON.stringify({ready:true,...plan,...result,existingDataPreserved:true,backup:backup.pathname.split('/backups/').at(-1)}));
 }
}catch(error){console.error(JSON.stringify({ready:false,target,stage,code:error.code||error.name,message:error.name==='AssertionError'?error.message:(error.code?'Database release could not finish; connection details withheld.':error.message)}));process.exitCode=1;}
finally{await db?.closePool();}
