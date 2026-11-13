import { query, dialectSql } from '../config/db.js';
import { toIso, vnRange } from '../utils/time.js';

function chineseDiamondSource(alias) {
  return `(${alias}.ref_type='chinese' OR (${alias}.ref_type='quest' AND EXISTS(
    SELECT 1 FROM student_quest_claims sq JOIN courses sc ON sc.id=sq.course_id
    WHERE sq.id=${alias}.ref_id AND sq.profile_id=${alias}.profile_id AND sc.kind='chinese'
  )))`;
}

export async function insertLedger(connection, { profileId, amount, reason, refType, refId }) {
  if (!amount) return 0;
  const [result] = await connection.query(
    dialectSql(
      `INSERT IGNORE INTO diamond_ledger (profile_id, amount, reason, ref_type, ref_id) VALUES (?, ?, ?, ?, ?)`,
      `INSERT INTO diamond_ledger (profile_id, amount, reason, ref_type, ref_id) VALUES (?, ?, ?, ?, ?) ON CONFLICT(profile_id,reason,ref_type,ref_id) DO NOTHING`,
    ),
    [profileId, amount, reason, refType, refId],
  );
  return result.affectedRows;
}

export async function diamondTotals(profileId) {
  const rows = await query(
    `SELECT
       COALESCE(SUM(amount), 0) AS total,
       COALESCE(SUM(CASE WHEN created_at >= ? AND amount>0 THEN amount ELSE 0 END), 0) AS week,
       COALESCE(SUM(CASE WHEN created_at >= ? AND amount>0 THEN amount ELSE 0 END), 0) AS month
     FROM diamond_ledger WHERE profile_id = ?`,
    [vnRange('week').start, vnRange('month').start, profileId],
  );
  return {
    total: Number(rows[0].total),
    week: Number(rows[0].week),
    month: Number(rows[0].month),
  };
}

export async function recentLedger(profileId, limit = 20) {
  const rows = await query(
    `SELECT id, amount, reason, ref_type, ref_id, created_at
     FROM diamond_ledger WHERE profile_id = ?
     ORDER BY created_at DESC, id DESC LIMIT ?`,
    [profileId, limit],
  );
  return rows.map((row) => ({
    id: Number(row.id),
    amount: Number(row.amount),
    reason: row.reason,
    refType: row.ref_type,
    refId: row.ref_id,
    createdAt: toIso(row.created_at),
  }));
}

export async function getDiamondSummary(profileId) {
  return {
    ...(await diamondTotals(profileId)),
    recent: await recentLedger(profileId, 20),
  };
}

export async function getLeaderboard(range = 'week', limit = 50, grade = null, program = null) {
  const { start } = vnRange(range);
  const params = [];
  const dateFilter = start ? 'AND dl.created_at >= ?' : '';
  if (start) params.push(start);
  let gradeFilter = '';
  if (grade) {
    gradeFilter = 'AND p.grade = ?';
    params.push(grade);
  }
  params.push(limit);
  const chinese = program === 'chinese';
  const ledgerFilter = chinese ? 'AND '+chineseDiamondSource('dl') : '';
  const programFilter = chinese ? `AND COALESCE(p.account_kind,'student')='student' AND (
    EXISTS(SELECT 1 FROM diamond_ledger cl WHERE cl.profile_id=p.id AND ${chineseDiamondSource('cl')})
    OR EXISTS(SELECT 1 FROM course_enrollments ce JOIN courses c ON c.id=ce.course_id
      WHERE ce.student_id=p.id AND c.kind='chinese' AND ce.revoked_at IS NULL
        AND ce.starts_at<=CURRENT_TIMESTAMP(3) AND (ce.expires_at IS NULL OR ce.expires_at>CURRENT_TIMESTAMP(3)))
  )` : '';

  const rows = await query(
    `SELECT p.id, p.display_name, p.avatar_key, p.grade,
            COALESCE(SUM(CASE WHEN dl.amount>0 THEN dl.amount ELSE 0 END), 0) AS diamonds
     FROM profiles p
     LEFT JOIN diamond_ledger dl ON dl.profile_id = p.id ${dateFilter} ${ledgerFilter}
     WHERE p.role = 'student' AND p.deleted_at IS NULL
       AND (p.banned_until IS NULL OR p.banned_until <= CURRENT_TIMESTAMP)
       ${gradeFilter} ${programFilter}
     GROUP BY p.id, p.display_name, p.avatar_key, p.grade
     ORDER BY diamonds DESC, p.display_name ASC, p.id ASC
     LIMIT ?`,
    params,
  );

  return rows.map((row, index) => ({
    rank: index + 1,
    profileId: row.id,
    displayName: row.display_name,
    avatarKey: row.avatar_key,
    grade: row.grade === null ? null : Number(row.grade),
    diamonds: Number(row.diamonds),
  }));
}
