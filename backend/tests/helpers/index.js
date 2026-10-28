import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { query } from '../../src/config/db.js';
import { hashPassword } from '../../src/services/auth-service.js';

export const PASSWORD = 'Test@123';
export const app = createApp();

let userCounter = 0;

export async function createTestUser({
  username,
  role = 'student',
  grade = 3,
  displayName = 'Bé Kiểm Thử',
  avatarKey = 'meo',
  locked = false,
  password = PASSWORD,
} = {}) {
  userCounter += 1;
  const finalUsername = username ?? `test_${role}_${userCounter}`;
  const id = randomUUID();
  const hash = await hashPassword(password);
  await query(
    `INSERT INTO profiles (id, username, email, password_hash, role, display_name, avatar_key, grade, banned_until)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      finalUsername,
      `${finalUsername}@kids-learning.invalid`,
      hash,
      role,
      displayName,
      avatarKey,
      role === 'student' ? grade : null,
      locked ? '2999-01-01 00:00:00' : null,
    ],
  );
  return { id, username: finalUsername, password, role, grade, displayName };
}

export async function loginAs(username, password = PASSWORD) {
  const agent = request.agent(app);
  const response = await agent
    .post('/api/v1/auth/login')
    .send({ username, password });
  return { agent, response };
}

export async function loginStudent(user) {
  const { agent, response } = await loginAs(user.username, user.password ?? PASSWORD);
  if (response.status !== 200) {
    throw new Error(`Đăng nhập thất bại: ${response.status} ${JSON.stringify(response.body)}`);
  }
  return agent;
}

export async function questionFor(questionId) {
  const rows = await query(
    `SELECT q.id, q.type, q.prompt, q.topic_id, a.answer_json, a.explanation
     FROM questions q JOIN question_answers a ON a.question_id = q.id
     WHERE q.id = ? LIMIT 1`,
    [questionId],
  );
  if (!rows[0]) throw new Error(`Không tìm thấy câu hỏi ${questionId}`);
  return { ...rows[0], answer: JSON.parse(rows[0].answer_json) };
}

export function correctClientAnswer(question) {
  const answer = question.answer;
  if (question.type === 'single_choice') return { key: answer.key };
  if (question.type === 'multiple_choice') return { keys: answer.keys };
  if (question.type === 'true_false') return { value: Boolean(answer.value) };
  return { value: answer.accepted[0] };
}

export function wrongClientAnswer(question, options = []) {
  if (question.type === 'single_choice') {
    const other = options.find((option) => option.key !== question.answer.key);
    return { key: other?.key ?? (question.answer.key === 'a' ? 'b' : 'a') };
  }
  if (question.type === 'multiple_choice') {
    const correct = new Set(question.answer.keys ?? []);
    const other = options.filter((option) => !correct.has(option.key));
    return { keys: other.length ? [other[0].key] : [options[0]?.key ?? 'a', options[1]?.key ?? 'b'] };
  }
  if (question.type === 'true_false') return { value: !Boolean(question.answer.value) };
  return { value: 'sai-hoan-toan-xyz' };
}

export async function topicWithEnoughQuestions() {
  const rows = await query(
    `SELECT t.id, COUNT(q.id) AS total
     FROM topics t JOIN questions q ON q.topic_id = t.id
     WHERE t.grade = 3 AND t.subject_id = 'toan' AND q.status = 'published'
     GROUP BY t.id HAVING total >= 25 ORDER BY total DESC LIMIT 1`,
  );
  if (!rows[0]) throw new Error('Không có chủ đề đủ câu hỏi cho bài kiểm thử');
  return rows[0].id;
}

export async function forceChallengeStarted(challengeId) {
  await query(
    `UPDATE challenges SET started_at = DATE_SUB(UTC_TIMESTAMP(3), INTERVAL 2 SECOND),
       ends_at = DATE_ADD(UTC_TIMESTAMP(3), INTERVAL 300 SECOND) WHERE id = ?`,
    [challengeId],
  );
}

export async function forceChallengeEnded(challengeId) {
  await query(
    'UPDATE challenges SET ends_at = DATE_SUB(UTC_TIMESTAMP(3), INTERVAL 2 SECOND) WHERE id = ?',
    [challengeId],
  );
}

export async function ledgerFor(profileId, challengeId) {
  return query(
    `SELECT amount, reason FROM diamond_ledger
     WHERE profile_id = ? AND ref_type = 'challenge' AND ref_id = ? ORDER BY id ASC`,
    [profileId, challengeId],
  );
}

export async function answerChallengeOnce(agent, challengeId, { correct = true } = {}) {
  const state = await agent.get(`/api/v1/challenges/${challengeId}`);
  const { myQuestion, myIndex } = state.body.data;
  if (!myQuestion) throw new Error(`Không có câu hỏi ở vị trí ${myIndex}`);
  const question = await questionFor(myQuestion.id);
  const answer = correct ? correctClientAnswer(question) : wrongClientAnswer(question, myQuestion.options);
  const response = await agent
    .post(`/api/v1/challenges/${challengeId}/answers`)
    .send({ index: myIndex, questionId: myQuestion.id, answer });
  return { response, question };
}
