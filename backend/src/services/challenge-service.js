import { randomUUID } from 'node:crypto';
import { query, withTransaction } from '../config/db.js';
import { AppError } from '../utils/errors.js';
import { sha256Hex, shuffleQuestionForClient } from '../utils/hash.js';
import { parseJson } from '../utils/normalize.js';
import { isAnswerCorrect, validateClientAnswer } from '../utils/answers.js';
import { addSeconds, secondsUntil, toIso } from '../utils/time.js';
import { emitToUser, emitToUsers } from '../realtime/emit.js';
import { insertLedger } from './ledger-service.js';
import { buildChallengeQuestionIds, getTopicWithSubject } from './question-service.js';
import { insertDueRobotAnswers, ROBOT_ID, ROBOT_LEVELS } from './challenge-robot.js';

const INVITE_TTL_SECONDS = 30;
const COUNTDOWN_SECONDS = 5;
const FINALIZE_GRACE_SECONDS = 1;

function challengeRowsQuery(where, params) {
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

async function loadChallenge(challengeId) {
  const rows = await challengeRowsQuery('c.id = ? LIMIT 1', [challengeId]);
  if (!rows[0]) throw new AppError(404, 'CHALLENGE_NOT_FOUND', 'Trận thách đấu không tồn tại');
  return rows[0];
}

function isParticipant(challenge, profileId) {
  return challenge.challenger_id === profileId || challenge.opponent_id === profileId;
}

function assertParticipant(challenge, profileId) {
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

async function findOpenChallenge(profileId) {
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

function summary(row) {
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

async function profileByUsername(username) {
  const rows = await query(
    'SELECT * FROM profiles WHERE username = ? AND role = \'student\' LIMIT 1',
    [username],
  );
  return rows[0] ?? null;
}

async function assertNotBusy(profileId, exceptId = null) {
  const open = await findOpenChallenge(profileId);
  if (open && open.id !== exceptId) {
    throw new AppError(409, 'ALREADY_IN_CHALLENGE', 'Con đang có một lời mời hoặc trận đấu chưa kết thúc');
  }
}

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

export async function answerChallenge(profileId, challengeId, { index, questionId, answer: rawAnswer }) {
  const challenge = await loadChallenge(challengeId);
  assertParticipant(challenge, profileId);
  if (profileId === challenge.opponent_id && challenge.opponent_role === 'bot') {
    throw new AppError(403, 'BOT_CANNOT_ANSWER', 'Không thể trả lời thay Robot');
  }

  const now = new Date();
  if (challenge.status !== 'in_progress') {
    throw new AppError(409, 'NOT_IN_PROGRESS', 'Trận đấu chưa bắt đầu hoặc đã kết thúc');
  }
  if (now < new Date(challenge.started_at)) {
    throw new AppError(409, 'NOT_STARTED', 'Trận đấu chưa bắt đầu');
  }
  if (now > new Date(challenge.ends_at)) {
    await finalizeChallenge(challengeId, { force: false });
    throw new AppError(409, 'CHALLENGE_TIME_UP', 'Đã hết giờ thi đấu');
  }

  const questionIds = parseJson(challenge.question_ids);
  const result = await withTransaction(async (connection) => {
    const [answers] = await connection.query(
      'SELECT COUNT(*) AS total FROM challenge_answers WHERE challenge_id = ? AND profile_id = ?',
      [challengeId, profileId],
    );
    const expectedIndex = Number(answers[0].total);
    if (Number(index) !== expectedIndex) {
      throw new AppError(409, 'INDEX_MISMATCH', 'Câu hỏi không đúng thứ tự, con tải lại nhé');
    }
    const expectedQuestionId = questionIds[expectedIndex % questionIds.length];
    if (questionId !== expectedQuestionId) {
      throw new AppError(409, 'QUESTION_MISMATCH', 'Câu hỏi không khớp, con tải lại nhé');
    }

    const [rows] = await connection.query(
      `SELECT q.*, a.answer_json, a.explanation
       FROM questions q JOIN question_answers a ON a.question_id = q.id
       WHERE q.id = ? LIMIT 1`,
      [questionId],
    );
    if (!rows[0]) throw new AppError(404, 'QUESTION_NOT_FOUND', 'Câu hỏi không tồn tại');
    const [options] = await connection.query(
      'SELECT opt_key, option_text FROM question_options WHERE question_id = ? ORDER BY sort_order ASC',
      [questionId],
    );
    const question = {
      ...rows[0],
      answer: parseJson(rows[0].answer_json),
      options: options.map((option) => ({ key: option.opt_key, text: option.option_text })),
    };
    const answer = validateClientAnswer(question, rawAnswer);
    const correct = isAnswerCorrect(question, answer);
    await connection.query(
      `INSERT INTO challenge_answers
       (challenge_id, profile_id, q_index, question_id, answer_json, is_correct)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [challengeId, profileId, expectedIndex, questionId, JSON.stringify(answer), correct ? 1 : 0],
    );
    return {
      isCorrect: correct,
      correctAnswer: question.answer,
      explanation: rows[0].explanation,
      answeredCount: expectedIndex + 1,
    };
  });

  emitToUsers([challenge.challenger_id, challenge.opponent_id], 'challenge:updated', { challengeId });
  return { feedback: result, state: await buildState(profileId, challengeId) };
}

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

async function markStarted(challengeId) {
  await query(
    "UPDATE challenges SET status = 'in_progress' WHERE id = ? AND status = 'accepted' AND started_at <= UTC_TIMESTAMP(3)",
    [challengeId],
  );
}

async function markRows(challengeId, profileId) {
  const rows = await query(
    'SELECT q_index, is_correct FROM challenge_answers WHERE challenge_id = ? AND profile_id = ? ORDER BY q_index ASC',
    [challengeId, profileId],
  );
  return {
    marks: rows.map((row) => Boolean(row.is_correct)),
    answered: rows.length,
    correct: rows.filter((row) => Boolean(row.is_correct)).length,
    wrong: rows.filter((row) => !Boolean(row.is_correct)).length,
  };
}

export async function buildState(profileId, challengeId) {
  await cleanupExpiredInvitations();
  let challenge = await loadChallenge(challengeId);
  assertParticipant(challenge, profileId);

  if (challenge.bot_level && challenge.status === 'in_progress') {
    const inserted = await insertDueRobotAnswers(challenge, new Date());
    if (inserted > 0) {
      emitToUsers([challenge.challenger_id, challenge.opponent_id], 'challenge:updated', { challengeId });
    }
    challenge = await loadChallenge(challengeId);
  }

  if (challenge.status === 'accepted' && new Date() >= new Date(challenge.started_at)) {
    await markStarted(challengeId);
    challenge = await loadChallenge(challengeId);
  }

  if (challenge.status === 'in_progress'
    && new Date() >= addSeconds(new Date(challenge.ends_at), FINALIZE_GRACE_SECONDS)) {
    await finalizeChallenge(challengeId, { force: false });
    challenge = await loadChallenge(challengeId);
  }

  const now = new Date();
  const isMine = challenge.challenger_id === profileId;
  const myId = profileId;
  const opponentId = isMine ? challenge.opponent_id : challenge.challenger_id;
  const my = await markRows(challengeId, myId);
  const opponent = await markRows(challengeId, opponentId);
  const questionIds = parseJson(challenge.question_ids) ?? [];
  const myIndex = my.answered;

  let myQuestion = null;
  let lastFeedback = null;
  const canAnswer = challenge.status === 'in_progress'
    && now >= new Date(challenge.started_at)
    && now <= new Date(challenge.ends_at);

  if (canAnswer && questionIds.length > 0) {
    const questionIdsAtIndex = [questionIds[myIndex % questionIds.length]];
    const rows = await query(
      `SELECT q.*, a.answer_json, a.explanation
       FROM questions q JOIN question_answers a ON a.question_id = q.id
       WHERE q.id = ? LIMIT 1`,
      questionIdsAtIndex,
    );
    if (rows[0]) {
      const optionRows = await query(
        'SELECT opt_key, option_text FROM question_options WHERE question_id = ? ORDER BY sort_order ASC',
        [rows[0].id],
      );
      const question = {
        ...rows[0],
        options: optionRows.map((option) => ({ key: option.opt_key, text: option.option_text })),
        answer: parseJson(rows[0].answer_json),
      };
      myQuestion = shuffleQuestionForClient(question, `${challengeId}|${question.id}`);
      myQuestion.index = myIndex;
    }
  }

  if (my.answered > 0) {
    const lastIndex = my.answered - 1;
    const lastQuestionId = questionIds[lastIndex % questionIds.length];
    const rows = await query(
      `SELECT q.id, a.answer_json, a.explanation
       FROM questions q JOIN question_answers a ON a.question_id = q.id
       WHERE q.id = ? LIMIT 1`,
      [lastQuestionId],
    );
    if (rows[0]) {
      lastFeedback = {
        index: lastIndex,
        questionId: lastQuestionId,
        isCorrect: my.marks[lastIndex],
        correctAnswer: parseJson(rows[0].answer_json),
        explanation: rows[0].explanation,
      };
    }
  }

  const result = parseJson(challenge.result_json);
  const totalQuestionPool = questionIds.length;
  const opponentName = isMine ? challenge.opponent_name : challenge.challenger_name;
  const opponentAvatar = isMine ? challenge.opponent_avatar : challenge.challenger_avatar;
  const opponentGrade = isMine ? challenge.opponent_grade : challenge.challenger_grade;

  return {
    id: challenge.id,
    status: challenge.status,
    topic: {
      id: challenge.topic_id,
      name: challenge.topic_name,
      subjectId: challenge.subject_id,
      subjectName: challenge.subject_name,
      subjectColor: challenge.subject_color,
      grade: Number(challenge.grade),
    },
    durationSeconds: Number(challenge.duration_seconds),
    botLevel: challenge.bot_level,
    botName: challenge.bot_level ? 'Robot Thách Đấu' : null,
    createdAt: toIso(challenge.created_at),
    expiresAt: toIso(challenge.expires_at),
    startedAt: toIso(challenge.started_at),
    endsAt: toIso(challenge.ends_at),
    countdownSeconds: challenge.status === 'accepted'
      ? secondsUntil(new Date(challenge.started_at), now)
      : 0,
    remainingSeconds: challenge.status === 'in_progress'
      ? secondsUntil(new Date(challenge.ends_at), now)
      : 0,
    graceSeconds: challenge.status === 'in_progress'
      && now > new Date(challenge.ends_at) ? FINALIZE_GRACE_SECONDS : 0,
    canAnswer,
    isWaitingResult: challenge.status === 'in_progress' && now > new Date(challenge.ends_at),
    myIndex,
    myQuestion,
    lastFeedback,
    questionPoolSize: totalQuestionPool,
    me: {
      id: myId,
      displayName: isMine ? challenge.challenger_name : challenge.opponent_name,
      avatarKey: isMine ? challenge.challenger_avatar : challenge.opponent_avatar,
      grade: isMine ? Number(challenge.challenger_grade) : Number(challenge.opponent_grade),
      ...my,
    },
    opponent: {
      id: opponentId,
      displayName: opponentName,
      avatarKey: opponentAvatar,
      grade: opponentGrade === null ? null : Number(opponentGrade),
      isBot: opponentId === ROBOT_ID,
      ...opponent,
    },
    winnerId: challenge.winner_id,
    cancelledReason: challenge.cancelled_reason,
    result: result ? {
      winnerId: result.winnerId,
      tie: Boolean(result.tie),
      forfeiterId: result.forfeiterId ?? null,
      me: result.players?.[myId] ?? null,
      opponent: result.players?.[opponentId] ?? null,
    } : null,
  };
}

export async function getChallengeState(profileId, challengeId) {
  return buildState(profileId, challengeId);
}

export async function listLobby(profileId) {
  await cleanupExpiredInvitations();
  const incoming = await challengeRowsQuery(
    "c.opponent_id = ? AND c.status = 'pending' AND c.expires_at > UTC_TIMESTAMP(3) ORDER BY c.created_at DESC",
    [profileId],
  );
  const outgoing = await challengeRowsQuery(
    "c.challenger_id = ? AND c.status = 'pending' AND c.expires_at > UTC_TIMESTAMP(3) ORDER BY c.created_at DESC",
    [profileId],
  );
  const recent = await challengeRowsQuery(
    `(c.challenger_id = ? OR c.opponent_id = ?)
     AND c.status IN ('finished', 'cancelled', 'expired')
     ORDER BY c.created_at DESC LIMIT 10`,
    [profileId, profileId],
  );
  const open = await findOpenChallenge(profileId);

  return {
    incoming: incoming.map(summary),
    outgoing: outgoing.map(summary),
    recent: recent.map(summary),
    busy: Boolean(open),
    activeChallengeId: open?.id ?? null,
    robot: {
      id: ROBOT_ID,
      displayName: 'Robot Thách Đấu',
      avatarKey: 'cu',
      levels: Object.keys(ROBOT_LEVELS),
    },
  };
}

export { challengeRowsQuery, summary };
