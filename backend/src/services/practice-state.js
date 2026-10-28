import { query } from '../config/db.js';
import { AppError } from '../utils/errors.js';
import { shuffleQuestionForClient } from '../utils/hash.js';
import { parseJson } from '../utils/normalize.js';
import { praiseForPercent } from '../utils/answers.js';
import { toIso } from '../utils/time.js';

export async function ownedSession(studentId, sessionId) {
  const rows = await query(
    `SELECT ps.*, t.name AS topic_name, t.grade, t.subject_id, s.name AS subject_name
     FROM practice_sessions ps
     JOIN topics t ON t.id = ps.topic_id
     JOIN subjects s ON s.id = t.subject_id
     WHERE ps.id = ? AND ps.student_id = ?
     LIMIT 1`,
    [sessionId, studentId],
  );
  if (!rows[0]) throw new AppError(404, 'SESSION_NOT_FOUND', 'Lượt luyện tập không tồn tại');
  return rows[0];
}

async function sessionQuestions(sessionId) {
  return query(
    `SELECT q.*, pq.position, a.answer_json, a.explanation
     FROM practice_questions pq
     JOIN questions q ON q.id = pq.question_id
     JOIN question_answers a ON a.question_id = q.id
     WHERE pq.session_id = ?
     ORDER BY pq.position ASC`,
    [sessionId],
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

async function answersFor(sessionId) {
  const rows = await query(
    'SELECT question_id, answer_json, is_correct, answered_at FROM practice_answers WHERE session_id = ?',
    [sessionId],
  );
  return new Map(rows.map((row) => [row.question_id, {
    selected: parseJson(row.answer_json),
    isCorrect: Boolean(row.is_correct),
    answeredAt: toIso(row.answered_at),
  }]));
}

export async function sessionState(studentId, sessionId) {
  const session = await ownedSession(studentId, sessionId);
  const rows = await sessionQuestions(sessionId);
  const optionsMap = await optionsFor(rows.map((row) => row.id));
  const answerMap = await answersFor(sessionId);
  const ledger = session.status === 'finished'
    ? await query(
      'SELECT COALESCE(SUM(amount), 0) AS earned FROM diamond_ledger WHERE profile_id = ? AND ref_type = \'practice\' AND ref_id = ?',
      [studentId, sessionId],
    )
    : [{ earned: 0 }];

  const questions = rows.map((row) => {
    const question = { ...row, options: optionsMap.get(row.id) ?? [], answer: parseJson(row.answer_json) };
    const payload = shuffleQuestionForClient(question, session.seed);
    const answered = answerMap.get(row.id);
    if (answered) {
      payload.selected = answered.selected;
      payload.isCorrect = answered.isCorrect;
      payload.correctAnswer = question.answer;
      payload.explanation = row.explanation;
      payload.answeredAt = answered.answeredAt;
    }
    return payload;
  });

  const total = Number(session.total_questions);
  const correct = Number(session.correct_count);
  const percent = total > 0 ? Math.round((correct / total) * 100) : 0;
  const currentIndex = rows.findIndex((row) => !answerMap.has(row.id));

  return {
    id: session.id,
    status: session.status,
    topic: {
      id: session.topic_id,
      name: session.topic_name,
      grade: Number(session.grade),
      subjectId: session.subject_id,
      subjectName: session.subject_name,
    },
    totalQuestions: total,
    answeredCount: Number(session.answered_count),
    correctCount: correct,
    percent,
    praise: session.status === 'finished' ? praiseForPercent(percent) : null,
    diamondsEarned: Number(ledger[0]?.earned ?? 0),
    startedAt: toIso(session.started_at),
    finishedAt: toIso(session.finished_at),
    currentIndex: currentIndex === -1 ? Math.max(0, rows.length - 1) : currentIndex,
    questions,
  };
}
