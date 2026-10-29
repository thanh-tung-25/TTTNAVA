import { query } from '../config/db.js';
import { AppError } from '../utils/errors.js';

const SCOPE_SELECT = `
  SELECT c.id AS chapter_id, c.name AS chapter_name, c.school_year_id AS year_id,
         c.grade, c.semester, c.subject_id, s.name AS subject_name,
         y.name AS year_name, l.id AS lesson_id, l.name AS lesson_name,
         l.topic_id
  FROM curriculum_chapters c
  JOIN school_years y ON y.id = c.school_year_id
  JOIN subjects s ON s.id = c.subject_id
  LEFT JOIN curriculum_lessons l ON l.chapter_id = c.id`;

function scopeFromRow(row) {
  return {
    yearId: row.year_id,
    yearName: row.year_name,
    grade: Number(row.grade),
    semester: row.semester,
    subjectId: row.subject_id,
    subjectName: row.subject_name,
    chapterId: row.chapter_id,
    chapterName: row.chapter_name,
    lessonId: row.lesson_id ?? null,
    lessonName: row.lesson_name ?? null,
    topicId: row.topic_id ?? null,
  };
}

function assertMatches(scope, filters) {
  const checks = [
    ['yearId', filters.yearId, scope.yearId],
    ['grade', filters.grade, scope.grade],
    ['semester', filters.semester, scope.semester],
    ['subjectId', filters.subjectId, scope.subjectId],
    ['chapterId', filters.chapterId, scope.chapterId],
    ['topicId', filters.topicId, scope.topicId],
  ];
  for (const [field, provided, actual] of checks) {
    if (provided === undefined || provided === null || provided === '') continue;
    if (String(provided) !== String(actual)) {
      throw new AppError(400, 'SCOPE_MISMATCH', `Phạm vi ${field} không khớp với mục đã chọn`);
    }
  }
}

export async function resolveCurriculumScope(filters) {
  let rows;
  if (filters.lessonId) {
    rows = await query(`${SCOPE_SELECT} WHERE l.id = ? LIMIT 1`, [filters.lessonId]);
  } else if (filters.chapterId) {
    rows = await query(
      `SELECT c.id AS chapter_id, c.name AS chapter_name, c.school_year_id AS year_id,
              c.grade, c.semester, c.subject_id, s.name AS subject_name,
              y.name AS year_name, NULL AS lesson_id, NULL AS lesson_name, NULL AS topic_id
       FROM curriculum_chapters c
       JOIN school_years y ON y.id = c.school_year_id
       JOIN subjects s ON s.id = c.subject_id
       WHERE c.id = ? LIMIT 1`,
      [filters.chapterId],
    );
  } else {
    throw new AppError(400, 'SCOPE_REQUIRED', 'Vui lòng chọn chương hoặc bài học');
  }
  if (!rows[0]) throw new AppError(404, 'SCOPE_NOT_FOUND', 'Mục chương trình không tồn tại');
  const scope = scopeFromRow(rows[0]);
  assertMatches(scope, filters);
  return scope;
}

export async function resolveQuestionScope(payload) {
  if (payload.lessonId || payload.chapterId) return resolveCurriculumScope(payload);
  if (payload.topicId) {
    const rows = await query(
      `${SCOPE_SELECT} WHERE l.topic_id = ? ORDER BY y.is_active DESC, c.sort_order ASC LIMIT 1`,
      [payload.topicId],
    );
    if (!rows[0]) {
      throw new AppError(400, 'SCOPE_REQUIRED', 'Chủ đề chưa được xếp vào chương trình học');
    }
    const scope = scopeFromRow(rows[0]);
    assertMatches(scope, payload);
    return scope;
  }
  throw new AppError(400, 'SCOPE_REQUIRED', 'Vui lòng chọn bài học cho câu hỏi');
}

export async function currentQuestionScope(topicId) {
  const rows = await query(
    `${SCOPE_SELECT} WHERE l.topic_id = ? ORDER BY y.is_active DESC, c.sort_order ASC LIMIT 1`,
    [topicId],
  );
  return rows[0] ? scopeFromRow(rows[0]) : null;
}
