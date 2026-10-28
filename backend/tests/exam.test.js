import { beforeAll, describe, expect, test } from 'vitest';
import { query } from '../src/config/db.js';
import {
  correctClientAnswer,
  createTestUser,
  loginStudent,
  questionFor,
  topicWithEnoughQuestions,
} from './helpers/index.js';

describe('Bài thi', () => {
  let student;
  let otherStudent;
  let agent;
  let topicId;

  beforeAll(async () => {
    student = await createTestUser({ username: 'test_exam_student' });
    otherStudent = await createTestUser({ username: 'test_exam_other' });
    agent = await loginStudent(student);
    topicId = await topicWithEnoughQuestions();
  });

  test('test_exam_start_returns_twenty_questions_without_results', async () => {
    const response = await agent.post('/api/v1/exams').send({ topicId });
    expect(response.status).toBe(201);
    const attempt = response.body.data;
    expect(attempt.questions).toHaveLength(20);
    expect(attempt.totalQuestions).toBe(20);
    expect(attempt.durationSeconds).toBe(900);
    expect(attempt.submitted).toBe(false);
    expect(attempt.correctCount).toBeNull();
    expect(attempt.scorePercent).toBeNull();
    expect(attempt.remainingSeconds).toBeGreaterThan(890);
    for (const question of attempt.questions) {
      expect(question.correctAnswer).toBeUndefined();
      expect(question.isCorrect).toBeUndefined();
      expect(question.explanation).toBeUndefined();
    }
  });

  test('test_exam_save_answer_hides_correctness_until_submit', async () => {
    const start = await agent.post('/api/v1/exams').send({ topicId });
    const attempt = start.body.data;
    const current = attempt.questions[0];
    const question = await questionFor(current.id);
    const saved = await agent
      .post(`/api/v1/exams/${attempt.id}/answers`)
      .send({ questionId: current.id, answer: correctClientAnswer(question) });
    expect(saved.status).toBe(200);
    expect(saved.body.data.saved).toBe(true);
    expect(saved.body.data.answeredCount).toBe(1);

    const state = await agent.get(`/api/v1/exams/${attempt.id}`);
    expect(state.status).toBe(200);
    expect(state.body.data.answeredCount).toBe(1);
    expect(state.body.data.questions[0].selected).toEqual(correctClientAnswer(question));
    expect(state.body.data.questions[0].isCorrect).toBeUndefined();
    expect(state.body.data.questions[0].correctAnswer).toBeUndefined();
    expect(state.body.data.correctCount).toBeNull();
  });

  test('test_exam_submit_incomplete_earns_one_diamond_once', async () => {
    const start = await agent.post('/api/v1/exams').send({ topicId });
    const attempt = start.body.data;
    const current = attempt.questions[0];
    const question = await questionFor(current.id);
    await agent
      .post(`/api/v1/exams/${attempt.id}/answers`)
      .send({ questionId: current.id, answer: correctClientAnswer(question) });

    const submit = await agent.post(`/api/v1/exams/${attempt.id}/submit`);
    expect(submit.status).toBe(200);
    expect(submit.body.data.submitted).toBe(true);
    expect(submit.body.data.answeredCount).toBe(1);
    expect(submit.body.data.correctCount).toBe(1);
    expect(submit.body.data.scorePercent).toBe(5);
    expect(submit.body.data.diamondsEarned).toBe(1);
    expect(submit.body.data.questions[0].isCorrect).toBe(true);
    expect(submit.body.data.questions[0].correctAnswer).toBeDefined();
    expect(submit.body.data.questions[0].explanation).toBeDefined();

    const again = await agent.post(`/api/v1/exams/${attempt.id}/submit`);
    expect(again.status).toBe(200);
    expect(again.body.data.diamondsEarned).toBe(1);
    const rows = await query(
      `SELECT amount, reason FROM diamond_ledger
       WHERE profile_id = ? AND ref_type = 'exam' AND ref_id = ?`,
      [student.id, attempt.id],
    );
    expect(rows).toEqual([{ amount: 1, reason: 'exam_complete' }]);
  });

  test('test_exam_perfect_earns_three_diamonds', async () => {
    const start = await agent.post('/api/v1/exams').send({ topicId });
    const attempt = start.body.data;
    for (const current of attempt.questions) {
      const question = await questionFor(current.id);
      const saved = await agent
        .post(`/api/v1/exams/${attempt.id}/answers`)
        .send({ questionId: current.id, answer: correctClientAnswer(question) });
      expect(saved.status).toBe(200);
    }
    const submit = await agent.post(`/api/v1/exams/${attempt.id}/submit`);
    expect(submit.status).toBe(200);
    expect(submit.body.data.correctCount).toBe(20);
    expect(submit.body.data.scorePercent).toBe(100);
    expect(submit.body.data.diamondsEarned).toBe(3);
    expect(submit.body.data.praise.level).toBe('perfect');
    const rows = await query(
      `SELECT amount, reason FROM diamond_ledger
       WHERE profile_id = ? AND ref_type = 'exam' AND ref_id = ?`,
      [student.id, attempt.id],
    );
    expect(rows).toEqual([{ amount: 3, reason: 'exam_perfect' }]);
  });

  test('test_exam_time_up_auto_submits_after_grace', async () => {
    const start = await agent.post('/api/v1/exams').send({ topicId });
    const attempt = start.body.data;
    const current = attempt.questions[0];
    const question = await questionFor(current.id);
    await agent
      .post(`/api/v1/exams/${attempt.id}/answers`)
      .send({ questionId: current.id, answer: correctClientAnswer(question) });
    await query(
      'UPDATE exam_attempts SET ends_at = DATE_SUB(UTC_TIMESTAMP(3), INTERVAL 10 SECOND) WHERE id = ?',
      [attempt.id],
    );

    const lateSave = await agent
      .post(`/api/v1/exams/${attempt.id}/answers`)
      .send({ questionId: attempt.questions[1].id, answer: { key: 'a' } });
    expect(lateSave.status).toBe(409);
    expect(lateSave.body.error.code).toBe('EXAM_TIME_UP');

    const state = await agent.get(`/api/v1/exams/${attempt.id}`);
    expect(state.status).toBe(200);
    expect(state.body.data.submitted).toBe(true);
    expect(state.body.data.answeredCount).toBe(1);
    expect(state.body.data.diamondsEarned).toBe(1);
  });

  test('test_exam_submit_without_answers_earns_nothing', async () => {
    const start = await agent.post('/api/v1/exams').send({ topicId });
    const submit = await agent.post(`/api/v1/exams/${start.body.data.id}/submit`);
    expect(submit.status).toBe(200);
    expect(submit.body.data.answeredCount).toBe(0);
    expect(submit.body.data.diamondsEarned).toBe(0);
    const rows = await query(
      'SELECT * FROM diamond_ledger WHERE ref_type = ? AND ref_id = ?',
      ['exam', start.body.data.id],
    );
    expect(rows).toHaveLength(0);
  });

  test('test_exam_other_student_cannot_read_attempt', async () => {
    const start = await agent.post('/api/v1/exams').send({ topicId });
    const otherAgent = await loginStudent(otherStudent);
    const response = await otherAgent.get(`/api/v1/exams/${start.body.data.id}`);
    expect(response.status).toBe(404);
  });

  test('test_exam_answer_after_submit_returns_409', async () => {
    const start = await agent.post('/api/v1/exams').send({ topicId });
    const attempt = start.body.data;
    await agent.post(`/api/v1/exams/${attempt.id}/submit`);
    const response = await agent
      .post(`/api/v1/exams/${attempt.id}/answers`)
      .send({ questionId: attempt.questions[0].id, answer: { key: 'a' } });
    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('EXAM_SUBMITTED');
  });

  test('test_exam_history_includes_submitted_attempt', async () => {
    const start = await agent.post('/api/v1/exams').send({ topicId });
    await agent.post(`/api/v1/exams/${start.body.data.id}/submit`);
    const response = await agent.get('/api/v1/exams/history?limit=50');
    expect(response.status).toBe(200);
    expect(response.body.data.some((item) => item.id === start.body.data.id)).toBe(true);
    expect(response.body.pagination.total).toBeGreaterThan(0);
  });
});
