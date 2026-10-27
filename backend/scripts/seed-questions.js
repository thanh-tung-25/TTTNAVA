import fs from 'node:fs/promises';
import path from 'node:path';
import mysql from 'mysql2/promise';
import env from '../src/config/env.js';
import { topicFileSchema } from './lib/question-file.js';

const questionsDir = path.join(env.backendRoot, 'seed-data', 'questions');
const subjectsPath = path.join(env.backendRoot, 'seed-data', 'subjects.json');

async function loadPayloads() {
  const subjects = JSON.parse(await fs.readFile(subjectsPath, 'utf8'));
  const files = (await fs.readdir(questionsDir)).filter((name) => name.endsWith('.json') && !name.startsWith('_')).sort();
  if (files.length === 0) throw new Error('Không có file câu hỏi. Chạy npm run generate:questions trước.');
  const topics = [];
  for (const file of files) {
    const raw = JSON.parse(await fs.readFile(path.join(questionsDir, file), 'utf8'));
    const parsed = topicFileSchema.safeParse(raw);
    if (!parsed.success) {
      throw new Error(`${file} không hợp lệ: ${parsed.error.issues[0].path.join('.')} — ${parsed.error.issues[0].message}`);
    }
    topics.push(parsed.data);
  }
  return { subjects, topics };
}

async function main() {
  const allowPartial = process.argv.includes('--allow-partial');
  const { subjects, topics } = await loadPayloads();
  const totalQuestions = topics.reduce((sum, topic) => sum + topic.questions.length, 0);
  if (!allowPartial && (topics.length !== 91 || totalQuestions !== 5263)) {
    throw new Error(`Cần đủ 91 chủ đề / 5263 câu, hiện có ${topics.length} / ${totalQuestions}. Dùng --allow-partial để nhập một phần.`);
  }

  const connection = await mysql.createConnection({
    host: env.db.host,
    port: env.db.port,
    user: env.db.user,
    password: env.db.password,
    database: env.db.database,
    charset: 'utf8mb4',
    timezone: 'Z',
    multipleStatements: false,
  });

  try {
    await connection.beginTransaction();

    for (const subject of subjects) {
      await connection.query(
        `INSERT INTO subjects (id, name, slug, color, sort_order) VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE name = VALUES(name), slug = VALUES(slug),
           color = VALUES(color), sort_order = VALUES(sort_order)`,
        [subject.id, subject.name, subject.slug, subject.color, subject.sortOrder],
      );
    }

    for (const { topic, questions } of topics) {
      await connection.query(
        `INSERT INTO topics (id, subject_id, grade, name, slug, sort_order) VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE subject_id = VALUES(subject_id), grade = VALUES(grade),
           name = VALUES(name), slug = VALUES(slug), sort_order = VALUES(sort_order)`,
        [topic.id, topic.subjectId, topic.grade, topic.name, topic.slug, topic.sortOrder],
      );

      for (const question of questions) {
        await connection.query(
          `INSERT INTO questions (id, topic_id, type, prompt, image_url, difficulty, status)
           VALUES (?, ?, ?, ?, ?, ?, 'visible')
           ON DUPLICATE KEY UPDATE topic_id = VALUES(topic_id), type = VALUES(type),
             prompt = VALUES(prompt), image_url = VALUES(image_url), difficulty = VALUES(difficulty)`,
          [question.id, topic.id, question.type, question.prompt, question.imageUrl ?? null, question.difficulty],
        );

        await connection.query('DELETE FROM question_options WHERE question_id = ?', [question.id]);
        if (question.options?.length) {
          const values = question.options.map((option, index) => [
            question.id, option.key, option.text, index + 1,
          ]);
          await connection.query(
            'INSERT INTO question_options (question_id, opt_key, option_text, sort_order) VALUES ?',
            [values],
          );
        }

        await connection.query(
          `INSERT INTO question_answers (question_id, answer_json, explanation) VALUES (?, ?, ?)
           ON DUPLICATE KEY UPDATE answer_json = VALUES(answer_json), explanation = VALUES(explanation)`,
          [question.id, JSON.stringify(question.answer), question.explanation],
        );
      }
      process.stdout.write(`  ${topic.id}: ${questions.length} câu\n`);
    }

    await connection.commit();
    console.log(`Nhập thành công ${topics.length} chủ đề, ${totalQuestions} câu hỏi.`);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error('Nhập câu hỏi thất bại:', error.message);
  process.exitCode = 1;
});
