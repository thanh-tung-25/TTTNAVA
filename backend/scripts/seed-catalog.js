import fs from 'node:fs/promises';
import path from 'node:path';
import mysql from 'mysql2/promise';
import env from '../src/config/env.js';

async function readJson(file) {
  return JSON.parse(await fs.readFile(path.join(env.backendRoot, 'seed-data', file), 'utf8'));
}

async function main() {
  const subjects = await readJson('subjects.json');
  const topics = await readJson('topics.json');
  if (topics.length !== 91) {
    throw new Error(`Danh mục cần 91 chủ đề, hiện có ${topics.length}`);
  }

  const connection = await mysql.createConnection({
    host: env.db.host,
    port: env.db.port,
    user: env.db.user,
    password: env.db.password,
    database: env.db.database,
    charset: 'utf8mb4',
    timezone: 'Z',
  });

  try {
    await connection.query("SET time_zone = '+00:00'");
    await connection.beginTransaction();

    for (const subject of subjects) {
      await connection.query(
        `INSERT INTO subjects (id, name, slug, color, sort_order) VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE name = VALUES(name), slug = VALUES(slug),
           color = VALUES(color), sort_order = VALUES(sort_order)`,
        [subject.id, subject.name, subject.slug, subject.color, subject.sortOrder],
      );
    }

    for (const topic of topics) {
      await connection.query(
        `INSERT INTO topics (id, subject_id, grade, name, slug, sort_order) VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE subject_id = VALUES(subject_id), grade = VALUES(grade),
           name = VALUES(name), slug = VALUES(slug), sort_order = VALUES(sort_order)`,
        [topic.id, topic.subjectId, topic.grade, topic.name, topic.slug, topic.sortOrder],
      );
    }

    await connection.commit();
    console.log(`Đã đồng bộ ${subjects.length} môn học và ${topics.length} chủ đề. Không nhập câu hỏi mẫu.`);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error('Đồng bộ danh mục thất bại:', error.message);
  process.exitCode = 1;
});
