import { beforeAll, describe, expect, test } from 'vitest';
import { query } from '../src/config/db.js';
import {
  correctClientAnswer,
  createTestUser,
  loginStudent,
  questionFor,
  topicWithEnoughQuestions,
} from './helpers/index.js';

describe('Luyện tập', () => {
  let student;
  let otherStudent;
  let agent;
  let topicId;

  beforeAll(async () => {
    student = await createTestUser({ username: 'test_prac_student' });
    otherStudent = await createTestUser({ username: 'test_practice_other' });
    agent = await loginStudent(student);
    topicId = await topicWithEnoughQuestions();
  });

  test('test_practice_start_returns_ten_questions_without_answers', async () => {
    const response = await agent.post('/api/v1/practice').send({ topicId });
    expect(response.status).toBe(201);
    const session = response.body.data;
    expect(session.questions).toHaveLength(10);
    expect(session.totalQuestions).toBe(10);
    expect(session.status).toBe('in_progress');
    for (const question of session.questions) {
      expect(question.correctAnswer).toBeUndefined();
      expect(question.isCorrect).toBeUndefined();
      expect(question.answer).toBeUndefined();
    }
  });

  test('test_practice_answer_correct_returns_feedback_and_marks', async () => {
    const start = await agent.post('/api/v1/practice').send({ topicId });
    const session = start.body.data;
    const current = session.questions[session.currentIndex];
    const question = await questionFor(current.id);
    const response = await agent
      .post(`/api/v1/practice/${session.id}/answers`)
      .send({ questionId: current.id, answer: correctClientAnswer(question) });
    expect(response.status).toBe(200);
    expect(response.body.data.isCorrect).toBe(true);
    expect(response.body.data.selected).toEqual(correctClientAnswer(question));
    expect(response.body.data.state.correctCount).toBe(1);
    expect(response.body.data.state.questions[session.currentIndex].isCorrect).toBe(true);
    expect(response.body.data.state.questions[session.currentIndex].correctAnswer).toBeDefined();
  });

  test('test_practice_duplicate_answer_is_idempotent', async () => {
    const start = await agent.post('/api/v1/practice').send({ topicId });
    const session = start.body.data;
    const current = session.questions[session.currentIndex];
    const question = await questionFor(current.id);
    const answer = correctClientAnswer(question);
    const first = await agent
      .post(`/api/v1/practice/${session.id}/answers`)
      .send({ questionId: current.id, answer });
    const second = await agent
      .post(`/api/v1/practice/${session.id}/answers`)
      .send({ questionId: current.id, answer });
    expect(second.status).toBe(200);
    expect(second.body.data.alreadyAnswered).toBe(true);
    expect(second.body.data.state.correctCount).toBe(1);
    expect(second.body.data.state.answeredCount).toBe(first.body.data.state.answeredCount);
  });

  test('test_practice_finish_incomplete_earns_one_diamond_once', async () => {
    const start = await agent.post('/api/v1/practice').send({ topicId });
    const session = start.body.data;
    const current = session.questions[session.currentIndex];
    const question = await questionFor(current.id);
    await agent
      .post(`/api/v1/practice/${session.id}/answers`)
      .send({ questionId: current.id, answer: correctClientAnswer(question) });

    const finish = await agent.post(`/api/v1/practice/${session.id}/finish`);
    expect(finish.status).toBe(200);
    expect(finish.body.data.status).toBe('finished');
    expect(finish.body.data.diamondsEarned).toBe(1);
    expect(finish.body.data.percent).toBe(10);

    const again = await agent.post(`/api/v1/practice/${session.id}/finish`);
    expect(again.status).toBe(200);
    expect(again.body.data.diamondsEarned).toBe(1);
    const rows = await query(
      `SELECT amount, reason FROM diamond_ledger
       WHERE profile_id = ? AND ref_type = 'practice' AND ref_id = ?`,
      [student.id, session.id],
    );
    expect(rows).toEqual([{ amount: 1, reason: 'practice_complete' }]);
  });

  test('test_practice_perfect_earns_three_diamonds', async () => {
    const start = await agent.post('/api/v1/practice').send({ topicId });
    let state = start.body.data;
    for (let index = 0; index < 10; index += 1) {
      const current = state.questions[state.currentIndex];
      const question = await questionFor(current.id);
      const answered = await agent
        .post(`/api/v1/practice/${state.id}/answers`)
        .send({ questionId: current.id, answer: correctClientAnswer(question) });
      expect(answered.body.data.isCorrect).toBe(true);
      state = answered.body.data.state;
    }
    const finish = await agent.post(`/api/v1/practice/${state.id}/finish`);
    expect(finish.body.data.percent).toBe(100);
    expect(finish.body.data.diamondsEarned).toBe(3);
    const rows = await query(
      `SELECT amount, reason FROM diamond_ledger
       WHERE profile_id = ? AND ref_type = 'practice' AND ref_id = ?`,
      [student.id, state.id],
    );
    expect(rows).toEqual([{ amount: 3, reason: 'practice_perfect' }]);
  });

  test('test_practice_finish_without_answers_earns_nothing', async () => {
    const start = await agent.post('/api/v1/practice').send({ topicId });
    const finish = await agent.post(`/api/v1/practice/${start.body.data.id}/finish`);
    expect(finish.status).toBe(200);
    expect(finish.body.data.diamondsEarned).toBe(0);
    const rows = await query(
      'SELECT * FROM diamond_ledger WHERE ref_type = ? AND ref_id = ?',
      ['practice', start.body.data.id],
    );
    expect(rows).toHaveLength(0);
  });

  test('test_practice_other_student_cannot_read_session', async () => {
    const start = await agent.post('/api/v1/practice').send({ topicId });
    const otherAgent = await loginStudent(otherStudent);
    const response = await otherAgent.get(`/api/v1/practice/${start.body.data.id}`);
    expect(response.status).toBe(404);
  });

  test('test_practice_history_lists_session', async () => {
    const start = await agent.post('/api/v1/practice').send({ topicId });
    await agent.post(`/api/v1/practice/${start.body.data.id}/finish`);
    const response = await agent.get('/api/v1/practice/history?limit=50');
    expect(response.status).toBe(200);
    expect(response.body.data.some((item) => item.id === start.body.data.id)).toBe(true);
    expect(response.body.pagination.total).toBeGreaterThan(0);
  });

  test('test_practice_invalid_topic_returns_404', async () => {
    const response = await agent.post('/api/v1/practice').send({ topicId: 'khong-ton-tai' });
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('TOPIC_NOT_FOUND');
  });
});
