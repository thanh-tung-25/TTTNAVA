// Explicit production content import. Only new papers, images, asset pointers,
// and the additive nullable metadata column may be inserted. Existing rows are
// compared inside one repeatable-read transaction before it can commit.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {parseEnv} from 'node:util';
const args=process.argv.slice(2);assert(args.every(arg=>['--apply','--target=production'].includes(arg)));assert(args.includes('--target=production'));
const apply=args.includes('--apply'),directory=new URL('../backups/chemistry-exams/',import.meta.url),config=parseEnv(await fs.readFile(new URL('../.env.vercel',import.meta.url),'utf8'));
assert.equal(config.DB_DRIVER,'postgres');assert.equal(config.PGSCHEMA,'ttnava_stage');assert.equal(new URL(config.SUPABASE_URL).hostname,'njaasgcfgjismpmzoncb.supabase.co');
Object.assign(process.env,config,{PGPOOL_SIZE:'1'});
const db=await import('../src/config/db.js'),{archiveFile}=await import('../src/services/private-storage.js'),{validateSheet}=await import('../src/services/worksheet-rules.js');
const papers=JSON.parse(await fs.readFile(new URL('ready.json',directory),'utf8'));assert.equal(papers.length,10);assert.equal(papers.reduce((n,paper)=>n+paper.items.length,0),277);for(const paper of papers){paper.exam_config.period='midterm1';assert.equal(paper.grade,12);assert.equal(paper.subject_id,'hoa-hoc');validateSheet(paper);}
const ids=papers.map(paper=>paper.id),imageIds=papers.flatMap(paper=>paper.items.map(item=>item.imageId)),assetKeys=imageIds.map(id=>'worksheet_images/'+id),migration='048_worksheet_exams.sql';
let stage='preflight';
try{
 const existing=await db.query('SELECT id FROM worksheets WHERE id IN ('+ids.map(()=>'?').join(',')+')',ids);
 if(existing.length){assert.equal(existing.length,10,'Partial existing import requires inspection');console.log(JSON.stringify({alreadyImported:true,papers:10,existingDataUnchanged:true}));}
 else if(!apply)console.log(JSON.stringify({dryRun:true,target:'production',papers:10,questions:277,images:277,period:'midterm1'}));
 else{
  assert.equal(config.STORAGE_PROVIDER,'supabase');const assets=new Map();let uploaded=0;
  stage='private-images';let next=0;await Promise.all(Array.from({length:4},async()=>{while(next<imageIds.length){const index=next++,item=papers.flatMap(paper=>paper.items)[index];assert(/^\d{2}-\d{2}\.jpg$/u.test(item.sourceImage));const bytes=await fs.readFile(new URL(item.sourceImage,directory));assert(bytes.length<2*1024*1024);await archiveFile('worksheet_images/'+item.imageId,bytes,'image/jpeg',item.sourceImage,async(sql,params)=>{assets.set(params[0],params);return {affectedRows:1};});uploaded++;if(uploaded%30===0)console.log(JSON.stringify({stage:'private-images',uploaded,total:277}));}}));
  assert.equal(assets.size,277);stage='database';let protectedTables=0;
  await db.withTransaction(async connection=>{
   const run=async(sql,params=[])=>(await connection.query(sql,params))[0];await run('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');await run("SET LOCAL lock_timeout='10s'");
   const tables=(await run("SELECT table_name FROM information_schema.tables WHERE table_schema=current_schema() AND table_type='BASE TABLE'")).map(row=>row.table_name).sort();tables.forEach(name=>assert(/^[a-z][a-z0-9_]*$/u.test(name)));protectedTables=tables.length;
   const hasColumn=(await run("SELECT column_name FROM information_schema.columns WHERE table_schema=current_schema() AND table_name='worksheets' AND column_name='exam_config'")).length>0;
   const hasMigration=(await run('SELECT name FROM schema_migrations WHERE name=?',[migration])).length>0;
   const fold=async after=>{
    const parameters=[],statements=tables.map(name=>{
     let where='';if(after&&name==='worksheets'){where=' WHERE NOT (id = ANY(?))';parameters.push(ids);}if(after&&name==='worksheet_images'){where=' WHERE NOT (id = ANY(?))';parameters.push(imageIds);}if(after&&name==='file_assets'){where=' WHERE NOT (asset_key = ANY(?))';parameters.push(assetKeys);}if(after&&!hasMigration&&name==='schema_migrations'){where=' WHERE name<>?';parameters.push(migration);}
     const row=name==='worksheets'&&!hasColumn?"(to_jsonb(t)-'exam_config')":"to_jsonb(t)";return `SELECT '${name}' table_name,COUNT(*) total,md5(COALESCE(string_agg(md5(${row}::text),'' ORDER BY md5(${row}::text)),'')) hash FROM ${name} t${where}`;
    });return run(statements.join(' UNION ALL '),parameters);
   };
   // No old row with an imported identity may be masked by the preservation fold.
   assert.equal((await run('SELECT id FROM worksheets WHERE id = ANY(?)',[ids])).length,0);
   assert.equal((await run('SELECT id FROM worksheet_images WHERE id = ANY(?)',[imageIds])).length,0);
   assert.equal((await run('SELECT asset_key FROM file_assets WHERE asset_key = ANY(?)',[assetKeys])).length,0);
   const before=await fold(false);await fs.writeFile(new URL('production-before.json',directory),JSON.stringify(before,null,2),'utf8');
   if(!hasColumn)await run(await fs.readFile(new URL('../sql/postgres/'+migration,import.meta.url),'utf8'));if(!hasMigration)await run('INSERT INTO schema_migrations(name) VALUES (?)',[migration]);
   const [admin]=await run("SELECT id FROM profiles WHERE role='admin' AND admin_scope='super' AND deleted_at IS NULL ORDER BY created_at LIMIT 1");assert(admin);
   for(const paper of papers){const ready=validateSheet(paper);await run('INSERT INTO worksheets(id,title,grade,subject_id,status,items,created_by,exam_config) VALUES (?,?,?,?,?,?,?,?)',[paper.id,paper.title,12,'hoa-hoc','published',JSON.stringify(ready.items),admin.id,JSON.stringify(ready.exam_config)]);for(const item of paper.items){await run('INSERT INTO worksheet_images(id,worksheet_id,image,mime_type) VALUES (?,?,?,?)',[item.imageId,paper.id,Buffer.alloc(0),'image/jpeg']);await run('INSERT INTO file_assets(asset_key,object_key,sha256,byte_size,mime_type,filename) VALUES (?,?,?,?,?,?)',assets.get('worksheet_images/'+item.imageId));}}
   if(!hasColumn)assert.equal((await run('SELECT id FROM worksheets WHERE NOT(id = ANY(?)) AND exam_config IS NOT NULL',[ids])).length,0);
   assert.deepEqual(await fold(true),before,'Existing row hashes changed');
  });
  const report={at:new Date().toISOString(),target:'production',papers:10,questions:277,images:277,period:'midterm1',protectedTables,existingDataPreserved:true};await fs.writeFile(new URL('production-import-report.json',directory),JSON.stringify(report,null,2),'utf8');console.log(JSON.stringify(report));
 }
}catch(error){console.error(JSON.stringify({stage,error:error.code||error.name,message:error.name==='AssertionError'?error.message:undefined}));process.exitCode=1;}finally{await db.closePool();}
