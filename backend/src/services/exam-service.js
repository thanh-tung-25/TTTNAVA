import { randomUUID } from 'node:crypto';
import { query, withTransaction } from '../config/db.js';
import { AppError } from '../utils/errors.js';
import { sha256Hex, shuffleQuestionForClient } from '../utils/hash.js';
import { parseJson } from '../utils/normalize.js';
import { praiseForPercent, validateClientAnswer, isAnswerCorrect } from '../utils/answers.js';
import { addSeconds, toIso } from '../utils/time.js';
import { insertLedger } from './ledger-service.js';
import { selectQuestionsForRound } from './question-service.js';

export const EXAM_SIZE = 20;
export const EXAM_DURATION_SECONDS = 15 * 60;
export const EXAM_GRACE_SECONDS = 5;

async function ownedAttempt(studentId, attemptId) {
  const rows = await query(
    `SELECT ea.*, t.name AS topic_name, t.grade, t.subject_id, s.name AS subject_name
     FROM exam_attempts ea
     JOIN topics t ON t.id = ea.topic_id
     JOIN subjects s ON s.id = t.subject_id
     WHERE ea.id = ? AND ea.student_id = ?
     LIMIT 1`,
    [attemptId, studentId],
  );
  if (!rows[0]) throw new AppError(404, 'EXAM_NOT_FOUND', 'Bài thi không tồn tại');
  return rows[0];
}

async function examQuestionRows(attemptId) {
  return query(
    `SELECT q.*, eq.position, a.answer_json, a.explanation
     FROM exam_questions eq
     JOIN questions q ON q.id = eq.question_id
     JOIN question_answers a ON a.question_id = q.id
     WHERE eq.attempt_id = ?
     ORDER BY eq.position ASC`,
    [attemptId],
  );
}

async function optionsFor(questionIds) {
  if (questionIds.length === 0) return new Map();
  const placeholders = questionIds.map(() => '?').join(',');
  const rows = await query(
    `SELECT question_id, opt_key, option_text FROM question_options
     WHERE question_id IN (${placeholders}) ORDER BY sort_order ASC, opt_key ASC`,
    questionIds,
  );
  const map = new Map();
  for (const row of rows) {
    if (!map.has(row.question_id)) map.set(row.question_id, []);
    map.get(row.question_id).push({ key: row.opt_key, text: row.option_text });
  }
  return map;
}

async function answerRows(attemptId) {
  const rows = await query(
    'SELECT question_id, answer_json, is_correct FROM exam_answers WHERE attempt_id = ?',
    [attemptId],
  );
  return new Map(rows.map((row) => [row.question_id, {
    selected: parseJson(row.answer_json),
    isCorrect: Boolean(row.is_correct),
  }]));
}

async function buildState(studentId, attemptId) {
  let attempt = await ownedAttempt(studentId, attemptId);
  const now = new Date();
  const graceEnd = addSeconds(new Date(attempt.ends_at), EXAM_GRACE_SECONDS);
  if (attempt.status === 'in_progress' && now > graceEnd) {
    await finalizeAttempt(attemptId, { force: false });
    attempt = await ownedAttempt(studentId, attemptId);
  }

  const submitted = attempt.status === 'submitted';
  const rows = await examQuestionRows(attemptId);
  const optionsMap = await optionsFor(rows.map((row) => row.id));
  const chosen = await answerRows(attemptId);
  const ledger = submitted
    ? await query(
      'SELECT COALESCE(SUM(amount), 0) AS earned FROM diamond_ledger WHERE profile_id = ? AND ref_type = \'exam\' AND ref_id = ?',
      [studentId, attemptId],
    )
    : [{ earned: 0 }];

  const questions = rows.map((row) => {
    const question = { ...row, options: optionsMap.get(row.id) ?? [], answer: parseJson(row.answer_json) };
    const payload = shuffleQuestionForClient(question, attempt.seed);
    const answer = chosen.get(row.id);
    if (answer) {
      payload.selected = answer.selected;
      if (submitted) payload.isCorrect = answer.isCorrect;
    }
    if (submitted) {
      payload.correctAnswer = question.answer;
      payload.explanation = row.explanation;
    }
    return payload;
  });

  const total = Number(attempt.total_questions);
  const correct = Number(attempt.correct_count);
  const percent = total ? Math.round((correct / total) * 100) : 0;
  const remaining = Math.max(0, Math.ceil((new Date(attempt.ends_at).getTime() - now.getTime()) / 1000));

  return {
    id: attempt.id,
    status: attempt.status,
    submitted,
    topic: {
      id: attempt.topic_id,
      name: attempt.topic_name,
      grade: Number(attempt.grade),
      subjectId: attempt.subject_id,
      subjectName: attempt.subject_name,
    },
    totalQuestions: total,
    durationSeconds: Number(attempt.duration_seconds),
    answeredCount: Number(attempt.answered_count),
    correctCount: submitted ? correct : null,
    scorePercent: submitted ? Number(attempt.score_percent) : null,
    percent,
    praise: submitted ? praiseForPercent(percent) : null,
    diamondsEarned: Number(ledger[0]?.earned ?? 0),
    startedAt: toIso(attempt.started_at),
    endsAt: toIso(attempt.ends_at),
    graceEndsAt: toIso(graceEnd),
    submittedAt: toIso(attempt.submitted_at),
    remainingSeconds: submitted ? 0 : remaining,
    questions,
  };
}

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

