import { withTransaction } from '../config/db.js';
import { AppError } from '../utils/errors.js';
import { parseJson } from '../utils/normalize.js';
import { isAnswerCorrect, validateClientAnswer } from '../utils/answers.js';
import { sessionState } from './practice-state.js';

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
