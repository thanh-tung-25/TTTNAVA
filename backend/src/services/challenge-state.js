import { query } from '../config/db.js';
import { parseJson } from '../utils/normalize.js';
import { shuffleQuestionForClient } from '../utils/hash.js';
import { addSeconds, secondsUntil, toIso } from '../utils/time.js';
import { emitToUsers } from '../realtime/emit.js';
import { insertDueRobotAnswers, ROBOT_ID } from './challenge-robot.js';
import {
  FINALIZE_GRACE_SECONDS,
  assertParticipant,
  cleanupExpiredInvitations,
  loadChallenge,
  markStarted,
} from './challenge-store.js';
import { finalizeChallenge } from './challenge-play.js';

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
