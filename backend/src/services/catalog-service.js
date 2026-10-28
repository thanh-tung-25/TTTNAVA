import { query } from '../config/db.js';
import { AppError } from '../utils/errors.js';
import { publicSubject, publicTopic } from '../utils/serializers.js';

export async function listSubjects() {
  const rows = await query('SELECT * FROM subjects ORDER BY sort_order ASC, name ASC');
  return rows.map(publicSubject);
}

export async function listTopics(subjectId, grade) {
  const subjectRows = await query('SELECT id FROM subjects WHERE id = ? LIMIT 1', [subjectId]);
  if (!subjectRows[0]) throw new AppError(404, 'SUBJECT_NOT_FOUND', 'Môn học không tồn tại');
  if (!Number.isInteger(grade) || grade < 1 || grade > 5) {
    throw new AppError(400, 'GRADE_INVALID', 'Lớp phải từ 1 đến 5');
  }
  const rows = await query(
    `SELECT t.*,
            (SELECT COUNT(*) FROM questions q
             WHERE q.topic_id = t.id AND q.status = 'published') AS question_count
     FROM topics t
     WHERE t.subject_id = ? AND t.grade = ?
     ORDER BY t.sort_order ASC, t.name ASC`,
    [subjectId, grade],
  );
  return rows.map(publicTopic);
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
    subjectName: rows[0].subject_name,
    subjectColor: rows[0].subject_color,
  };
}
