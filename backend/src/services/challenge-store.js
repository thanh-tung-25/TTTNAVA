import { query } from '../config/db.js';
import { AppError } from '../utils/errors.js';
import { parseJson } from '../utils/normalize.js';
import { toIso } from '../utils/time.js';

export const INVITE_TTL_SECONDS = 30;
export const COUNTDOWN_SECONDS = 5;
export const FINALIZE_GRACE_SECONDS = 1;

export function challengeRowsQuery(where, params) {
  return query(
    `SELECT c.*,
            cp.display_name AS challenger_name, cp.avatar_key AS challenger_avatar, cp.grade AS challenger_grade,
            op.display_name AS opponent_name, op.avatar_key AS opponent_avatar, op.grade AS opponent_grade,
            op.role AS opponent_role,
            t.name AS topic_name, t.subject_id, s.name AS subject_name, s.color AS subject_color
     FROM challenges c
     JOIN profiles cp ON cp.id = c.challenger_id
     JOIN profiles op ON op.id = c.opponent_id
     JOIN topics t ON t.id = c.topic_id
     JOIN subjects s ON s.id = t.subject_id
     WHERE ${where}`,
    params,
  );
}

export async function loadChallenge(challengeId) {
  const rows = await challengeRowsQuery('c.id = ? LIMIT 1', [challengeId]);
  if (!rows[0]) throw new AppError(404, 'CHALLENGE_NOT_FOUND', 'Trận thách đấu không tồn tại');
  return rows[0];
}

export function isParticipant(challenge, profileId) {
  return challenge.challenger_id === profileId || challenge.opponent_id === profileId;
}

export function assertParticipant(challenge, profileId) {
  if (!isParticipant(challenge, profileId)) {
    throw new AppError(403, 'NOT_IN_CHALLENGE', 'Con không thuộc trận thách đấu này');
  }
}

export async function cleanupExpiredInvitations() {
  await query(
    `UPDATE challenges SET status = 'expired', cancelled_reason = 'expired'
     WHERE status = 'pending' AND expires_at <= UTC_TIMESTAMP(3)`,
  );
}

export async function findOpenChallenge(profileId) {
  const rows = await query(
    `SELECT id, status FROM challenges
     WHERE (challenger_id = ? OR opponent_id = ?)
       AND (
         (status = 'pending' AND expires_at > UTC_TIMESTAMP(3))
         OR (status IN ('accepted', 'in_progress')
             AND started_at + INTERVAL duration_seconds SECOND + INTERVAL 60 SECOND > UTC_TIMESTAMP(3))
       )
     LIMIT 1`,
    [profileId, profileId],
  );
  return rows[0] ?? null;
}

export function summary(row) {
  return {
    id: row.id,
    status: row.status,
    subjectId: row.subject_id,
    grade: Number(row.grade),
    topicId: row.topic_id,
    topicName: row.topic_name,
    subjectName: row.subject_name,
    subjectColor: row.subject_color,
    durationSeconds: Number(row.duration_seconds),
    botLevel: row.bot_level,
    challenger: {
      id: row.challenger_id,
      displayName: row.challenger_name,
      avatarKey: row.challenger_avatar,
      grade: row.challenger_grade === null ? null : Number(row.challenger_grade),
    },
    opponent: {
      id: row.opponent_id,
      displayName: row.opponent_name,
      avatarKey: row.opponent_avatar,
      grade: row.opponent_grade === null ? null : Number(row.opponent_grade),
      isBot: row.opponent_role === 'bot',
    },
    createdAt: toIso(row.created_at),
    expiresAt: toIso(row.expires_at),
    startedAt: toIso(row.started_at),
    endsAt: toIso(row.ends_at),
    winnerId: row.winner_id,
    cancelledReason: row.cancelled_reason,
    result: parseJson(row.result_json),
  };
}

export async function profileByUsername(username) {
  const rows = await query(
    'SELECT * FROM profiles WHERE username = ? AND role = \'student\' LIMIT 1',
    [username],
  );
  return rows[0] ?? null;
}

export async function assertNotBusy(profileId, exceptId = null) {
  const open = await findOpenChallenge(profileId);
  if (open && open.id !== exceptId) {
    throw new AppError(409, 'ALREADY_IN_CHALLENGE', 'Con đang có một lời mời hoặc trận đấu chưa kết thúc');
  }
}

export async function markStarted(challengeId) {
  await query(
    "UPDATE challenges SET status = 'in_progress' WHERE id = ? AND status = 'accepted' AND started_at <= UTC_TIMESTAMP(3)",
    [challengeId],
  );
}
