import {readFile,writeFile,mkdir} from 'node:fs/promises';
import dotenv from 'dotenv';
const production=process.argv.includes('--production'),apply=process.argv.includes('--apply');
if(production){dotenv.config({path:new URL('../.env.vercel',import.meta.url),quiet:true});dotenv.config({path:new URL('../.env.supabase',import.meta.url),quiet:true});process.env.DB_DRIVER='postgres';process.env.PGPORT='6543';process.env.PG_READ_ONLY=apply?'false':'true';}
const {query,closePool,isPostgres,withTransaction}=await import('../src/config/db.js');
try{
 if(!isPostgres)throw Error('Dùng npm --prefix backend run db:migrate cho MySQL.');
 const before=await query("SELECT count(*) total,md5(coalesce(string_agg(to_jsonb(d)::text,'' ORDER BY d.id),'')) digest FROM diamond_ledger d");
 const [exists]=await query("SELECT COUNT(*) total FROM information_schema.tables WHERE table_schema=current_schema() AND table_name='study_activity_sessions'");
 if(apply&&!Number(exists.total)){
  const backup=new URL('../backups/study-rewards/',import.meta.url);await mkdir(backup,{recursive:true});await writeFile(new URL('before-schema-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json',backup),JSON.stringify({ledger:before,adding:'study_activity_sessions'},null,2));
  await withTransaction(async c=>{await c.query(await readFile(new URL('../sql/postgres/039_study_activity_sessions.sql',import.meta.url),'utf8'));});
 }
 const tables=await query("SELECT table_name FROM information_schema.tables WHERE table_schema=current_schema() AND table_name='study_activity_sessions'"),after=await query("SELECT count(*) total,md5(coalesce(string_agg(to_jsonb(d)::text,'' ORDER BY d.id),'')) digest FROM diamond_ledger d");
 console.log(JSON.stringify({ready:tables.length===1,applied:apply&&!Number(exists.total),ledger_unchanged:JSON.stringify(before)===JSON.stringify(after),tables:tables.map(t=>t.table_name)}));
}catch(e){console.error(JSON.stringify({ready:false,code:e.code||e.name,message:e.name==='Error'?e.message:'Chuẩn bị cơ sở dữ liệu thất bại; thông tin kết nối được ẩn.'}));process.exitCode=1;}finally{await closePool();}
