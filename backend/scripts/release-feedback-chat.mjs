// Add the feedback-to-chat column to the configured production PostgreSQL schema.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {parseEnv} from 'node:util';

const migration='051_feedback_chat_replies.sql';
const config=parseEnv(await fs.readFile(new URL('../.env.vercel',import.meta.url),'utf8'));
assert.equal(config.DB_DRIVER,'postgres');
assert.equal(config.PGSCHEMA,'ttnava_stage');
assert.equal(new URL(config.SUPABASE_URL).hostname,'njaasgcfgjismpmzoncb.supabase.co');
Object.assign(process.env,config);process.env.PGPOOL_SIZE='1';
const db=await import('../src/config/db.js');
try{
 const sql=await fs.readFile(new URL('../sql/postgres/'+migration,import.meta.url),'utf8');
 const result=await db.withTransaction(async connection=>{
  const run=async(statement,parameters=[]) => (await connection.query(statement,parameters))[0];
  await run('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
  await run("SET LOCAL lock_timeout='5s'");
  await run('LOCK TABLE ttnava_stage.learning_feedback IN SHARE ROW EXCLUSIVE MODE');
  const [before]=await run('SELECT COUNT(*) AS total FROM ttnava_stage.learning_feedback');
  const [migrationRow]=await run('SELECT name FROM ttnava_stage.schema_migrations WHERE name=?',[migration]);
  await run(sql);
  if(!migrationRow)await run('INSERT INTO ttnava_stage.schema_migrations(name) VALUES (?) ON CONFLICT(name) DO NOTHING',[migration]);
  const [column]=await run("SELECT column_name FROM information_schema.columns WHERE table_schema='ttnava_stage' AND table_name='learning_feedback' AND column_name='reply_admin_id'");
  const [index]=await run("SELECT indexname FROM pg_indexes WHERE schemaname='ttnava_stage' AND tablename='learning_feedback' AND indexname='idx_feedback_reply_admin'");
  const [after]=await run('SELECT COUNT(*) AS total FROM ttnava_stage.learning_feedback');
  assert(column,'reply_admin_id column was not created');
  assert(index,'reply_admin_id index was not created');
  assert.equal(Number(after.total),Number(before.total),'Existing feedback row count changed');
  return {migration,applied:true,existingFeedbackRowsPreserved:true,column:true,index:true};
 });
 console.log(JSON.stringify(result));
}finally{await db.closePool();}
