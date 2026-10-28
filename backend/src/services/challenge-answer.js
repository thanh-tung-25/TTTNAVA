import { withTransaction } from '../config/db.js';
import { AppError } from '../utils/errors.js';
import { parseJson } from '../utils/normalize.js';
import { isAnswerCorrect, validateClientAnswer } from '../utils/answers.js';
import { emitToUsers } from '../realtime/emit.js';
import { assertParticipant, loadChallenge } from './challenge-store.js';
import { finalizeChallenge } from './challenge-play.js';
import { buildState } from './challenge-state.js';

export async function answerChallenge(profileId, challengeId, { index, questionId, answer: rawAnswer }) {
  const challenge = await loadChallenge(challengeId);
  assertParticipant(challenge, profileId);
  if (profileId === challenge.opponent_id && challenge.opponent_role === 'bot') {
    throw new AppError(403, 'BOT_CANNOT_ANSWER', 'Không thể trả lời thay Robot');
  }

  const now = new Date();
  if (challenge.status !== 'in_progress') {
    throw new AppError(409, 'NOT_IN_PROGRESS', 'Trận đấu chưa bắt đầu hoặc đã kết thúc');
  }
  if (now < new Date(challenge.started_at)) {
    throw new AppError(409, 'NOT_STARTED', 'Trận đấu chưa bắt đầu');
  }
  if (now > new Date(challenge.ends_at)) {
    await finalizeChallenge(challengeId, { force: false });
    throw new AppError(409, 'CHALLENGE_TIME_UP', 'Đã hết giờ thi đấu');
  }

  const questionIds = parseJson(challenge.question_ids);
  const result = await withTransaction(async (connection) => {
    const [answers] = await connection.query(
      'SELECT COUNT(*) AS total FROM challenge_answers WHERE challenge_id = ? AND profile_id = ?',
      [challengeId, profileId],
    );
    const expectedIndex = Number(answers[0].total);
    if (Number(index) !== expectedIndex) {
      throw new AppError(409, 'INDEX_MISMATCH', 'Câu hỏi không đúng thứ tự, con tải lại nhé');
    }
    const expectedQuestionId = questionIds[expectedIndex % questionIds.length];
    if (questionId !== expectedQuestionId) {
      throw new AppError(409, 'QUESTION_MISMATCH', 'Câu hỏi không khớp, con tải lại nhé');
    }

    const [rows] = await connection.query(
      `SELECT q.*, a.answer_json, a.explanation
       FROM questions q JOIN question_answers a ON a.question_id = q.id
       WHERE q.id = ? LIMIT 1`,
      [questionId],
    );
    if (!rows[0]) throw new AppError(404, 'QUESTION_NOT_FOUND', 'Câu hỏi không tồn tại');
    const [options] = await connection.query(
      'SELECT opt_key, option_text FROM question_options WHERE question_id = ? ORDER BY sort_order ASC',
      [questionId],
    );
    const question = {
      ...rows[0],
      answer: parseJson(rows[0].answer_json),
      options: options.map((option) => ({ key: option.opt_key, text: option.option_text })),
    };
    const answer = validateClientAnswer(question, rawAnswer);
    const correct = isAnswerCorrect(question, answer);
    await connection.query(
      `INSERT INTO challenge_answers
       (challenge_id, profile_id, q_index, question_id, answer_json, is_correct)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [challengeId, profileId, expectedIndex, questionId, JSON.stringify(answer), correct ? 1 : 0],
    );
    return {
      isCorrect: correct,
      correctAnswer: question.answer,
      explanation: rows[0].explanation,
      answeredCount: expectedIndex + 1,
    };
  });

  emitToUsers([challenge.challenger_id, challenge.opponent_id], 'challenge:updated', { challengeId });
  return { feedback: result, state: await buildState(profileId, challengeId) };
}
