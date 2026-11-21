// Local-only import. No network storage, remote database, Git, or real learner
// attempt is used. Existing rows are verified before and after the operation.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseEnv} from 'node:util';
import {createHash} from 'node:crypto';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),args=process.argv.slice(2),apply=args.includes('--apply');assert(args.every(value=>value==='--apply'||value.startsWith('--source=')));
const directory=path.resolve(root,args.find(value=>value.startsWith('--source='))?.slice(9)||'backups/chemistry-exams');
const config=parseEnv(await fs.readFile(path.join(root,'.env'),'utf8'));assert.equal(config.DB_DRIVER||'mysql','mysql');assert(['127.0.0.1','localhost','::1'].includes(config.DB_HOST||'127.0.0.1'));
Object.assign(process.env,config,{STORAGE_PROVIDER:''});
const db=await import('../src/config/db.js'),{validateSheet}=await import('../src/services/worksheet-rules.js');
const papers=JSON.parse(await fs.readFile(path.join(directory,'ready.json'),'utf8'));assert.equal(papers.length,10);assert.equal(papers.reduce((n,row)=>n+row.items.length,0),277);for(const paper of papers){assert.equal(paper.grade,12);assert.equal(paper.subject_id,'hoa-hoc');validateSheet(paper);}
const stable=value=>value instanceof Date?value.toISOString():Buffer.isBuffer(value)?value.toString('base64'):Array.isArray(value)?value.map(stable):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,stable(value[key])])):value;
const digest=rows=>createHash('sha256').update(JSON.stringify(rows.map(row=>JSON.stringify(stable(row))).sort())).digest('hex');
try{
 if(!apply){console.log(JSON.stringify({localOnly:true,papers:papers.length,questions:277,dryRun:true}));process.exitCode=0;}
 else{
  const tables=(await db.query("SELECT table_name FROM information_schema.tables WHERE table_schema=DATABASE() AND table_type='BASE TABLE'")).map(row=>row.TABLE_NAME||row.table_name);for(const table of tables)assert(/^[a-z][a-z0-9_]*$/u.test(table));
  const old=new Map();for(const table of tables)old.set(table,await db.query('SELECT * FROM '+table));
  const [administrator]=await db.query("SELECT id FROM profiles WHERE role='admin' AND admin_scope='super' AND deleted_at IS NULL ORDER BY created_at LIMIT 1");assert(administrator,'An existing local super admin is required.');
  const migration='048_worksheet_exams.sql',installed=(await db.query('SELECT name FROM schema_migrations WHERE name=?',[migration])).length>0;
  if(!installed){await db.query(await fs.readFile(path.join(root,'sql/migrations',migration),'utf8'));await db.query('INSERT INTO schema_migrations(name) VALUES (?)',[migration]);}
  let imported=0;
  await db.withTransaction(async connection=>{
   const run=async(sql,parameters=[])=>(await connection.query(sql,parameters))[0];
   for(const paper of papers){if((await run('SELECT id FROM worksheets WHERE id=?',[paper.id])).length)continue;
    const content=validateSheet(paper);await run('INSERT INTO worksheets(id,title,grade,subject_id,status,items,created_by,exam_config) VALUES (?,?,?,?,?,?,?,?)',[paper.id,paper.title,12,'hoa-hoc',paper.status,JSON.stringify(content.items),administrator.id,JSON.stringify(content.exam_config)]);
    for(const item of paper.items){assert(/^\d{2}-\d{2}\.jpg$/u.test(item.sourceImage));const bytes=await fs.readFile(path.join(directory,item.sourceImage));assert(bytes.length<2*1024*1024);await run('INSERT INTO worksheet_images(id,worksheet_id,image,mime_type) VALUES (?,?,?,?)',[item.imageId,paper.id,bytes,'image/jpeg']);}imported++;
   }
   const ownPaperIds=new Set(papers.map(row=>row.id)),ownImageIds=new Set(papers.flatMap(row=>row.items.map(item=>item.imageId)));
   for(const table of tables){let after=await run('SELECT * FROM '+table),before=old.get(table);
    if(table==='schema_migrations')after=after.filter(row=>!(!installed&&row.name===migration));
    if(table==='worksheets'){const oldIds=new Set(before.map(row=>row.id));after=after.filter(row=>!ownPaperIds.has(row.id)||oldIds.has(row.id));if(!before.some(row=>Object.hasOwn(row,'exam_config')))after=after.map(({exam_config,...row})=>{assert.equal(exam_config,null,'Existing worksheet exam metadata changed');return row;});}
    if(table==='worksheet_images'){const oldIds=new Set(before.map(row=>row.id));after=after.filter(row=>!ownImageIds.has(row.id)||oldIds.has(row.id));}
    assert.equal(digest(after),digest(before),'Existing data changed: '+table);
   }
  });
  const report={at:new Date().toISOString(),localOnly:true,imported,papers:10,questions:277,existingDataPreserved:true,protectedTables:tables.length};await fs.writeFile(path.join(directory,'import-report.json'),JSON.stringify(report,null,2),'utf8');console.log(JSON.stringify(report));
 }
}finally{await db.closePool();}
