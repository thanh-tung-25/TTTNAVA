import { query } from '../config/db.js';

export async function getAdminStats() {
  const [students] = await query(
    `SELECT COUNT(*) AS total,
            SUM(CASE WHEN banned_until IS NULL OR banned_until <= UTC_TIMESTAMP() THEN 1 ELSE 0 END) AS active
     FROM profiles WHERE role = 'student'`,
  );
  const [bank] = await query(
    `SELECT
       (SELECT COUNT(*) FROM subjects) AS subjects,
       (SELECT COUNT(*) FROM topics) AS topics,
       (SELECT COUNT(*) FROM questions) AS questions,
       (SELECT COUNT(*) FROM questions WHERE status = 'published') AS published_questions,
       (SELECT COUNT(*) FROM questions WHERE status IN ('draft', 'visible')) AS draft_questions,
       (SELECT COUNT(*) FROM questions WHERE status = 'hidden') AS hidden_questions`,
  );
  const [practice] = await query(
    'SELECT COUNT(*) AS total FROM practice_sessions WHERE status = \'finished\'',
  );
  const [exam] = await query(
    'SELECT COUNT(*) AS total FROM exam_attempts WHERE status = \'submitted\'',
  );
  const [challenge] = await query(
    `SELECT COUNT(*) AS total, COALESCE(SUM(bot_level IS NOT NULL), 0) AS robot
     FROM challenges
     WHERE status = 'finished'
        OR (status = 'in_progress' AND ends_at + INTERVAL 60 SECOND > UTC_TIMESTAMP(3))`,
  );
  const [diamonds] = await query(
    'SELECT COALESCE(SUM(amount), 0) AS total FROM diamond_ledger WHERE amount > 0',
  );

  const bySubject = await query(
    `SELECT s.id, s.name, s.color,
            COALESCE((SELECT COUNT(*) FROM practice_sessions ps
                      JOIN topics t ON t.id = ps.topic_id
                      WHERE t.subject_id = s.id AND ps.status = 'finished'), 0) AS practices,
            COALESCE((SELECT COUNT(*) FROM exam_attempts ea
                      JOIN topics t ON t.id = ea.topic_id
                      WHERE t.subject_id = s.id AND ea.status = 'submitted'), 0) AS exams
     FROM subjects s ORDER BY s.sort_order ASC`,
  );

  const topStudents = await query(
    `SELECT p.id, p.display_name, p.avatar_key, p.grade, COALESCE(SUM(dl.amount), 0) AS diamonds
     FROM diamond_ledger dl
     JOIN profiles p ON p.id = dl.profile_id
     WHERE dl.created_at >= DATE_SUB(UTC_TIMESTAMP(3), INTERVAL 7 DAY) AND dl.amount > 0
     GROUP BY p.id, p.display_name, p.avatar_key, p.grade
     ORDER BY diamonds DESC LIMIT 5`,
  );

  return {
    students: { total: Number(students.total), active: Number(students.active) },
    bank: {
      subjects: Number(bank.subjects),
      topics: Number(bank.topics),
      questions: Number(bank.questions),
      publishedQuestions: Number(bank.published_questions),
      draftQuestions: Number(bank.draft_questions),
      hiddenQuestions: Number(bank.hidden_questions),
    },
    practiceSessions: Number(practice.total),
    examAttempts: Number(exam.total),
    challenges: { total: Number(challenge.total), robot: Number(challenge.robot) },
    diamondsAwarded: Number(diamonds.total),
    bySubject: bySubject.map((row) => ({
      id: row.id,
      name: row.name,
      color: row.color,
      practices: Number(row.practices),
      exams: Number(row.exams),
    })),
    topStudents: topStudents.map((row) => ({
      profileId: row.id,
      displayName: row.display_name,
      avatarKey: row.avatar_key,
      grade: Number(row.grade),
      diamonds: Number(row.diamonds),
    })),
  };
}
