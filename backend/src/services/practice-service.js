import { randomUUID } from 'node:crypto';
import { withTransaction } from '../config/db.js';
import { sha256Hex } from '../utils/hash.js';
import { selectQuestionsForRound } from './question-service.js';
import { sessionState } from './practice-state.js';

const PRACTICE_SIZE = 10;

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

export { answerPractice } from './practice-answer.js';
export { finishPractice } from './practice-finish.js';
export { listPracticeHistory } from './practice-history.js';
