import { spawnSync } from 'node:child_process';
import mysql from 'mysql2/promise';

const TEST_DB = process.env.TEST_DB_NAME ?? 'kids_learning_test';

function run(script) {
  const result = spawnSync(process.execPath, [script], {
    cwd: new URL('../..', import.meta.url),
    env: { ...process.env, DB_NAME: TEST_DB, NODE_ENV: 'test' },
    stdio: 'inherit',
  });
  if (result.status !== 0) {
    throw new Error(`Không chạy được ${script} (exit ${result.status})`);
  }
}

export default async function globalSetup() {
  process.env.DB_NAME = TEST_DB;
  const { default: env } = await import('../../src/config/env.js');

  const root = await mysql.createConnection({
    host: env.db.host,
    port: env.db.port,
    user: env.db.user,
    password: env.db.password,
    charset: 'utf8mb4',
  });
  await root.query(
    `CREATE DATABASE IF NOT EXISTS \`${TEST_DB}\`
     CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  );
  await root.end();

  run('scripts/migrate.js');
  run('scripts/seed-catalog.js');

  const connection = await mysql.createConnection({
    host: env.db.host,
    port: env.db.port,
    user: env.db.user,
    password: env.db.password,
    database: TEST_DB,
    charset: 'utf8mb4',
    timezone: 'Z',
  });
  await connection.query("SET time_zone = '+00:00'");
  for (const table of [
    'finish_guard',
    'challenge_rewards',
    'challenge_answers',
    'challenges',
    'exam_answers',
    'exam_questions',
    'exam_attempts',
    'practice_answers',
    'practice_questions',
    'practice_sessions',
    'atomic_question_writes',
    'diamond_ledger',
  ]) {
    await connection.query(`DELETE FROM \`${table}\``);
  }
  await connection.query('DELETE FROM questions');
  await connection.query("DELETE FROM profiles WHERE role IN ('student', 'admin')");

  const { insertFixtureQuestions } = await import('../fixtures/questions.js');
  const execute = (sql, params = []) => connection.query(sql, params);
  await insertFixtureQuestions(execute);
  await connection.end();
}
