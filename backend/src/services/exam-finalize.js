import { withTransaction } from '../config/db.js';
import { AppError } from '../utils/errors.js';
import { addSeconds } from '../utils/time.js';
import { insertLedger } from './ledger-service.js';
import { EXAM_GRACE_SECONDS } from './exam-constants.js';

export async function finalizeAttempt(attemptId, { force }) {
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
