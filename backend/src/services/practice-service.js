import { randomUUID } from 'node:crypto';
import { query, withTransaction } from '../config/db.js';
import { AppError } from '../utils/errors.js';
import { sha256Hex, shuffleQuestionForClient } from '../utils/hash.js';
import { parseJson } from '../utils/normalize.js';
import { isAnswerCorrect, praiseForPercent, validateClientAnswer } from '../utils/answers.js';
import { toIso } from '../utils/time.js';
import { insertLedger } from './ledger-service.js';
import { selectQuestionsForRound } from './question-service.js';

const PRACTICE_SIZE = 10;

async function ownedSession(studentId, sessionId) {
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

async function sessionState(studentId, sessionId) {
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

export async function startPractice(studentId, topicId) {
  const id = randomUUID();
  const seed = sha256Hex(`${id}|practice`);
  const { questionIds } = await selectQuestionsForRound({
    studentId,
    topicId,
    count: PRACTICE_SIZE,
    seed,
  });

  await withTransaction(async (connection) => {
    await connection.query(
      'INSERT INTO practice_sessions (id, student_id, topic_id, total_questions, seed) VALUES (?, ?, ?, ?, ?)',
      [id, studentId, topicId, questionIds.length, seed],
    );
    for (let index = 0; index < questionIds.length; index += 1) {
      await connection.query(
        'INSERT INTO practice_questions (session_id, position, question_id) VALUES (?, ?, ?)',
        [id, index + 1, questionIds[index]],
      );
    }
  });

  return sessionState(studentId, id);
}

export async function getPracticeSession(studentId, sessionId) {
  return sessionState(studentId, sessionId);
}

export async function answerPractice(studentId, sessionId, questionId, rawAnswer) {
  const outcome = await withTransaction(async (connection) => {
    const [sessions] = await connection.query(
      'SELECT * FROM practice_sessions WHERE id = ? AND student_id = ? FOR UPDATE',
      [sessionId, studentId],
    );
    const session = sessions[0];
    if (!session) throw new AppError(404, 'SESSION_NOT_FOUND', 'Lượt luyện tập không tồn tại');
    if (session.status !== 'in_progress') {
      throw new AppError(409, 'SESSION_FINISHED', 'Lượt luyện tập đã kết thúc');
    }

    const [rows] = await connection.query(
      `SELECT q.*, a.answer_json, a.explanation
       FROM practice_questions pq
       JOIN questions q ON q.id = pq.question_id
       JOIN question_answers a ON a.question_id = q.id
       WHERE pq.session_id = ? AND pq.question_id = ?
       LIMIT 1`,
      [sessionId, questionId],
    );
    if (!rows[0]) throw new AppError(404, 'QUESTION_NOT_IN_SESSION', 'Câu hỏi không thuộc lượt này');

    const [optionRows] = await connection.query(
      'SELECT opt_key, option_text FROM question_options WHERE question_id = ? ORDER BY sort_order ASC',
      [questionId],
    );
    const [existing] = await connection.query(
      'SELECT * FROM practice_answers WHERE session_id = ? AND question_id = ? LIMIT 1',
      [sessionId, questionId],
    );
    if (existing[0]) {
      return {
        isCorrect: Boolean(existing[0].is_correct),
        selected: parseJson(existing[0].answer_json),
        correctAnswer: parseJson(rows[0].answer_json),
        explanation: rows[0].explanation,
        answeredCount: Number(session.answered_count),
        correctCount: Number(session.correct_count),
        alreadyAnswered: true,
      };
    }

    const question = {
      ...rows[0],
      answer: parseJson(rows[0].answer_json),
      options: optionRows.map((row) => ({ key: row.opt_key, text: row.option_text })),
    };
    const answer = validateClientAnswer(question, rawAnswer);
    const correct = isAnswerCorrect(question, answer);

    await connection.query(
      'INSERT INTO practice_answers (session_id, question_id, answer_json, is_correct) VALUES (?, ?, ?, ?)',
      [sessionId, questionId, JSON.stringify(answer), correct ? 1 : 0],
    );
    await connection.query(
      `UPDATE practice_sessions
       SET answered_count = answered_count + 1, correct_count = correct_count + ?
       WHERE id = ?`,
      [correct ? 1 : 0, sessionId],
    );

    return {
      isCorrect: correct,
      selected: answer,
      correctAnswer: question.answer,
      explanation: rows[0].explanation,
      answeredCount: Number(session.answered_count) + 1,
      correctCount: Number(session.correct_count) + (correct ? 1 : 0),
      alreadyAnswered: false,
    };
  });

  const state = await sessionState(studentId, sessionId);
  return { ...outcome, state };
}

export async function finishPractice(studentId, sessionId) {
  const result = await withTransaction(async (connection) => {
    const [sessions] = await connection.query(
      'SELECT * FROM practice_sessions WHERE id = ? AND student_id = ? FOR UPDATE',
      [sessionId, studentId],
    );
    const session = sessions[0];
    if (!session) throw new AppError(404, 'SESSION_NOT_FOUND', 'Lượt luyện tập không tồn tại');
    if (session.status === 'finished') {
      return { alreadyFinished: true, diamondsEarned: null };
    }

    const [countRows] = await connection.query(
      `SELECT COUNT(*) AS answered, COALESCE(SUM(is_correct), 0) AS correct
       FROM practice_answers WHERE session_id = ?`,
      [sessionId],
    );
    const counts = countRows[0];
    const answered = Number(counts.answered);
    const correct = Number(counts.correct);
    const total = Number(session.total_questions);
    const perfect = answered === total && correct === total;

    let amount = 0;
    let reason = null;
    if (answered > 0) {
      amount = perfect ? 3 : 1;
      reason = perfect ? 'practice_perfect' : 'practice_complete';
    }

    await connection.query(
      'INSERT INTO finish_guard (ref_type, ref_id) VALUES (\'practice\', ?)',
      [sessionId],
    );
    await connection.query(
      `UPDATE practice_sessions
       SET status = 'finished', finished_at = UTC_TIMESTAMP(3),
           answered_count = ?, correct_count = ?, rewarded_at = IF(? > 0, UTC_TIMESTAMP(3), NULL)
       WHERE id = ?`,
      [answered, correct, amount, sessionId],
    );

    if (amount > 0) {
      await insertLedger(connection, {
        profileId: studentId,
        amount,
        reason,
        refType: 'practice',
        refId: sessionId,
      });
    }
    return { alreadyFinished: false, diamondsEarned: amount };
  });

  const state = await sessionState(studentId, sessionId);
  return { ...state, diamondsEarned: result.diamondsEarned ?? state.diamondsEarned };
}

export async function listPracticeHistory(studentId, page, limit) {
  const offset = (page - 1) * limit;
  const rows = await query(
    `SELECT ps.id, ps.status, ps.total_questions, ps.correct_count, ps.started_at, ps.finished_at,
            t.name AS topic_name, t.grade, s.name AS subject_name,
            COALESCE((SELECT SUM(amount) FROM diamond_ledger dl
                      WHERE dl.profile_id = ps.student_id AND dl.ref_type = 'practice' AND dl.ref_id = ps.id), 0) AS diamonds
     FROM practice_sessions ps
     JOIN topics t ON t.id = ps.topic_id
     JOIN subjects s ON s.id = t.subject_id
     WHERE ps.student_id = ?
     ORDER BY ps.started_at DESC
     LIMIT ? OFFSET ?`,
    [studentId, limit, offset],
  );
  const totalRows = await query('SELECT COUNT(*) AS total FROM practice_sessions WHERE student_id = ?', [studentId]);
  return {
    items: rows.map((row) => ({
      id: row.id,
      status: row.status,
      topicName: row.topic_name,
      grade: Number(row.grade),
      subjectName: row.subject_name,
      totalQuestions: Number(row.total_questions),
      correctCount: Number(row.correct_count),
      percent: Number(row.total_questions) ? Math.round((Number(row.correct_count) / Number(row.total_questions)) * 100) : 0,
      diamonds: Number(row.diamonds),
      startedAt: toIso(row.started_at),
      finishedAt: toIso(row.finished_at),
    })),
    total: Number(totalRows[0].total),
  };
}
