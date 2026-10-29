import { query } from '../config/db.js';
import { AppError } from '../utils/errors.js';
import { parseJson } from '../utils/normalize.js';
import { toIso } from '../utils/time.js';
import { normalizeQuestionStatus } from './admin-question-validation.js';
import { currentQuestionScope, resolveQuestionScope } from './curriculum-scope.js';

function addStatusFilter(where, status) {
  if (status === 'published') where.push("q.status = 'published'");
  else if (status === 'hidden') where.push("q.status = 'hidden'");
  else if (status === 'draft') where.push("q.status IN ('draft', 'visible')");
}

async function scopeFilter(filters) {
  const scope = await resolveQuestionScope(filters);
  if (scope.lessonId) return { sql: 'q.topic_id = ?', params: [scope.topicId], scope };
  return {
    sql: 'q.topic_id IN (SELECT topic_id FROM curriculum_lessons WHERE chapter_id = ?)',
    params: [scope.chapterId],
    scope,
  };
}

export async function listQuestions(filters, page, limit) {
  const where = [];
  const params = [];
  const scoped = await scopeFilter(filters);
  where.push(scoped.sql);
  params.push(...scoped.params);
  addStatusFilter(where, filters.status);
  if (filters.type) { where.push('q.type = ?'); params.push(filters.type); }
  if (filters.difficulty) { where.push('q.difficulty = ?'); params.push(filters.difficulty); }
  if (filters.q) {
    where.push('(q.prompt LIKE ? OR q.id LIKE ?)');
    params.push(`%${filters.q}%`, `%${filters.q}%`);
  }
  const whereSql = `WHERE ${where.join(' AND ')}`;
  const offset = (page - 1) * limit;

  const rows = await query(
    `SELECT q.id, q.type, q.prompt, q.difficulty, q.status, q.topic_id,
            q.created_at, q.updated_at, q.published_at,
            t.name AS topic_name, t.grade, t.subject_id, s.name AS subject_name,
            (SELECT cl.name FROM curriculum_lessons cl WHERE cl.topic_id = q.topic_id
             ORDER BY cl.sort_order ASC LIMIT 1) AS lesson_name,
            (SELECT cc.name FROM curriculum_lessons cl
             JOIN curriculum_chapters cc ON cc.id = cl.chapter_id
             WHERE cl.topic_id = q.topic_id ORDER BY cc.sort_order ASC LIMIT 1) AS chapter_name,
            cp.display_name AS creator_name, up.display_name AS updater_name,
            (SELECT COUNT(*) FROM question_options qo WHERE qo.question_id = q.id) AS option_count
     FROM questions q
     JOIN topics t ON t.id = q.topic_id
     JOIN subjects s ON s.id = t.subject_id
     LEFT JOIN profiles cp ON cp.id = q.created_by
     LEFT JOIN profiles up ON up.id = q.updated_by
     ${whereSql}
     ORDER BY q.updated_at DESC, q.id DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset],
  );
  const [total] = await query(
    `SELECT COUNT(*) AS total FROM questions q ${whereSql}`,
    params,
  );
  return {
    items: rows.map((row) => ({
      id: row.id,
      type: row.type,
      prompt: row.prompt,
      difficulty: row.difficulty,
      status: normalizeQuestionStatus(row),
      topicId: row.topic_id,
      topicName: row.topic_name,
      lessonName: row.lesson_name,
      chapterName: row.chapter_name,
      grade: Number(row.grade),
      subjectId: row.subject_id,
      subjectName: row.subject_name,
      optionCount: Number(row.option_count),
      creatorName: row.creator_name,
      updaterName: row.updater_name,
      createdAt: toIso(row.created_at),
      updatedAt: toIso(row.updated_at),
      publishedAt: toIso(row.published_at),
    })),
    total: Number(total.total),
    scope: scoped.scope,
  };
}

export async function getQuestionDetail(questionId) {
  const rows = await query(
    `SELECT q.*, t.name AS topic_name, t.grade, t.subject_id, s.name AS subject_name,
            a.answer_json, a.explanation,
            cp.display_name AS creator_name, up.display_name AS updater_name
     FROM questions q
     JOIN topics t ON t.id = q.topic_id
     JOIN subjects s ON s.id = t.subject_id
     JOIN question_answers a ON a.question_id = q.id
     LEFT JOIN profiles cp ON cp.id = q.created_by
     LEFT JOIN profiles up ON up.id = q.updated_by
     WHERE q.id = ? LIMIT 1`,
    [questionId],
  );
  if (!rows[0]) throw new AppError(404, 'QUESTION_NOT_FOUND', 'Câu hỏi không tồn tại');
  const options = await query(
    'SELECT opt_key, option_text FROM question_options WHERE question_id = ? ORDER BY sort_order ASC, opt_key ASC',
    [questionId],
  );
  const row = rows[0];
  const scope = await currentQuestionScope(row.topic_id);
  return {
    id: row.id,
    type: row.type,
    prompt: row.prompt,
    imageUrl: row.image_url,
    difficulty: row.difficulty,
    status: normalizeQuestionStatus(row),
    topicId: row.topic_id,
    topicName: row.topic_name,
    grade: Number(row.grade),
    subjectId: row.subject_id,
    subjectName: row.subject_name,
    ...scope,
    options: options.map((option) => ({ key: option.opt_key, text: option.option_text })),
    answer: parseJson(row.answer_json),
    explanation: row.explanation,
    createdBy: row.created_by ? { id: row.created_by, displayName: row.creator_name } : null,
    updatedBy: row.updated_by ? { id: row.updated_by, displayName: row.updater_name } : null,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
    publishedAt: toIso(row.published_at),
  };
}

export { validateQuestionPayload } from './admin-question-validation.js';
