// Explicit preparation for a future deployment; default is read-only.
import {readFile} from 'node:fs/promises';
import {query,closePool,isPostgres} from '../src/config/db.js';
try{
 if(!isPostgres)throw Error('Use npm run db:migrate for local MySQL.');
 if(process.argv.includes('--apply'))await query(await readFile(new URL('../sql/postgres/034_chinese_speaking_assessment.sql',import.meta.url),'utf8'));
 const rows=await query("SELECT table_name FROM information_schema.tables WHERE table_schema=current_schema() AND table_name IN ('chinese_speaking_submissions','chinese_speaking_clips')");
 const ready=rows.length===2;console.log(JSON.stringify({ready,tables:rows.map(row=>row.table_name),media_storage:false}));if(!ready)process.exitCode=1;
}catch(error){console.error(JSON.stringify({ready:false,error:error.message}));process.exitCode=1;}finally{await closePool();}
