import fs from 'node:fs';
import { beforeAll, describe, expect, test } from 'vitest';
import {
  createTestUser,
  loginStudent,
  topicWithEnoughQuestions,
} from './helpers/index.js';

const DOCX_PATH = new URL('../../frontend/assets/templates/mau-nhap-cau-hoi.docx', import.meta.url);
const DOCX_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

function detailPayload(question, overrides = {}) {
  return {
    topicId: question.topicId,
    subjectId: question.subjectId,
    grade: question.grade,
    type: question.type,
    prompt: question.prompt,
    options: question.options,
    answer: question.answer,
    explanation: question.explanation,
    difficulty: question.difficulty,
    imageUrl: question.imageUrl ?? null,
    status: question.status,
    ...overrides,
  };
}

function singleChoice(overrides = {}) {
  return {
    type: 'single_choice',
    prompt: 'Câu hỏi do cô giáo tạo trong bài kiểm thử?',
    options: [
      { key: 'a', text: 'Đáp án đúng' },
      { key: 'b', text: 'Đáp án sai 1' },
      { key: 'c', text: 'Đáp án sai 2' },
      { key: 'd', text: 'Đáp án sai 3' },
    ],
    answer: { key: 'a' },
    explanation: 'Đây là lời giải do cô giáo nhập.',
    difficulty: 'easy',
    ...overrides,
  };
}

