import { query, closePool } from '../src/config/db.js';

const BASE = process.env.SMOKE_BASE ?? 'http://localhost:3000';
const results = [];

function ok(name, detail = '') {
  results.push({ name, pass: true, detail });
  console.log(`PASS  ${name}${detail ? ` :: ${detail}` : ''}`);
}

function fail(name, detail = '') {
  results.push({ name, pass: false, detail });
  console.log(`FAIL  ${name}${detail ? ` :: ${detail}` : ''}`);
}

function assert(condition, name, detail = '') {
  if (condition) ok(name, detail);
  else fail(name, detail);
}

async function login(username, password) {
  const response = await fetch(`${BASE}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const body = await response.json().catch(() => null);
  if (response.status !== 200) throw new Error(`login ${username} failed ${response.status} ${JSON.stringify(body)}`);
  const cookie = response.headers.getSetCookie().map((value) => value.split(';')[0]).join('; ');
  return { cookie, profile: body.data.profile };
}

async function api(cookie, method, path, payload) {
  const response = await fetch(`${BASE}/api/v1${path}`, {
    method,
    headers: {
      'content-type': 'application/json',
      cookie,
    },
    body: payload === undefined ? undefined : JSON.stringify(payload),
  });
  const body = await response.json().catch(() => null);
  return { status: response.status, body, data: body?.data, error: body?.error };
}

async function loadQuestion(questionId) {
  const rows = await query(
    `SELECT q.id, q.type, q.prompt, a.answer_json
     FROM questions q JOIN question_answers a ON a.question_id = q.id
     WHERE q.id = ? LIMIT 1`,
    [questionId],
  );
  if (!rows[0]) throw new Error(`question ${questionId} missing`);
  return { ...rows[0], answer: JSON.parse(rows[0].answer_json) };
}

function correctAnswer(question) {
  const answer = question.answer;
  if (question.type === 'single_choice') return { key: answer.key };
  if (question.type === 'multiple_choice') return { keys: answer.keys };
  if (question.type === 'true_false') return { value: Boolean(answer.value) };
  return { value: (answer.accepted ?? [])[0] };
}

function wrongAnswer(question, options = []) {
  if (question.type === 'single_choice') {
    const correctKey = question.answer.key;
    const other = options.find((option) => option.key !== correctKey);
    return { key: other?.key ?? (correctKey === 'A' ? 'B' : 'A') };
  }
  if (question.type === 'multiple_choice') {
    const correct = new Set(question.answer.keys ?? []);
    const other = options.filter((option) => !correct.has(option.key)).map((option) => option.key);
    if (other.length > 0) return { keys: [other[0]] };
    return { keys: [options[0]?.key ?? 'A', options[1]?.key ?? 'B'] };
  }
  if (question.type === 'true_false') return { value: !Boolean(question.answer.value) };
  return { value: 'cau-tra-loi-sai-xyz' };
}

async function answerOnce(client, challengeId, wantCorrect) {
  const state = await api(client.cookie, 'GET', `/challenges/${challengeId}`);
  if (state.status !== 200) throw new Error(`state ${state.status} ${JSON.stringify(state.body)}`);
  const { myQuestion, myIndex } = state.data;
  if (!myQuestion) throw new Error(`no question at index ${myIndex} status=${state.data.status}`);
  const question = await loadQuestion(myQuestion.id);
  const answer = wantCorrect
    ? correctAnswer(question)
    : wrongAnswer(question, myQuestion.options);
  const response = await api(client.cookie, 'POST', `/challenges/${challengeId}/answers`, {
    index: myIndex,
    questionId: myQuestion.id,
    answer,
  });
  if (response.status !== 200) throw new Error(`answer ${response.status} ${JSON.stringify(response.body)}`);
  return { question, feedback: response.data.feedback, state: response.data.state };
}

async function forceStartedPast(challengeId) {
  await query(
    `UPDATE challenges SET started_at = DATE_SUB(UTC_TIMESTAMP(3), INTERVAL 2 SECOND),
       ends_at = DATE_ADD(UTC_TIMESTAMP(3), INTERVAL 300 SECOND) WHERE id = ?`,
    [challengeId],
  );
}

async function forceEnded(challengeId) {
  await query('UPDATE challenges SET ends_at = DATE_SUB(UTC_TIMESTAMP(3), INTERVAL 2 SECOND) WHERE id = ?', [challengeId]);
}

async function ledgerRows(profileId, challengeId) {
  return query(
    `SELECT amount, reason FROM diamond_ledger
     WHERE profile_id = ? AND ref_type = 'challenge' AND ref_id = ? ORDER BY id ASC`,
    [profileId, challengeId],
  );
}

async function main() {
  const lan = await login('be_lan', 'BeLan@123');
  const minh = await login('be_minh', 'BeMinh@123');
  const lanId = lan.profile.id;
  const minhId = minh.profile.id;
  const robotRows = await query("SELECT id FROM profiles WHERE username = 'robot_thach_dau' LIMIT 1");
  const robotId = robotRows[0].id;

  const topicRows = await query(
    `SELECT t.id FROM topics t JOIN subjects s ON s.id = t.subject_id
     WHERE t.grade = 3 AND s.slug = 'toan' ORDER BY t.id LIMIT 1`,
  );
  const topicId = topicRows[0].id;

  // Dọn dữ liệu thách đấu cũ của hai tài khoản test
  const old = await query(
    `SELECT id FROM challenges WHERE challenger_id IN (?, ?, ?) OR opponent_id IN (?, ?, ?)`,
    [lanId, minhId, robotId, lanId, minhId, robotId],
  );
  const oldIds = old.map((row) => row.id);
  if (oldIds.length) {
    const placeholders = oldIds.map(() => '?').join(',');
    await query(`DELETE FROM challenge_answers WHERE challenge_id IN (${placeholders})`, oldIds);
    await query(`DELETE FROM challenge_rewards WHERE challenge_id IN (${placeholders})`, oldIds);
    await query(
      `DELETE FROM diamond_ledger WHERE ref_type = 'challenge' AND ref_id IN (${placeholders})`,
      oldIds,
    );
    await query(`DELETE FROM challenges WHERE id IN (${placeholders})`, oldIds);
    ok('cleanup_previous_challenges', `removed ${oldIds.length}`);
  }

  // 1. Robot: trả lời 3 câu đúng, kết thúc, thắng +3, thưởng một lần
  const robot = await api(lan.cookie, 'POST', '/challenges/robot', { topicId, durationSeconds: 300, botLevel: 'hard' });
  assert(robot.status === 201 && robot.data?.status === 'in_progress', 'robot_create_201_in_progress', `status=${robot.status}`);
  const robotIdChallenge = robot.data.id;
  assert(robot.data.myQuestion !== null && robot.data.opponent.isBot === true, 'robot_state_has_question_and_bot');

  let robotCorrect = 0;
  for (let i = 0; i < 3; i += 1) {
    const answered = await answerOnce(lan, robotIdChallenge, true);
    if (answered.feedback.isCorrect) robotCorrect += 1;
    assert(answered.feedback.isCorrect, `robot_answer_${i + 1}_correct`, `type=${answered.question.type}`);
  }
  assert(robotCorrect === 3, 'robot_three_correct', `correct=${robotCorrect}`);

  await forceEnded(robotIdChallenge);
  const robotState = await api(lan.cookie, 'GET', `/challenges/${robotIdChallenge}`);
  assert(robotState.status === 200 && robotState.data.status === 'finished', 'robot_finalized', `status=${robotState.data.status}`);
  assert(robotState.data.winnerId === lanId, 'robot_player_win', `winner=${robotState.data.winnerId}`);
  assert(robotState.data.result?.me?.amount === 3, 'robot_reward_3', `amount=${robotState.data.result?.me?.amount}`);
  assert(robotState.data.result?.opponent?.amount === 0, 'robot_bot_no_reward', `amount=${robotState.data.result?.opponent?.amount}`);

  const robotLedger = await ledgerRows(lanId, robotIdChallenge);
  assert(robotLedger.length === 1 && Number(robotLedger[0].amount) === 3, 'robot_ledger_once_plus3',
    JSON.stringify(robotLedger));

  const robotAgain = await api(lan.cookie, 'GET', `/challenges/${robotIdChallenge}`);
  const robotLedgerAgain = await ledgerRows(lanId, robotIdChallenge);
  assert(robotAgain.data.status === 'finished' && robotLedgerAgain.length === 1, 'robot_finalize_idempotent',
    `status=${robotAgain.data.status} ledgerRows=${robotLedgerAgain.length}`);

  const lobbyAfterRobot = await api(lan.cookie, 'GET', '/challenges/lobby');
  assert(lobbyAfterRobot.data.busy === false, 'robot_lobby_not_busy');

  // 2. Lời mời 1-1: gửi, nhận, chấp nhận, countdown -> in_progress
  const invite = await api(lan.cookie, 'POST', '/challenges/invites', {
    opponentUsername: 'be_minh',
    topicId,
    durationSeconds: 300,
    grade: 3,
  });
  assert(invite.status === 201 && invite.data?.status === 'pending', 'invite_created_pending', `status=${invite.status}`);
  const matchId = invite.data.id;
  assert(invite.data.expiresAt !== null, 'invite_has_expiry');

  const minhLobby = await api(minh.cookie, 'GET', '/challenges/lobby');
  assert(minhLobby.data.incoming.some((row) => row.id === matchId), 'invite_visible_to_opponent');

  const accept = await api(minh.cookie, 'POST', `/challenges/${matchId}/accept`);
  assert(accept.status === 200 && accept.data.status === 'accepted', 'invite_accepted', `status=${accept.data.status}`);
  assert(accept.data.countdownSeconds >= 0 && accept.data.countdownSeconds <= 5, 'countdown_max_5',
    `countdown=${accept.data.countdownSeconds}`);

  await forceStartedPast(matchId);
  const lanStart = await api(lan.cookie, 'GET', `/challenges/${matchId}`);
  assert(lanStart.data.status === 'in_progress' && lanStart.data.canAnswer === true, 'match_became_in_progress');

  // lan: 2 đúng + 1 sai; minh: 2 đúng -> bằng đúng, minh ít sai hơn => minh thắng
  for (let i = 0; i < 3; i += 1) {
    const answered = await answerOnce(lan, matchId, i < 2);
    assert(answered.feedback.isCorrect === (i < 2), `match_lan_answer_${i + 1}`, `correct=${answered.feedback.isCorrect}`);
  }
  for (let i = 0; i < 2; i += 1) {
    const answered = await answerOnce(minh, matchId, true);
    assert(answered.feedback.isCorrect === true, `match_minh_answer_${i + 1}_correct`);
  }

  await forceEnded(matchId);
  const finished = await api(minh.cookie, 'GET', `/challenges/${matchId}`);
  assert(finished.data.status === 'finished', 'match_finalized', `status=${finished.data.status}`);
  assert(finished.data.result?.tie === false, 'match_not_tie');
  assert(finished.data.winnerId === minhId, 'tiebreak_fewer_wrong_wins', `winner=${finished.data.winnerId}`);

  const lanMatch = await api(lan.cookie, 'GET', `/challenges/${matchId}`);
  assert(lanMatch.data.result?.me?.amount === 1, 'loser_reward_1', `amount=${lanMatch.data.result?.me?.amount}`);
  assert(lanMatch.data.result?.opponent?.amount === 3, 'winner_reward_3', `amount=${lanMatch.data.result?.opponent?.amount}`);
  assert(lanMatch.data.result?.me?.correct === 2 && lanMatch.data.result?.me?.wrong === 1, 'scores_reported');

  const [lanLedger, minhLedger] = await Promise.all([
    ledgerRows(lanId, matchId),
    ledgerRows(minhId, matchId),
  ]);
  assert(lanLedger.length === 1 && Number(lanLedger[0].amount) === 1, 'ledger_loser_once_plus1', JSON.stringify(lanLedger));
  assert(minhLedger.length === 1 && Number(minhLedger[0].amount) === 3, 'ledger_winner_once_plus3', JSON.stringify(minhLedger));

  const replay = await api(lan.cookie, 'GET', `/challenges/${matchId}`);
  const [lanLedger2, minhLedger2] = await Promise.all([
    ledgerRows(lanId, matchId),
    ledgerRows(minhId, matchId),
  ]);
  assert(replay.data.status === 'finished' && lanLedger2.length === 1 && minhLedger2.length === 1,
    'match_finalize_idempotent', `lan=${lanLedger2.length} minh=${minhLedger2.length}`);

  // 3. Bỏ cuộc: người bỏ cuộc 0 kim cương, người còn lại +3 khi đã trả lời
  const forfeitInvite = await api(lan.cookie, 'POST', '/challenges/invites', {
    opponentUsername: 'be_minh',
    topicId,
    durationSeconds: 300,
  });
  const forfeitId = forfeitInvite.data.id;
  await api(minh.cookie, 'POST', `/challenges/${forfeitId}/accept`);
  await forceStartedPast(forfeitId);
  await answerOnce(minh, forfeitId, true);
  await answerOnce(lan, forfeitId, false);
  const forfeitResponse = await api(lan.cookie, 'POST', `/challenges/${forfeitId}/forfeit`);
  assert(forfeitResponse.status === 200 && forfeitResponse.data.status === 'finished', 'forfeit_finalized',
    `status=${forfeitResponse.data.status}`);
  assert(forfeitResponse.data.winnerId === minhId, 'forfeit_opponent_win', `winner=${forfeitResponse.data.winnerId}`);
  assert(forfeitResponse.data.result?.me?.amount === 0, 'forfeiter_no_reward',
    `amount=${forfeitResponse.data.result?.me?.amount}`);
  assert(forfeitResponse.data.result?.opponent?.amount === 3, 'forfeit_opponent_gets_3',
    `amount=${forfeitResponse.data.result?.opponent?.amount}`);
  const forfeitLedger = await ledgerRows(lanId, forfeitId);
  assert(forfeitLedger.length === 0, 'forfeiter_no_ledger', JSON.stringify(forfeitLedger));

  // 4. Lời mời hết hạn sau 30 giây
  const expireInvite = await api(lan.cookie, 'POST', '/challenges/invites', {
    opponentUsername: 'be_minh',
    topicId,
    durationSeconds: 300,
  });
  const expireId = expireInvite.data.id;
  const createdAt = new Date(expireInvite.data.createdAt).getTime();
  const expiresAt = new Date(expireInvite.data.expiresAt).getTime();
  assert(Math.round((expiresAt - createdAt) / 1000) === 30, 'invite_ttl_30s',
    `ttl=${Math.round((expiresAt - createdAt) / 1000)}`);
  await query('UPDATE challenges SET expires_at = DATE_SUB(UTC_TIMESTAMP(3), INTERVAL 2 SECOND) WHERE id = ?', [expireId]);
  const expiredState = await api(lan.cookie, 'GET', `/challenges/${expireId}`);
  assert(expiredState.data.status === 'expired', 'invite_expired', `status=${expiredState.data.status}`);
  assert(expiredState.data.cancelledReason === 'expired', 'invite_expired_reason');
  const minhLobbyAfter = await api(minh.cookie, 'GET', '/challenges/lobby');
  assert(!minhLobbyAfter.data.incoming.some((row) => row.id === expireId), 'expired_invite_hidden');

  // 5. Không thể tự thách đấu, không thể nhận lời mời của người khác
  const self = await api(lan.cookie, 'POST', '/challenges/invites', {
    opponentUsername: 'be_lan', topicId, durationSeconds: 300,
  });
  assert(self.status === 400 && self.error?.code === 'SELF_CHALLENGE', 'self_challenge_rejected',
    `status=${self.status}`);

  const outsiderInvite = await api(lan.cookie, 'POST', '/challenges/invites', {
    opponentUsername: 'be_minh', topicId, durationSeconds: 300,
  });
  const outsiderId = outsiderInvite.data.id;
  const wrongAccept = await api(lan.cookie, 'POST', `/challenges/${outsiderId}/accept`);
  assert(wrongAccept.status === 403 && wrongAccept.error?.code === 'NOT_INVITED', 'outsider_accept_rejected',
    `status=${wrongAccept.status}`);
  await api(minh.cookie, 'POST', `/challenges/${outsiderId}/decline`);
  const declined = await api(lan.cookie, 'GET', `/challenges/${outsiderId}`);
  assert(declined.data.status === 'cancelled' && declined.data.cancelledReason === 'declined', 'decline_cancelled');

  const failed = results.filter((row) => !row.pass);
  console.log(`\nSUMMARY ${results.length - failed.length}/${results.length} passed`);
  if (failed.length) {
    console.log(failed.map((row) => ` - ${row.name} ${row.detail}`).join('\n'));
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error('SMOKE ERROR', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closePool();
  });
