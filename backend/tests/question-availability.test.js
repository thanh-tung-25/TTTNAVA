import { beforeAll, describe, expect, test } from 'vitest';
import { createTestUser, loginStudent } from './helpers/index.js';

function question(index) {
  return {
    type: 'single_choice',
    prompt: `Câu ít dữ liệu ${index}: 10 + ${index} = ?`,
    options: [
      { key: 'a', text: String(10 + index) },
      { key: 'b', text: String(10 + index + 1) },
      { key: 'c', text: String(10 + index + 2) },
      { key: 'd', text: String(10 + index + 3) },
    ],
    answer: { key: 'a' },
    explanation: `10 + ${index} = ${10 + index}.`,
    difficulty: 'easy',
    status: 'published',
  };
}

describe('Chủ đề chưa đủ câu hỏi đã đăng', () => {
  const smallTopic = 'toan-3-bang-nhan-chia-6-9';
  const emptyTopic = 'toan-3-do-luong';
  let adminAgent;
  let studentAgent;

  beforeAll(async () => {
    const admin = await createTestUser({ username: 'test_avail_admin', role: 'admin' });
    const student = await createTestUser({ username: 'test_avail_student' });
    adminAgent = await loginStudent(admin);
    studentAgent = await loginStudent(student);
    for (let index = 1; index <= 4; index += 1) {
      const response = await adminAgent.post('/api/v1/admin/questions').send({
        topicId: smallTopic,
        subjectId: 'toan',
        grade: 3,
        ...question(index),
      });
      expect(response.status).toBe(201);
    }
  });

  test('test_question_availability_empty_topic_student_gets_clear_error', async () => {
    const practice = await studentAgent.post('/api/v1/practice').send({ topicId: emptyTopic });
    expect(practice.status).toBe(409);
    expect(practice.body.error.code).toBe('TOPIC_EMPTY');
    expect(practice.body.error.message).toContain('chưa có câu hỏi');
  });

  test('test_question_availability_practice_requires_ten_published', async () => {
    const response = await studentAgent.post('/api/v1/practice').send({ topicId: smallTopic });
    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('NOT_ENOUGH_QUESTIONS');
    expect(response.body.error.message).toContain('cần 10 câu');
  });

  test('test_question_availability_exam_requires_twenty_published', async () => {
    const response = await studentAgent.post('/api/v1/exams').send({ topicId: smallTopic });
    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('NOT_ENOUGH_QUESTIONS');
    expect(response.body.error.message).toContain('cần 20 câu');
  });

  test('test_question_availability_challenge_requires_five_published', async () => {
    const response = await studentAgent.post('/api/v1/challenges/robot').send({
      topicId: smallTopic,
      durationSeconds: 300,
      botLevel: 'easy',
    });
    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('TOPIC_TOO_SMALL');
    expect(response.body.error.message).toContain('5 câu');
  });
});