describe('Quản trị câu hỏi và thống kê', () => {
  let adminAgent;
  let studentAgent;
  let topicId;
  let createdId;

  beforeAll(async () => {
    const admin = await createTestUser({
      username: 'test_admin_questions',
      role: 'admin',
      displayName: 'Cô Câu Hỏi',
    });
    const student = await createTestUser({ username: 'test_admin_q_student' });
    adminAgent = await loginStudent(admin);
    studentAgent = await loginStudent(student);
    topicId = await topicWithEnoughQuestions();
  });

  test('test_admin_question_list_returns_paginated_fixture', async () => {
    const response = await adminAgent.get('/api/v1/admin/questions?limit=5');
    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(5);
    expect(response.body.pagination.total).toBeGreaterThanOrEqual(28);
    expect(response.body.data[0].status).toMatch(/draft|published|hidden/);
  });

  test('test_admin_question_detail_returns_answer_and_owner_fields', async () => {
    const list = await adminAgent.get('/api/v1/admin/questions?type=single_choice&limit=1');
    const questionId = list.body.data[0].id;
    const response = await adminAgent.get(`/api/v1/admin/questions/${questionId}`);
    expect(response.status).toBe(200);
    expect(response.body.data.id).toBe(questionId);
    expect(response.body.data.options.length).toBeGreaterThanOrEqual(2);
    expect(response.body.data.answer).toBeTruthy();
    expect(response.body.data).toHaveProperty('createdAt');
    expect(response.body.data).toHaveProperty('updatedAt');
  });

  test('test_admin_question_create_draft_hidden_from_student', async () => {
    const beforeCatalog = await studentAgent.get('/api/v1/catalog/topics?subjectId=toan&grade=3');
    const beforeCount = beforeCatalog.body.data.find((item) => item.id === topicId).questionCount;
    const created = await adminAgent.post('/api/v1/admin/questions').send({
      topicId,
      subjectId: 'toan',
      grade: 3,
      ...singleChoice(),
    });
    expect(created.status).toBe(201);
    expect(created.body.data.status).toBe('draft');
    expect(created.body.data.createdBy.displayName).toBe('Cô Câu Hỏi');
    createdId = created.body.data.id;

    const catalog = await studentAgent.get('/api/v1/catalog/topics?subjectId=toan&grade=3');
    const topicRow = catalog.body.data.find((item) => item.id === topicId);
    expect(topicRow.questionCount).toBe(beforeCount);
  });

  test('test_admin_question_publish_content_status_and_audit', async () => {
    const detail = await adminAgent.get(`/api/v1/admin/questions/${createdId}`);
    const edited = await adminAgent.patch(`/api/v1/admin/questions/${createdId}`)
      .send(detailPayload(detail.body.data, { explanation: 'Lời giải đã được cập nhật.' }));
    expect(edited.status).toBe(200);
    expect(edited.body.data.explanation).toBe('Lời giải đã được cập nhật.');

    const hidden = await adminAgent.patch(`/api/v1/admin/questions/${createdId}`)
      .send(detailPayload(detail.body.data, { status: 'hidden' }));
    expect(hidden.status).toBe(200);
    expect(hidden.body.data.status).toBe('hidden');

    const published = await adminAgent.patch(`/api/v1/admin/questions/${createdId}`)
      .send(detailPayload(detail.body.data, { status: 'published' }));
    expect(published.status).toBe(200);
    expect(published.body.data.status).toBe('published');

    const audit = await adminAgent.get(`/api/v1/admin/questions/${createdId}/audit`);
    const actions = audit.body.data.map((row) => row.action);
    expect(actions).toContain('create');
    expect(actions).toContain('update');
    expect(actions).toContain('hide');
    expect(actions).toContain('publish');
  });

  test('test_admin_question_invalid_answer_is_atomic', async () => {
    const before = await adminAgent.get(`/api/v1/admin/questions/${createdId}`);
    const failed = await adminAgent.patch(`/api/v1/admin/questions/${createdId}`)
      .send(detailPayload(before.body.data, { answer: { key: 'z' }, explanation: 'Không được lưu' }));
    expect(failed.status).toBe(400);
    expect(failed.body.error.code).toBe('INVALID_ANSWER');
    const after = await adminAgent.get(`/api/v1/admin/questions/${createdId}`);
    expect(after.body.data.explanation).toBe(before.body.data.explanation);
  });

  test('test_admin_question_topic_mismatch_rejected', async () => {
    const response = await adminAgent.post('/api/v1/admin/questions').send({
      topicId,
      subjectId: 'tieng-anh',
      grade: 3,
      ...singleChoice(),
    });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('TOPIC_SUBJECT_MISMATCH');
  });

  test('test_admin_question_import_docx_returns_editable_drafts', async () => {
    const response = await adminAgent.post('/api/v1/admin/questions/import/docx')
      .attach('file', fs.readFileSync(DOCX_PATH), { filename: 'mau.docx', contentType: DOCX_TYPE });
    expect(response.status).toBe(200);
    expect(response.body.data.questions).toHaveLength(4);
    expect(response.body.data.questions.every((row) => row.status === 'draft')).toBe(true);
    expect(response.body.data.questions[0].issues).toEqual([]);
    expect(response.body.data.metadata).toMatchObject({ subjectId: 'toan', grade: 3 });
  });

  test('test_admin_question_import_drafts_forces_draft_status', async () => {
    const response = await adminAgent.post('/api/v1/admin/questions/import').send({
      topicId,
      subjectId: 'toan',
      grade: 3,
      questions: [singleChoice(), singleChoice({ prompt: 'Câu nhập hàng loạt thứ hai?' })],
    });
    expect(response.status).toBe(201);
    expect(response.body.data.created).toBe(2);
    expect(response.body.data.status).toBe('draft');
    const detail = await adminAgent.get(`/api/v1/admin/questions/${response.body.data.ids[0]}`);
    expect(detail.body.data.status).toBe('draft');
  });

  test('test_admin_question_ai_unconfigured_returns_503', async () => {
    const config = await adminAgent.get('/api/v1/admin/questions/import/config');
    expect(config.body.data.ai.configured).toBe(false);
    const response = await adminAgent.post('/api/v1/admin/questions/import/ai')
      .attach('file', fs.readFileSync(DOCX_PATH), { filename: 'mau.docx', contentType: DOCX_TYPE });
    expect(response.status).toBe(503);
    expect(response.body.error.code).toBe('AI_NOT_CONFIGURED');
  });

  test('test_admin_question_upload_rejects_fake_docx', async () => {
    const response = await adminAgent.post('/api/v1/admin/questions/import/docx')
      .attach('file', Buffer.from('khong-phai-docx'), { filename: 'gia.docx', contentType: DOCX_TYPE });
    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe('INVALID_DOCX');
  });

  test('test_admin_question_stats_include_published_bank', async () => {
    const robot = await studentAgent
      .post('/api/v1/challenges/robot')
      .send({ topicId, durationSeconds: 300, botLevel: 'easy' });
    expect(robot.status).toBe(201);
    const stats = await adminAgent.get('/api/v1/admin/stats');
    expect(stats.status).toBe(200);
    expect(stats.body.data.bank.questions).toBeGreaterThanOrEqual(28);
    expect(stats.body.data.bank.publishedQuestions).toBeGreaterThanOrEqual(28);
    expect(stats.body.data.bank.topics).toBe(91);
    expect(stats.body.data.students.total).toBeGreaterThanOrEqual(1);
    expect(stats.body.data.challenges.robot).toBeGreaterThanOrEqual(1);
    expect(stats.body.data.bySubject).toHaveLength(3);
  });

  test('test_admin_question_student_forbidden', async () => {
    const list = await studentAgent.get('/api/v1/admin/questions');
    expect(list.status).toBe(403);
    expect(list.body.error.code).toBe('FORBIDDEN');
    const create = await studentAgent.post('/api/v1/admin/questions').send({
      topicId,
      subjectId: 'toan',
      grade: 3,
      ...singleChoice(),
    });
    expect(create.status).toBe(403);
  });
});
