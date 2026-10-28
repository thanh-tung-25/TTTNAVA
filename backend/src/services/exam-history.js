import { query } from '../config/db.js';
import { toIso } from '../utils/time.js';
import { EXAM_GRACE_SECONDS } from './exam-constants.js';
import { finalizeAttempt } from './exam-finalize.js';

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
