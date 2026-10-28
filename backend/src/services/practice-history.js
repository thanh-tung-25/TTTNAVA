import { query } from '../config/db.js';
import { toIso } from '../utils/time.js';

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
