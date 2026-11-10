import fs from 'node:fs/promises';
import path from 'node:path';
import mysql from 'mysql2/promise';
import env from '../src/config/env.js';
import { seedSecondaryCatalog } from './lib/seed-secondary.mjs';
import { seedLiteratureCatalog } from './lib/seed-literature.mjs';
import { seedSecondaryEnglishCatalog } from './lib/seed-english-secondary.mjs';

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

    let bookChapterCount=0,bookLessonCount=0;
    for (const grade of [1,2,3,4,5]) {
      const book = await readJson(`math-grade${grade}-kntt.json`);
      const lessonIds=book.chapters.flatMap(chapter=>chapter.lessons.map(lesson=>lesson.id));
      if(new Set(lessonIds).size!==lessonIds.length||book.chapters.some(chapter=>!chapter.lessons.length))throw new Error(`Mục lục Toán ${grade} không hợp lệ`);
      bookChapterCount+=book.chapters.length;bookLessonCount+=lessonIds.length;
      await connection.query('UPDATE curriculum_chapters SET is_legacy=1 WHERE id IN (?,?)',[`chapter-toan-${grade}-hk1`,`chapter-toan-${grade}-hk2`]);
      for (const chapter of book.chapters) {
        await connection.query(`INSERT INTO curriculum_chapters (id,school_year_id,grade,semester,subject_id,name,slug,sort_order,book_label)
          VALUES (?,?,?,?,'toan',?,?,?,?) ON DUPLICATE KEY UPDATE book_label=VALUES(book_label)`,
          [chapter.id,book.yearId,grade,chapter.semester,chapter.name,chapter.id,chapter.sortOrder,book.book]);
        for (const lesson of chapter.lessons) {
          await connection.query(`INSERT IGNORE INTO topics (id,subject_id,grade,name,slug,sort_order) VALUES (?,'toan',?,?,?,?)`,[lesson.id,grade,lesson.name,lesson.id,lesson.sortOrder]);
          await connection.query(`INSERT IGNORE INTO curriculum_lessons (id,chapter_id,topic_id,name,sort_order) VALUES (?,?,?,?,?)`,[lesson.id,chapter.id,lesson.id,lesson.name,lesson.sortOrder]);
        }
      }
    }
    const vietnamese = await readJson('vietnamese-grade1-a.json');
    const vietnameseLessons = vietnamese.chapters.flatMap(chapter => chapter.lessons);
    if (new Set(vietnameseLessons.map(lesson => lesson.id)).size !== vietnameseLessons.length
        || vietnamese.chapters.some(chapter => !chapter.lessons.length)) {
      throw new Error('Mục lục Tiếng Việt 1 không hợp lệ');
    }
    await connection.query('UPDATE curriculum_chapters SET is_legacy=1 WHERE id IN (?,?)',
      ['chapter-tieng-viet-1-hk1', 'chapter-tieng-viet-1-hk2']);
    for (const chapter of vietnamese.chapters) {
      await connection.query(`INSERT INTO curriculum_chapters
        (id,school_year_id,grade,semester,subject_id,name,slug,sort_order,book_label)
        VALUES (?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE book_label=VALUES(book_label)`,
        [chapter.id,vietnamese.yearId,1,chapter.semester,'tieng-viet',chapter.name,
          chapter.id,chapter.sortOrder,vietnamese.book]);
      for (const lesson of chapter.lessons) {
        await connection.query(`INSERT IGNORE INTO topics (id,subject_id,grade,name,slug,sort_order)
          VALUES (?,'tieng-viet',1,?,?,?)`,[lesson.id,lesson.name,lesson.id,lesson.sortOrder]);
        await connection.query(`INSERT IGNORE INTO curriculum_lessons (id,chapter_id,topic_id,name,sort_order)
          VALUES (?,?,?,?,?)`,[lesson.id,chapter.id,lesson.id,lesson.name,lesson.sortOrder]);
      }
    }
    let vietnamesePrimaryChapters=0,vietnamesePrimaryLessons=0;
    for(const grade of [2,3,4,5]) {
      const book=await readJson(`vietnamese-grade${grade}-kntt.json`);
      const lessons=book.chapters.flatMap(c=>c.lessons);
      if(lessons.length!==66 || new Set(lessons.map(l=>l.id)).size!==66)throw new Error(`Mục lục Tiếng Việt ${grade} không hợp lệ`);
      vietnamesePrimaryChapters+=book.chapters.length;vietnamesePrimaryLessons+=lessons.length;
      await connection.query('UPDATE curriculum_chapters SET is_legacy=1 WHERE id IN (?,?)',
        [`chapter-tieng-viet-${grade}-hk1`,`chapter-tieng-viet-${grade}-hk2`]);
      for(const chapter of book.chapters) {
        await connection.query(`INSERT INTO curriculum_chapters
          (id,school_year_id,grade,semester,subject_id,name,slug,sort_order,book_label)
          VALUES (?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE book_label=VALUES(book_label)`,
          [chapter.id,book.yearId,grade,chapter.semester,'tieng-viet',chapter.name,chapter.id,chapter.sortOrder,book.book]);
        for(const lesson of chapter.lessons) {
          await connection.query(`INSERT IGNORE INTO topics (id,subject_id,grade,name,slug,sort_order)
            VALUES (?,'tieng-viet',?,?,?,?)`,[lesson.id,grade,lesson.name,lesson.id,lesson.sortOrder]);
          await connection.query(`INSERT IGNORE INTO curriculum_lessons (id,chapter_id,topic_id,name,sort_order)
            VALUES (?,?,?,?,?)`,[lesson.id,chapter.id,lesson.id,lesson.name,lesson.sortOrder]);
        }
      }
    }
    let englishChapters=0,englishLessons=0;
    for(const grade of [1,2,3,4,5]) {
      const book=await readJson(`english-grade${grade}-gs.json`);
      const lessons=book.chapters.flatMap(c=>c.lessons);
      const expected=grade<=2?24:29;
      if(lessons.length!==expected || new Set(lessons.map(l=>l.id)).size!==expected)throw new Error(`Mục lục Tiếng Anh ${grade} không hợp lệ`);
      englishChapters+=book.chapters.length;englishLessons+=lessons.length;
      await connection.query('UPDATE curriculum_chapters SET is_legacy=1 WHERE id IN (?,?)',
        [`chapter-tieng-anh-${grade}-hk1`,`chapter-tieng-anh-${grade}-hk2`]);
      for(const chapter of book.chapters) {
        await connection.query(`INSERT INTO curriculum_chapters
          (id,school_year_id,grade,semester,subject_id,name,slug,sort_order,book_label)
          VALUES (?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE book_label=VALUES(book_label)`,
          [chapter.id,book.yearId,grade,chapter.semester,'tieng-anh',chapter.name,chapter.id,chapter.sortOrder,book.book]);
        for(const lesson of chapter.lessons) {
          await connection.query(`INSERT IGNORE INTO topics (id,subject_id,grade,name,slug,sort_order)
            VALUES (?,'tieng-anh',?,?,?,?)`,[lesson.id,grade,lesson.name,lesson.id,lesson.sortOrder]);
          await connection.query(`INSERT IGNORE INTO curriculum_lessons (id,chapter_id,topic_id,name,sort_order)
            VALUES (?,?,?,?,?)`,[lesson.id,chapter.id,lesson.id,lesson.name,lesson.sortOrder]);
        }
      }
    }
    const secondary = await seedSecondaryCatalog((sql,params)=>connection.query(sql,params));
    const literature = await seedLiteratureCatalog((sql,params)=>connection.query(sql,params));
    const secondaryEnglish = await seedSecondaryEnglishCatalog((sql,params)=>connection.query(sql,params));
    await connection.commit();
    console.log(
      `Đã đồng bộ ${subjects.length} môn, ${topics.length} chủ đề, `
      + `${curriculum.chapters.length} chương và ${curriculum.lessons.length} bài học cũ; khung Toán 1–5 Kết nối tri thức gồm ${bookChapterCount} chủ đề, ${bookLessonCount} bài; Tiếng Việt 1 gồm ${vietnamese.chapters.length} chủ đề, ${vietnameseLessons.length} bài; Tiếng Việt 2–5 gồm ${vietnamesePrimaryChapters} chủ đề, ${vietnamesePrimaryLessons} bài/bộ ôn tập; Tiếng Anh 1–5 gồm ${englishChapters} chủ đề, ${englishLessons} bộ; THCS có ${secondary.courses} khóa lớp 6–9 và Toán 9 có ${secondary.chapters} chương, ${secondary.lessons} bài/mục luyện tập; Ngữ văn 6–9 có ${literature.chapters} bài, ${literature.lessons} mục học; Tiếng Anh 6–9 có ${secondaryEnglish.chapters} Unit/Review, ${secondaryEnglish.lessons} mục học. Không nhập câu hỏi mẫu.`,
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
