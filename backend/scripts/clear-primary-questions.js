import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import env from '../src/config/env.js';
import { query, withTransaction, closePool } from '../src/config/db.js';

const scope = 'SELECT id FROM topics WHERE grade BETWEEN 1 AND 5';
try {
  const counts = await query(`SELECT t.grade,COUNT(*) total FROM questions q JOIN topics t ON t.id=q.topic_id WHERE t.grade BETWEEN 1 AND 5 GROUP BY t.grade`);
  console.log('Questions by grade:', counts);
  const histories = {};
  for (const table of ['practice_sessions','exam_attempts','challenges']) {
    histories[table] = (await query(`SELECT COUNT(*) n FROM ${table} WHERE topic_id IN (${scope})`))[0].n;
  }
  console.log('Related histories:', histories);
  if (process.argv.includes('--confirm-delete-primary-questions')) {
    const dir = path.join(env.backendRoot,'backups');
    await fs.mkdir(dir,{recursive:true});
    const backup = path.join(dir,`before-clear-primary-${new Date().toISOString().replace(/[:.]/g,'-')}.sql`);
    const executable = path.resolve(env.backendRoot,'../../..','mysql/bin/mysqldump.exe');
    const dump = spawnSync(executable,[`--host=${env.db.host}`,`--port=${env.db.port}`,`--user=${env.db.user}`,'--single-transaction','--hex-blob',`--result-file=${backup}`,env.db.database],{
      env:{...process.env,MYSQL_PWD:env.db.password},encoding:'utf8',windowsHide:true,
    });
    if(dump.error || dump.status!==0) throw new Error('Backup failed; no data deleted: '+(dump.error?.message||dump.stderr));
    if((await fs.stat(backup)).size<1000)throw new Error('Backup unexpectedly small; no data deleted');
    console.log('Full database backup:',backup);
    await withTransaction(async c=>{
      await c.query(`SELECT q.id FROM questions q JOIN topics t ON t.id=q.topic_id WHERE t.grade BETWEEN 1 AND 5 FOR UPDATE`);
      await c.query(`DELETE g FROM finish_guard g JOIN practice_sessions s ON s.id=g.ref_id WHERE g.ref_type='practice' AND s.topic_id IN (${scope})`);
      await c.query(`DELETE g FROM finish_guard g JOIN exam_attempts s ON s.id=g.ref_id WHERE g.ref_type='exam' AND s.topic_id IN (${scope})`);
      for (const table of ['practice_sessions','exam_attempts','challenges']) await c.query(`DELETE FROM ${table} WHERE topic_id IN (${scope})`);
      const [result] = await c.query(`DELETE q FROM questions q JOIN topics t ON t.id=q.topic_id WHERE t.grade BETWEEN 1 AND 5`);
      console.log('Deleted questions:',result.affectedRows);
      const [remaining] = await c.query(`SELECT COUNT(*) n FROM questions q JOIN topics t ON t.id=q.topic_id WHERE t.grade BETWEEN 1 AND 5`);
      if(remaining[0].n!==0)throw new Error('Verification failed; rolling back');
    });
    console.log('Committed. Accounts, curriculum, Chinese content and diamond ledger preserved.');
  }
} finally { await closePool(); }
