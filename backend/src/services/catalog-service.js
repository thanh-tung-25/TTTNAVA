import { query } from '../config/db.js';
import { AppError } from '../utils/errors.js';
import { publicSubject, publicTopic } from '../utils/serializers.js';
import { schoolSubjectName } from '../utils/school-subjects.js';

export async function listSubjects(grade=null) {
  const rows = await query('SELECT * FROM subjects ORDER BY sort_order ASC, name ASC');
  return rows.map(row=>({...publicSubject(row),name:schoolSubjectName(row.id,grade,row.name)}));
}

export async function listTopics(subjectId, grade) {
  const subjectRows = await query('SELECT id FROM subjects WHERE id = ? LIMIT 1', [subjectId]);
  if (!subjectRows[0]) throw new AppError(404, 'SUBJECT_NOT_FOUND', 'Môn học không tồn tại');
  if (!Number.isInteger(grade) || grade < 1 || grade > 9) {
    throw new AppError(400, 'GRADE_INVALID', 'Lớp phải từ 1 đến 9');
  }
  const rows = await query(
    `SELECT t.*,c.id AS chapter_id,c.name AS chapter_name,c.semester,c.book_label,
            (SELECT COUNT(*) FROM questions q
             WHERE q.topic_id = t.id AND q.status = 'published') AS question_count
     FROM topics t
     LEFT JOIN curriculum_lessons l ON l.id=(SELECT chosen.id FROM curriculum_lessons chosen
       JOIN curriculum_chapters cc ON cc.id=chosen.chapter_id JOIN school_years yy ON yy.id=cc.school_year_id
       WHERE chosen.topic_id=t.id ORDER BY yy.is_active DESC,yy.sort_order,cc.sort_order,chosen.sort_order,chosen.id LIMIT 1)
     LEFT JOIN curriculum_chapters c ON c.id=l.chapter_id
     WHERE t.subject_id = ? AND t.grade = ?
       AND (EXISTS (SELECT 1 FROM questions published WHERE published.topic_id=t.id AND published.status='published')
            OR NOT EXISTS (SELECT 1 FROM curriculum_lessons old_lesson
                           JOIN curriculum_chapters old_chapter ON old_chapter.id=old_lesson.chapter_id
                           WHERE old_lesson.topic_id=t.id AND old_chapter.is_legacy=1))
     ORDER BY CASE WHEN t.grade>=6 THEN c.semester ELSE '' END,
       CASE WHEN t.grade>=6 THEN c.sort_order ELSE t.sort_order END,
       CASE WHEN t.grade>=6 THEN l.sort_order ELSE t.sort_order END,t.name ASC`,
    [subjectId, grade],
  );
  return rows.map(row=>({...publicTopic(row),chapterId:row.chapter_id||null,chapterName:row.chapter_name||null,semester:row.semester||null,bookLabel:row.book_label||null}));
}

export async function getTopicDetail(topicId) {
  const rows = await query(
    `SELECT t.*, s.name AS subject_name, s.color AS subject_color,
            (SELECT COUNT(*) FROM questions q
             WHERE q.topic_id = t.id AND q.status = 'published') AS question_count
     FROM topics t JOIN subjects s ON s.id = t.subject_id
     WHERE t.id = ? LIMIT 1`,
    [topicId],
  );
  if (!rows[0]) throw new AppError(404, 'TOPIC_NOT_FOUND', 'Chủ đề không tồn tại');
  return {
    ...publicTopic(rows[0]),
    subjectName: schoolSubjectName(rows[0].subject_id,rows[0].grade,rows[0].subject_name),
    subjectColor: rows[0].subject_color,
  };
}