async function finalizeAttempt(attemptId, { force }) {
  return withTransaction(async (connection) => {
    const [attemptRows] = await connection.query(
      'SELECT * FROM exam_attempts WHERE id = ? FOR UPDATE',
      [attemptId],
    );
    const attempt = attemptRows[0];
    if (!attempt) throw new AppError(404, 'EXAM_NOT_FOUND', 'Bài thi không tồn tại');
    if (attempt.status === 'submitted') return { alreadySubmitted: true };

    const now = new Date();
    const graceEnd = addSeconds(new Date(attempt.ends_at), EXAM_GRACE_SECONDS);
    if (!force && now < graceEnd) return { due: false };

    const [countRows] = await connection.query(
      `SELECT COUNT(*) AS answered, COALESCE(SUM(is_correct), 0) AS correct
       FROM exam_answers WHERE attempt_id = ?`,
      [attemptId],
    );
    const counts = countRows[0];
    const answered = Number(counts.answered);
    const correct = Number(counts.correct);
    const total = Number(attempt.total_questions);
    const percent = total ? Math.round((correct / total) * 10000) / 100 : 0;
    const perfect = answered === total && correct === total;

    let amount = 0;
    let reason = null;
    if (answered > 0) {
      amount = perfect ? 3 : 1;
      reason = perfect ? 'exam_perfect' : 'exam_complete';
    }

    await connection.query(
      'INSERT INTO finish_guard (ref_type, ref_id) VALUES (\'exam\', ?)',
      [attemptId],
    );
    await connection.query(
      `UPDATE exam_attempts
       SET status = 'submitted', submitted_at = UTC_TIMESTAMP(3),
           answered_count = ?, correct_count = ?, score_percent = ?,
           rewarded_at = IF(? > 0, UTC_TIMESTAMP(3), NULL)
       WHERE id = ?`,
      [answered, correct, percent, amount, attemptId],
    );
    if (amount > 0) {
      await insertLedger(connection, {
        profileId: attempt.student_id,
        amount,
        reason,
        refType: 'exam',
        refId: attemptId,
      });
    }
    return { alreadySubmitted: false, diamondsEarned: amount };
  });
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

async function finalizeOverdueForStudent(studentId) {
  const rows = await query(
    `SELECT id FROM exam_attempts
     WHERE student_id = ? AND status = 'in_progress'
       AND ends_at < DATE_SUB(UTC_TIMESTAMP(3), INTERVAL ${EXAM_GRACE_SECONDS} SECOND)
     ORDER BY ends_at ASC LIMIT 10`,
    [studentId],
  );
  for (const row of rows) {
    await finalizeAttempt(row.id, { force: false });
  }
}

export async function listExamHistory(studentId, page, limit) {
  await finalizeOverdueForStudent(studentId);
  const offset = (page - 1) * limit;
  const rows = await query(
    `SELECT ea.*, t.name AS topic_name, t.grade, s.name AS subject_name,
            COALESCE((SELECT SUM(dl.amount) FROM diamond_ledger dl
                      WHERE dl.profile_id = ea.student_id AND dl.ref_type = 'exam' AND dl.ref_id = ea.id), 0) AS diamonds
     FROM exam_attempts ea
     JOIN topics t ON t.id = ea.topic_id
     JOIN subjects s ON s.id = t.subject_id
     WHERE ea.student_id = ?
     ORDER BY ea.started_at DESC
     LIMIT ? OFFSET ?`,
    [studentId, limit, offset],
  );
  const totalRows = await query('SELECT COUNT(*) AS total FROM exam_attempts WHERE student_id = ?', [studentId]);
  return {
    items: rows.map((row) => ({
      id: row.id,
      status: row.status,
      topicName: row.topic_name,
      grade: Number(row.grade),
      subjectName: row.subject_name,
      totalQuestions: Number(row.total_questions),
      answeredCount: Number(row.answered_count),
      correctCount: Number(row.correct_count),
      percent: Number(row.score_percent),
      diamonds: Number(row.diamonds),
      startedAt: toIso(row.started_at),
      endsAt: toIso(row.ends_at),
      submittedAt: toIso(row.submitted_at),
    })),
    total: Number(totalRows[0].total),
  };
}

export { buildState };
