import { beforeAll, describe, expect, test } from 'vitest';
import { query } from '../src/config/db.js';
import {
  answerChallengeOnce,
  createTestUser,
  forceChallengeEnded,
  forceChallengeStarted,
  ledgerFor,
  loginStudent,
  topicWithEnoughQuestions,
} from './helpers/index.js';

describe('Thách đấu', () => {
  let lan;
  let minh;
  let lanAgent;
  let minhAgent;
  let topicId;
  let robotId;
  beforeAll(async () => {
    lan = await createTestUser({ username: 'test_challenge_lan', displayName: 'Bé Lan Test' });
    minh = await createTestUser({ username: 'test_challenge_minh', displayName: 'Bé Minh Test' });
    lanAgent = await loginStudent(lan);
    minhAgent = await loginStudent(minh);
    topicId = await topicWithEnoughQuestions();
    const robot = await query("SELECT id FROM profiles WHERE username = 'robot_thach_dau' LIMIT 1");
    robotId = robot[0].id;
  });

  async function createInvite(agent, opponentUsername = minh.username) {
    return agent.post('/api/v1/challenges/invites').send({
      opponentUsername,
      topicId,
      durationSeconds: 300,
    });
  }
  test('test_challenge_robot_win_rewards_three_once_and_bot_gets_nothing', async () => {
    const created = await lanAgent
      .post('/api/v1/challenges/robot')
      .send({ topicId, durationSeconds: 300, botLevel: 'hard' });
    expect(created.status).toBe(201);
    expect(created.body.data.status).toBe('in_progress');
    expect(created.body.data.opponent.isBot).toBe(true);
    expect(created.body.data.opponent.displayName).toBe('Robot Thách Đấu');
    expect(created.body.data.myQuestion).toBeTruthy();

    for (let index = 0; index < 5; index += 1) {
      const { response } = await answerChallengeOnce(lanAgent, created.body.data.id, { correct: true });
      expect(response.status).toBe(200);
      expect(response.body.data.feedback.isCorrect).toBe(true);
    }

    await forceChallengeEnded(created.body.data.id);
    const finished = await lanAgent.get(`/api/v1/challenges/${created.body.data.id}`);
    expect(finished.status).toBe(200);
    expect(finished.body.data.status).toBe('finished');
    expect(finished.body.data.winnerId).toBe(lan.id);
    expect(finished.body.data.result.me.amount).toBe(3);
    expect(finished.body.data.result.opponent.amount).toBe(0);

    const [playerLedger, botLedger] = await Promise.all([
      ledgerFor(lan.id, created.body.data.id),
      ledgerFor(robotId, created.body.data.id),
    ]);
    expect(playerLedger).toEqual([{ amount: 3, reason: 'challenge_win' }]);
    expect(botLedger).toHaveLength(0);

    const again = await lanAgent.get(`/api/v1/challenges/${created.body.data.id}`);
    const secondLedger = await ledgerFor(lan.id, created.body.data.id);
    expect(again.body.data.status).toBe('finished');
    expect(secondLedger).toHaveLength(1);
  });

  test('test_challenge_invite_accept_countdown_and_tiebreak_rewards', async () => {
    const created = await createInvite(lanAgent);
    expect(created.status).toBe(201);
    expect(created.body.data.status).toBe('pending');
    const matchId = created.body.data.id;

    const lobby = await minhAgent.get('/api/v1/challenges/lobby');
    expect(lobby.body.data.incoming.some((row) => row.id === matchId)).toBe(true);

    const accepted = await minhAgent.post(`/api/v1/challenges/${matchId}/accept`);
    expect(accepted.status).toBe(200);
    expect(accepted.body.data.status).toBe('accepted');
    expect(accepted.body.data.countdownSeconds).toBeGreaterThanOrEqual(0);
    expect(accepted.body.data.countdownSeconds).toBeLessThanOrEqual(5);

    await forceChallengeStarted(matchId);
    const started = await lanAgent.get(`/api/v1/challenges/${matchId}`);
    expect(started.body.data.status).toBe('in_progress');
    expect(started.body.data.canAnswer).toBe(true);

    for (let index = 0; index < 3; index += 1) {
      const { response } = await answerChallengeOnce(lanAgent, matchId, { correct: index < 2 });
      expect(response.body.data.feedback.isCorrect).toBe(index < 2);
    }
    for (let index = 0; index < 2; index += 1) {
      const { response } = await answerChallengeOnce(minhAgent, matchId, { correct: true });
      expect(response.body.data.feedback.isCorrect).toBe(true);
    }

    await forceChallengeEnded(matchId);
    const finished = await minhAgent.get(`/api/v1/challenges/${matchId}`);
    expect(finished.body.data.status).toBe('finished');
    expect(finished.body.data.result.tie).toBe(false);
    expect(finished.body.data.winnerId).toBe(minh.id);
    expect(finished.body.data.result.me.amount).toBe(3);
    expect(finished.body.data.result.opponent.amount).toBe(1);
    expect(finished.body.data.result.opponent.correct).toBe(2);
    expect(finished.body.data.result.opponent.wrong).toBe(1);

    const [lanLedger, minhLedger] = await Promise.all([
      ledgerFor(lan.id, matchId),
      ledgerFor(minh.id, matchId),
    ]);
    expect(lanLedger).toEqual([{ amount: 1, reason: 'challenge_loss' }]);
    expect(minhLedger).toEqual([{ amount: 3, reason: 'challenge_win' }]);
  });

  test('test_challenge_no_answer_gets_no_diamond', async () => {
    const created = await createInvite(lanAgent);
    const matchId = created.body.data.id;
    await minhAgent.post(`/api/v1/challenges/${matchId}/accept`);
    await forceChallengeStarted(matchId);
    await forceChallengeEnded(matchId);

    const finished = await lanAgent.get(`/api/v1/challenges/${matchId}`);
    expect(finished.body.data.status).toBe('finished');
    expect(finished.body.data.result.tie).toBe(true);
    expect(finished.body.data.result.me.amount).toBe(0);
    expect(finished.body.data.result.opponent.amount).toBe(0);
    expect(await ledgerFor(lan.id, matchId)).toHaveLength(0);
    expect(await ledgerFor(minh.id, matchId)).toHaveLength(0);
  });

  test('test_challenge_forfeit_no_reward_and_opponent_three', async () => {
    const created = await createInvite(lanAgent);
    const matchId = created.body.data.id;
    await minhAgent.post(`/api/v1/challenges/${matchId}/accept`);
    await forceChallengeStarted(matchId);
    await answerChallengeOnce(minhAgent, matchId, { correct: true });
    await answerChallengeOnce(lanAgent, matchId, { correct: false });

    const forfeited = await lanAgent.post(`/api/v1/challenges/${matchId}/forfeit`);
    expect(forfeited.status).toBe(200);
    expect(forfeited.body.data.status).toBe('finished');
    expect(forfeited.body.data.winnerId).toBe(minh.id);
    expect(forfeited.body.data.result.me.amount).toBe(0);
    expect(forfeited.body.data.result.opponent.amount).toBe(3);
    expect(await ledgerFor(lan.id, matchId)).toHaveLength(0);
    expect(await ledgerFor(minh.id, matchId)).toEqual([{ amount: 3, reason: 'challenge_win' }]);
  });

  test('test_challenge_invite_expires_after_thirty_seconds', async () => {
    const created = await createInvite(lanAgent);
    const matchId = created.body.data.id;
    const ttl = Math.round(
      (new Date(created.body.data.expiresAt).getTime() - new Date(created.body.data.createdAt).getTime()) / 1000,
    );
    expect(ttl).toBe(30);
    await query(
      'UPDATE challenges SET expires_at = DATE_SUB(UTC_TIMESTAMP(3), INTERVAL 2 SECOND) WHERE id = ?',
      [matchId],
    );
    const expired = await lanAgent.get(`/api/v1/challenges/${matchId}`);
    expect(expired.body.data.status).toBe('expired');
    expect(expired.body.data.cancelledReason).toBe('expired');
    const lobby = await minhAgent.get('/api/v1/challenges/lobby');
    expect(lobby.body.data.incoming.some((row) => row.id === matchId)).toBe(false);
  });

  test('test_challenge_self_invite_and_outsider_accept_rejected', async () => {
    const self = await createInvite(lanAgent, lan.username);
    expect(self.status).toBe(400);
    expect(self.body.error.code).toBe('SELF_CHALLENGE');

    const created = await createInvite(lanAgent);
    const outsiderAccept = await lanAgent.post(`/api/v1/challenges/${created.body.data.id}/accept`);
    expect(outsiderAccept.status).toBe(403);
    expect(outsiderAccept.body.error.code).toBe('NOT_INVITED');
    await minhAgent.post(`/api/v1/challenges/${created.body.data.id}/decline`);
    const declined = await lanAgent.get(`/api/v1/challenges/${created.body.data.id}`);
    expect(declined.body.data.status).toBe('cancelled');
    expect(declined.body.data.cancelledReason).toBe('declined');
  });

  test('test_challenge_accept_expired_invite_returns_409', async () => {
    const created = await createInvite(lanAgent);
    const matchId = created.body.data.id;
    await query(
      'UPDATE challenges SET expires_at = DATE_SUB(UTC_TIMESTAMP(3), INTERVAL 2 SECOND) WHERE id = ?',
      [matchId],
    );
    const accepted = await minhAgent.post(`/api/v1/challenges/${matchId}/accept`);
    expect(accepted.status).toBe(409);
    expect(accepted.body.error.code).toBe('INVITE_CLOSED');
  });
});
