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
  const curriculum = await readJson('curriculum.json');
  if (topics.length !== 91) {
    throw new Error(`Danh mục cần 91 chủ đề, hiện có ${topics.length}`);
  }
  if (curriculum.lessons.length !== 91) {
    throw new Error(`Chương trình cần 91 bài học, hiện có ${curriculum.lessons.length}`);
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

    for (const year of curriculum.years) {
      await connection.query(
        `INSERT INTO school_years (id, name, starts_on, ends_on, is_active, sort_order)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE name = VALUES(name), starts_on = VALUES(starts_on),
           ends_on = VALUES(ends_on), is_active = VALUES(is_active), sort_order = VALUES(sort_order)`,
        [year.id, year.name, year.startsOn, year.endsOn, year.isActive ? 1 : 0, year.sortOrder],
      );
    }

    for (const chapter of curriculum.chapters) {
      await connection.query(
        `INSERT INTO curriculum_chapters
           (id, school_year_id, grade, semester, subject_id, name, slug, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE school_year_id = VALUES(school_year_id), grade = VALUES(grade),
           semester = VALUES(semester), subject_id = VALUES(subject_id), name = VALUES(name),
           slug = VALUES(slug), sort_order = VALUES(sort_order)`,
        [chapter.id, chapter.schoolYearId, chapter.grade, chapter.semester,
          chapter.subjectId, chapter.name, chapter.slug, chapter.sortOrder],
      );
    }

    for (const lesson of curriculum.lessons) {
      await connection.query(
        `INSERT INTO curriculum_lessons (id, chapter_id, topic_id, name, sort_order)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE chapter_id = VALUES(chapter_id), topic_id = VALUES(topic_id),
           name = VALUES(name), sort_order = VALUES(sort_order)`,
        [lesson.id, lesson.chapterId, lesson.topicId, lesson.name, lesson.sortOrder],
      );
    }

    await connection.commit();
    console.log(
      `Đã đồng bộ ${subjects.length} môn, ${topics.length} chủ đề, `
      + `${curriculum.chapters.length} chương và ${curriculum.lessons.length} bài học. Không nhập câu hỏi mẫu.`,
    );
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
