import { randomUUID } from 'node:crypto';
import { query } from '../config/db.js';
import { AppError } from '../utils/errors.js';
import { sha256Hex } from '../utils/hash.js';
import { addSeconds } from '../utils/time.js';
import { emitToUser, emitToUsers } from '../realtime/emit.js';
import { buildChallengeQuestionIds, getTopicWithSubject } from './question-service.js';
import { ROBOT_ID, ROBOT_LEVELS } from './challenge-robot.js';
import {
  COUNTDOWN_SECONDS,
  INVITE_TTL_SECONDS,
  assertNotBusy,
  assertParticipant,
  cleanupExpiredInvitations,
  loadChallenge,
  profileByUsername,
} from './challenge-store.js';
import { finalizeChallenge } from './challenge-play.js';
import { buildState } from './challenge-state.js';

export async function createInvitation(challenger, { opponentUsername, topicId, durationSeconds, grade }) {
  await cleanupExpiredInvitations();
  if (opponentUsername === challenger.username) {
    throw new AppError(400, 'SELF_CHALLENGE', 'Con không thể thách đấu chính mình');
  }
  const topic = await getTopicWithSubject(topicId);
  if (grade && Number(grade) !== Number(topic.grade)) {
    throw new AppError(400, 'GRADE_MISMATCH', 'Lớp không khớp với chủ đề đã chọn');
  }
  const opponent = await profileByUsername(opponentUsername);
  if (!opponent) throw new AppError(404, 'OPPONENT_NOT_FOUND', 'Không tìm thấy bạn có tên đăng nhập này');
  if (opponent.banned_until && new Date(opponent.banned_until) > new Date()) {
    throw new AppError(409, 'OPPONENT_LOCKED', 'Tài khoản của bạn này đang bị khoá');
  }

  await assertNotBusy(challenger.id);
  await assertNotBusy(opponent.id);

  const id = randomUUID();
  const seed = sha256Hex(`${id}|challenge`);
  const questionIds = await buildChallengeQuestionIds(topic, seed);
  const expiresAt = addSeconds(new Date(), INVITE_TTL_SECONDS);

  await query(
    `INSERT INTO challenges
     (id, challenger_id, opponent_id, subject_id, grade, topic_id, duration_seconds,
      status, seed, question_ids, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)`,
    [
      id, challenger.id, opponent.id, topic.subject_id, topic.grade, topic.id,
      durationSeconds, seed, JSON.stringify(questionIds), expiresAt,
    ],
  );

  emitToUser(opponent.id, 'challenge:invite', { challengeId: id });
  emitToUser(challenger.id, 'challenge:updated', { challengeId: id });
  return buildState(challenger.id, id);
}

export async function createRobotChallenge(student, { topicId, durationSeconds, botLevel }) {
  await cleanupExpiredInvitations();
  await assertNotBusy(student.id);
  if (!ROBOT_LEVELS[botLevel]) throw new AppError(400, 'BOT_LEVEL_INVALID', 'Mức độ Robot không hợp lệ');

  const topic = await getTopicWithSubject(topicId);
  const id = randomUUID();
  const seed = sha256Hex(`${id}|challenge`);
  const questionIds = await buildChallengeQuestionIds(topic, seed);
  const now = new Date();
  const endsAt = addSeconds(now, durationSeconds);

  await query(
    `INSERT INTO challenges
     (id, challenger_id, opponent_id, subject_id, grade, topic_id, duration_seconds, bot_level,
      status, seed, question_ids, accepted_at, started_at, ends_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'in_progress', ?, ?, ?, ?, ?)`,
    [
      id, student.id, ROBOT_ID, topic.subject_id, topic.grade, topic.id,
      durationSeconds, botLevel, seed, JSON.stringify(questionIds), now, now, endsAt,
    ],
  );
  emitToUser(student.id, 'challenge:updated', { challengeId: id });
  return buildState(student.id, id);
}

export async function acceptChallenge(profileId, challengeId) {
  await cleanupExpiredInvitations();
  const challenge = await loadChallenge(challengeId);
  if (challenge.opponent_id !== profileId) {
    throw new AppError(403, 'NOT_INVITED', 'Con không phải người được mời');
  }
  if (challenge.status !== 'pending') {
    throw new AppError(409, 'INVITE_CLOSED', 'Lời mời này không còn hiệu lực');
  }
  await assertNotBusy(challenge.challenger_id, challengeId);
  await assertNotBusy(profileId, challengeId);

  const now = new Date();
  const startedAt = addSeconds(now, COUNTDOWN_SECONDS);
  const endsAt = addSeconds(startedAt, Number(challenge.duration_seconds));
  await query(
    `UPDATE challenges SET status = 'accepted', accepted_at = ?, started_at = ?, ends_at = ?
     WHERE id = ? AND status = 'pending'`,
    [now, startedAt, endsAt, challengeId],
  );
  emitToUsers([challenge.challenger_id, challenge.opponent_id], 'challenge:updated', { challengeId });
  return buildState(profileId, challengeId);
}

export async function declineChallenge(profileId, challengeId) {
  const challenge = await loadChallenge(challengeId);
  if (challenge.opponent_id !== profileId) {
    throw new AppError(403, 'NOT_INVITED', 'Con không phải người được mời');
  }
  if (challenge.status !== 'pending') return buildState(profileId, challengeId);
  await query(
    `UPDATE challenges SET status = 'cancelled', cancelled_reason = 'declined', finished_at = UTC_TIMESTAMP(3)
     WHERE id = ? AND status = 'pending'`,
    [challengeId],
  );
  emitToUsers([challenge.challenger_id, challenge.opponent_id], 'challenge:updated', { challengeId });
  return buildState(profileId, challengeId);
}

export async function forfeitChallenge(profileId, challengeId) {
  const challenge = await loadChallenge(challengeId);
  assertParticipant(challenge, profileId);
  if (challenge.status === 'pending' || challenge.status === 'accepted') {
    await query(
      `UPDATE challenges SET status = 'cancelled', cancelled_reason = 'forfeit', finished_at = UTC_TIMESTAMP(3)
       WHERE id = ? AND status IN ('pending', 'accepted')`,
      [challengeId],
    );
    emitToUsers([challenge.challenger_id, challenge.opponent_id], 'challenge:updated', { challengeId });
    return buildState(profileId, challengeId);
  }
  if (challenge.status === 'in_progress') {
    await finalizeChallenge(challengeId, { force: true, forfeiterId: profileId });
  }
  return buildState(profileId, challengeId);
}
