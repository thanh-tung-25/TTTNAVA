import { query, withTransaction } from '../config/db.js';
import { AppError } from '../utils/errors.js';
import { parseJson } from '../utils/normalize.js';
import { toIso } from '../utils/time.js';
import {
  assertTopicSelection,
  normalizeQuestionStatus,
  validateQuestionPayload,
} from './admin-question-validation.js';
import { getQuestionDetail } from './admin-questions.js';

function statusAction(currentStatus, nextStatus) {
  if (currentStatus === nextStatus) return 'update';
  if (nextStatus === 'hidden') return 'hide';
  if (nextStatus === 'published') return 'publish';
  return 'unpublish';
}

export async function updateQuestion(questionId, adminId, payload) {
  const currentRows = await query(
    `SELECT q.*, t.subject_id, t.grade
     FROM questions q JOIN topics t ON t.id = q.topic_id
     WHERE q.id = ? LIMIT 1`,
    [questionId],
  );
  if (!currentRows[0]) throw new AppError(404, 'QUESTION_NOT_FOUND', 'Câu hỏi không tồn tại');
  const current = currentRows[0];

  const topicId = payload.topicId ?? current.topic_id;
  await assertTopicSelection({
    topicId,
    subjectId: payload.subjectId,
    grade: payload.grade,
  });

  const type = payload.type ?? current.type;
  const clean = validateQuestionPayload(type, payload);
  const currentStatus = normalizeQuestionStatus(current);
  const nextStatus = clean.status ?? currentStatus;
  const publishedAt = nextStatus === 'published'
    ? (currentStatus === 'published' ? current.published_at : new Date())
    : null;

  await withTransaction(async (connection) => {
    const [optionRows] = await connection.query(
      'SELECT opt_key, option_text FROM question_options WHERE question_id = ? ORDER BY sort_order ASC',
      [questionId],
    );
    const [answerRows] = await connection.query(
      'SELECT answer_json, explanation FROM question_answers WHERE question_id = ?',
      [questionId],
    );

    const before = {
      topicId: current.topic_id,
      type: current.type,
      prompt: current.prompt,
      difficulty: current.difficulty,
      status: currentStatus,
      imageUrl: current.image_url,
      options: optionRows.map((option) => ({ key: option.opt_key, text: option.option_text })),
      answer: parseJson(answerRows[0]?.answer_json),
      explanation: answerRows[0]?.explanation,
    };

    await connection.query(
      `UPDATE questions
       SET topic_id = ?, type = ?, prompt = ?, difficulty = ?, status = ?,
           image_url = ?, updated_by = ?, published_at = ?
       WHERE id = ?`,
      [topicId, type, clean.prompt, clean.difficulty, nextStatus, clean.imageUrl,
        adminId, publishedAt, questionId],
    );
    await connection.query('DELETE FROM question_options WHERE question_id = ?', [questionId]);
    for (const option of clean.options) {
      await connection.query(
        'INSERT INTO question_options (question_id, opt_key, option_text, sort_order) VALUES (?, ?, ?, ?)',
        [questionId, option.key, option.text, option.sortOrder],
      );
    }
    await connection.query(
      'UPDATE question_answers SET answer_json = ?, explanation = ? WHERE question_id = ?',
      [JSON.stringify(clean.answer), clean.explanation, questionId],
    );

    const after = {
      topicId,
      type,
      prompt: clean.prompt,
      difficulty: clean.difficulty,
      status: nextStatus,
      imageUrl: clean.imageUrl,
      options: clean.options,
      answer: clean.answer,
      explanation: clean.explanation,
    };
    await connection.query(
      `INSERT INTO atomic_question_writes (question_id, admin_id, action, before_json, after_json)
       VALUES (?, ?, ?, ?, ?)`,
      [questionId, adminId, statusAction(currentStatus, nextStatus),
        JSON.stringify(before), JSON.stringify(after)],
    );
  });

  return getQuestionDetail(questionId);
}

export async function listWriteAudit(questionId, limit = 20) {
  const rows = await query(
    `SELECT a.id, a.action, a.created_at, p.display_name AS admin_name
     FROM atomic_question_writes a JOIN profiles p ON p.id = a.admin_id
     WHERE a.question_id = ? ORDER BY a.created_at DESC LIMIT ?`,
    [questionId, limit],
  );
  return rows.map((row) => ({
    id: Number(row.id),
    action: row.action,
    adminName: row.admin_name,
    createdAt: toIso(row.created_at),
  }));
}
