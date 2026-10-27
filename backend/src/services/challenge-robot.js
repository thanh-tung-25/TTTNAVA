import { query } from '../config/db.js';
import { sha256Hex } from '../utils/hash.js';
import { loadQuestionsByIds } from './question-service.js';

export const ROBOT_ID = '00000000-0000-4000-8000-000000000b07';
export const ROBOT_LEVELS = {
  easy: { rate: 0.5, minMs: 6000, maxMs: 12000 },
  medium: { rate: 0.7, minMs: 4000, maxMs: 10000 },
  hard: { rate: 0.85, minMs: 3000, maxMs: 7000 },
};

function hashNumber(hash, start, end) {
  return Number.parseInt(hash.slice(start, end), 16) / 0xffffffff;
}

export function robotPlan(challengeId, index, level) {
  const config = ROBOT_LEVELS[level] ?? ROBOT_LEVELS.medium;
  const hash = sha256Hex(`${challengeId}|bot|${index}`);
  const correct = hashNumber(hash, 0, 8) < config.rate;
  const delayMs = Math.round(config.minMs + hashNumber(hash, 8, 16) * (config.maxMs - config.minMs));
  return { correct, delayMs, hash };
}

function wrongAnswer(question, hash) {
  const expected = question.answer ?? {};
  if (question.type === 'single_choice') {
    const wrong = question.options.find((option) => option.key !== expected.key);
    return { key: wrong?.key ?? 'a' };
  }
  if (question.type === 'multiple_choice') {
    const expectedKeys = new Set(expected.keys ?? []);
    const wrong = question.options.find((option) => !expectedKeys.has(option.key));
    return { keys: [wrong?.key ?? question.options[0]?.key ?? 'a'] };
  }
  if (question.type === 'true_false') {
    return { value: !Boolean(expected.value) };
  }
  return { value: hash.includes('f') ? 'sai' : 'khong dung' };
}

function correctAnswer(question) {
  const expected = question.answer ?? {};
  if (question.type === 'single_choice') return { key: expected.key };
  if (question.type === 'multiple_choice') return { keys: [...(expected.keys ?? [])] };
  if (question.type === 'true_false') return { value: Boolean(expected.value) };
  return { value: expected.accepted?.[0] ?? '' };
}

export async function insertDueRobotAnswers(challenge, now = new Date()) {
  if (!challenge.bot_level || challenge.status !== 'in_progress') return 0;
  const questionIds = typeof challenge.question_ids === 'string'
    ? JSON.parse(challenge.question_ids)
    : challenge.question_ids;
  if (!Array.isArray(questionIds) || questionIds.length === 0) return 0;

  const existing = await query(
    'SELECT COUNT(*) AS total FROM challenge_answers WHERE challenge_id = ? AND profile_id = ?',
    [challenge.id, ROBOT_ID],
  );
  const startIndex = Number(existing[0].total);
  const startedAt = new Date(challenge.started_at);
  const endsAt = new Date(challenge.ends_at);
  const planned = [];

  let elapsed = 0;
  for (let index = 0; index < startIndex + 200; index += 1) {
    const plan = robotPlan(challenge.id, index, challenge.bot_level);
    elapsed += plan.delayMs;
    if (index < startIndex) continue;
    const answeredAt = new Date(startedAt.getTime() + elapsed);
    if (answeredAt > now || answeredAt > endsAt) break;
    planned.push({ index, answeredAt, plan, questionId: questionIds[index % questionIds.length] });
  }
  if (planned.length === 0) return 0;

  const questions = await loadQuestionsByIds(planned.map((item) => item.questionId));
  const byId = new Map(questions.map((question) => [question.id, question]));
  let inserted = 0;
  for (const item of planned) {
    const question = byId.get(item.questionId);
    if (!question) continue;
    const answer = item.plan.correct ? correctAnswer(question) : wrongAnswer(question, item.plan.hash);
    const result = await query(
      `INSERT IGNORE INTO challenge_answers
       (challenge_id, profile_id, q_index, question_id, answer_json, is_correct, answered_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        challenge.id,
        ROBOT_ID,
        item.index,
        item.questionId,
        JSON.stringify(answer),
        item.plan.correct ? 1 : 0,
        item.answeredAt,
      ],
    );
    if (result.affectedRows) inserted += 1;
  }
  return inserted;
}
