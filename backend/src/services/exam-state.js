import { query } from '../config/db.js';
import { AppError } from '../utils/errors.js';
import { shuffleQuestionForClient } from '../utils/hash.js';
import { parseJson } from '../utils/normalize.js';
import { praiseForPercent } from '../utils/answers.js';
import { addSeconds, toIso } from '../utils/time.js';
import { EXAM_GRACE_SECONDS } from './exam-constants.js';
import { finalizeAttempt } from './exam-finalize.js';

export async function ownedAttempt(studentId, attemptId) {
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

export async function buildState(studentId, attemptId) {
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
