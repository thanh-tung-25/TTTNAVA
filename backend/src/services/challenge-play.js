import { query, withTransaction } from '../config/db.js';
import { AppError } from '../utils/errors.js';
import { addSeconds } from '../utils/time.js';
import { emitToUsers } from '../realtime/emit.js';
import { insertLedger } from './ledger-service.js';
import { insertDueRobotAnswers, ROBOT_ID } from './challenge-robot.js';
import { FINALIZE_GRACE_SECONDS, loadChallenge } from './challenge-store.js';

async function pointsFor(challengeId) {
  const rows = await query(
    `SELECT profile_id, COUNT(*) AS answered, COALESCE(SUM(is_correct), 0) AS correct
     FROM challenge_answers WHERE challenge_id = ? GROUP BY profile_id`,
    [challengeId],
  );
  return new Map(rows.map((row) => [row.profile_id, {
    answered: Number(row.answered),
    correct: Number(row.correct),
    wrong: Number(row.answered) - Number(row.correct),
  }]));
}

export async function finalizeChallenge(challengeId, { force = false, forfeiterId = null } = {}) {
  let challenge = await loadChallenge(challengeId);
  if (!['accepted', 'in_progress'].includes(challenge.status)) {
    return { finalized: false, status: challenge.status };
  }

  if (challenge.bot_level) {
    await insertDueRobotAnswers(challenge, new Date());
    challenge = await loadChallenge(challengeId);
  }

  const outcome = await withTransaction(async (connection) => {
    const [rows] = await connection.query('SELECT * FROM challenges WHERE id = ? FOR UPDATE', [challengeId]);
    const locked = rows[0];
    if (!locked) throw new AppError(404, 'CHALLENGE_NOT_FOUND', 'Trận thách đấu không tồn tại');
    if (!['accepted', 'in_progress'].includes(locked.status)) {
      return { finalized: false, status: locked.status };
    }

    const now = new Date();
    if (locked.status === 'accepted' && now < new Date(locked.started_at)) {
      return { finalized: false, status: 'accepted' };
    }
    if (!force && now < addSeconds(new Date(locked.ends_at), FINALIZE_GRACE_SECONDS)) {
      return { finalized: false, status: locked.status };
    }

    const points = await pointsFor(challengeId);
    const participantIds = [locked.challenger_id, locked.opponent_id];
    const a = points.get(locked.challenger_id) ?? { answered: 0, correct: 0, wrong: 0 };
    const b = points.get(locked.opponent_id) ?? { answered: 0, correct: 0, wrong: 0 };

    let winnerId = null;
    let tie = false;
    if (forfeiterId) {
      winnerId = participantIds.find((id) => id !== forfeiterId) ?? null;
    } else if (a.correct !== b.correct) {
      winnerId = a.correct > b.correct ? locked.challenger_id : locked.opponent_id;
    } else if (a.wrong !== b.wrong) {
      winnerId = a.wrong < b.wrong ? locked.challenger_id : locked.opponent_id;
    } else {
      tie = true;
    }

    const rewardDetail = {};
    for (const profileId of participantIds) {
      const score = points.get(profileId) ?? { answered: 0, correct: 0, wrong: 0 };
      let amount = 0;
      let reason = null;
      if (profileId !== ROBOT_ID && score.answered > 0 && profileId !== forfeiterId) {
        if (tie) {
          amount = 1;
          reason = 'challenge_draw';
        } else if (winnerId === profileId) {
          amount = 3;
          reason = 'challenge_win';
        } else {
          amount = 1;
          reason = 'challenge_loss';
        }
      }
      rewardDetail[profileId] = { ...score, amount, reason };
    }

    const resultJson = {
      winnerId,
      tie,
      forfeiterId,
      players: rewardDetail,
      finalizedAt: now.toISOString(),
    };

    await connection.query(
      `UPDATE challenges SET status = 'finished', finished_at = UTC_TIMESTAMP(3),
         winner_id = ?, result_json = ? WHERE id = ?`,
      [winnerId, JSON.stringify(resultJson), challengeId],
    );
    await connection.query(
      'INSERT IGNORE INTO challenge_rewards (challenge_id, detail_json) VALUES (?, ?)',
      [challengeId, JSON.stringify(rewardDetail)],
    );

    for (const [profileId, detail] of Object.entries(rewardDetail)) {
      if (!detail.amount) continue;
      await insertLedger(connection, {
        profileId,
        amount: detail.amount,
        reason: detail.reason,
        refType: 'challenge',
        refId: challengeId,
      });
    }

    return { finalized: true, winnerId, tie, result: rewardDetail, status: 'finished' };
  });

  if (outcome.finalized) {
    emitToUsers([challenge.challenger_id, challenge.opponent_id], 'challenge:finished', { challengeId });
  }
  return outcome;
}
