// Explicit additive migration for the configured database. Does not import lesson data.
import {readFile} from 'node:fs/promises';
import {query,withTransaction,isPostgres,closePool} from '../src/config/db.js';
try{
 if(!process.argv.includes('--apply')){
  console.log('Read-only: use --apply to create learning_feedback and learning_goals in the configured database.');
  const rows=await query("SELECT table_name FROM information_schema.tables WHERE table_schema="+(isPostgres?'current_schema()':'DATABASE()')+" AND table_name IN ('learning_feedback','learning_goals')");
  console.log(JSON.stringify(rows));
 }else{
  await query('SELECT id FROM profiles LIMIT 1');
  const sql=await readFile(new URL('../sql/'+(isPostgres?'postgres':'migrations')+'/026_learning_feedback.sql',import.meta.url),'utf8');
  await withTransaction(async c=>{for(const statement of sql.split(';').map(s=>s.trim()).filter(Boolean))await c.query(statement);});
  console.log('Applied additive learning migration: learning_feedback, learning_goals. Existing data preserved.');
 }
}finally{await closePool();}
