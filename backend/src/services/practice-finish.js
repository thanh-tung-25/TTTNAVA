import { withTransaction } from '../config/db.js';
import { AppError } from '../utils/errors.js';
import { insertLedger } from './ledger-service.js';
import { sessionState } from './practice-state.js';

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
