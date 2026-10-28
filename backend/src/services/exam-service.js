import { randomUUID } from 'node:crypto';
import { query, withTransaction } from '../config/db.js';
import { AppError } from '../utils/errors.js';
import { sha256Hex } from '../utils/hash.js';
import { parseJson } from '../utils/normalize.js';
import { validateClientAnswer, isAnswerCorrect } from '../utils/answers.js';
import { addSeconds, toIso } from '../utils/time.js';
import { selectQuestionsForRound } from './question-service.js';
import {
  EXAM_DURATION_SECONDS,
  EXAM_GRACE_SECONDS,
  EXAM_SIZE,
} from './exam-constants.js';
import { finalizeAttempt } from './exam-finalize.js';
import { buildState, ownedAttempt } from './exam-state.js';

export async function startExam(studentId, topicId) {
  const id = randomUUID();
  const seed = sha256Hex(`${id}|exam`);
  const now = new Date();
  const endsAt = addSeconds(now, EXAM_DURATION_SECONDS);
  const { questionIds } = await selectQuestionsForRound({
    studentId,
    topicId,
    count: EXAM_SIZE,
    seed,
  });

  await withTransaction(async (connection) => {
    await connection.query(
      `INSERT INTO exam_attempts
       (id, student_id, topic_id, total_questions, duration_seconds, seed, started_at, ends_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, studentId, topicId, questionIds.length, EXAM_DURATION_SECONDS, seed, now, endsAt],
    );
    for (let index = 0; index < questionIds.length; index += 1) {
      await connection.query(
        'INSERT INTO exam_questions (attempt_id, position, question_id) VALUES (?, ?, ?)',
        [id, index + 1, questionIds[index]],
      );
    }
  });

  return buildState(studentId, id);
}

export async function getExam(studentId, attemptId) {
  return buildState(studentId, attemptId);
}

export async function saveExamAnswer(studentId, attemptId, questionId, rawAnswer) {
  const attempt = await ownedAttempt(studentId, attemptId);
  if (attempt.status === 'submitted') {
    throw new AppError(409, 'EXAM_SUBMITTED', 'Bài thi đã được nộp');
  }
  const now = new Date();
  const graceEnd = addSeconds(new Date(attempt.ends_at), EXAM_GRACE_SECONDS);
  if (now > graceEnd) {
    await finalizeAttempt(attemptId, { force: false });
    throw new AppError(409, 'EXAM_TIME_UP', 'Đã hết giờ làm bài');
  }

  const rows = await query(
    `SELECT q.*, a.answer_json FROM exam_questions eq
     JOIN questions q ON q.id = eq.question_id
     JOIN question_answers a ON a.question_id = q.id
     WHERE eq.attempt_id = ? AND eq.question_id = ? LIMIT 1`,
    [attemptId, questionId],
  );
  if (!rows[0]) throw new AppError(404, 'QUESTION_NOT_IN_EXAM', 'Câu hỏi không thuộc bài thi');

  const optionRows = await query(
    'SELECT opt_key, option_text FROM question_options WHERE question_id = ? ORDER BY sort_order ASC',
    [questionId],
  );
  const question = {
    ...rows[0],
    answer: parseJson(rows[0].answer_json),
    options: optionRows.map((row) => ({ key: row.opt_key, text: row.option_text })),
  };
  const answer = validateClientAnswer(question, rawAnswer);
  const correct = isAnswerCorrect(question, answer);

  await query(
    `INSERT INTO exam_answers (attempt_id, question_id, answer_json, is_correct)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE answer_json = VALUES(answer_json),
       is_correct = VALUES(is_correct), answered_at = UTC_TIMESTAMP(3)`,
    [attemptId, questionId, JSON.stringify(answer), correct ? 1 : 0],
  );
  const [counts] = await query(
    'SELECT COUNT(*) AS answered FROM exam_answers WHERE attempt_id = ?',
    [attemptId],
  );
  await query('UPDATE exam_attempts SET answered_count = ? WHERE id = ?', [counts.answered, attemptId]);

  return { saved: true, answeredCount: Number(counts.answered), endsAt: toIso(attempt.ends_at) };
}

export async function submitExam(studentId, attemptId) {
  await ownedAttempt(studentId, attemptId);
  await finalizeAttempt(attemptId, { force: true });
  return buildState(studentId, attemptId);
}

export { buildState } from './exam-state.js';
export { listExamHistory } from './exam-history.js';
export {
  EXAM_DURATION_SECONDS,
  EXAM_GRACE_SECONDS,
  EXAM_SIZE,
} from './exam-constants.js';
