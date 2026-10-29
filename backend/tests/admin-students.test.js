import { beforeAll, describe, expect, test } from 'vitest';
import {
  createTestUser,
  loginAs,
  loginStudent,
} from './helpers/index.js';

describe('Quản trị học sinh', () => {
  let adminAgent;
  let username;

  beforeAll(async () => {
    const admin = await createTestUser({
      username: 'test_admin_students',
      role: 'admin',
      displayName: 'Cô Quản Trị',
    });
    adminAgent = await loginStudent(admin);
    username = 'test_admin_created';
  });

  test('test_admin_student_create_returns_201', async () => {
    const response = await adminAgent.post('/api/v1/admin/students').send({
      username,
      password: 'Student@123',
      displayName: 'Bé Quản Trị',
      grade: 2,
      avatarKey: 'tho',
    });
    expect(response.status).toBe(201);
    expect(response.body.data.username).toBe(username);
    expect(response.body.data.displayName).toBe('Bé Quản Trị');
    expect(response.body.data.grade).toBe(2);
    expect(response.body.data.locked).toBe(false);
  });

  test('test_admin_student_duplicate_username_returns_409', async () => {
    const response = await adminAgent.post('/api/v1/admin/students').send({
      username,
      password: 'Student@123',
      displayName: 'Bé Trùng',
      grade: 1,
      avatarKey: 'meo',
    });
    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('DUPLICATE');
  });

  test('test_admin_student_list_search_returns_match', async () => {
    const response = await adminAgent.get(`/api/v1/admin/students?q=${username}`);
    expect(response.status).toBe(200);
    expect(response.body.data.some((row) => row.username === username)).toBe(true);
    expect(response.body.pagination.total).toBeGreaterThan(0);
  });

  test('test_admin_student_update_changes_fields', async () => {
    const list = await adminAgent.get(`/api/v1/admin/students?q=${username}`);
    const id = list.body.data[0].id;
    const updated = await adminAgent.patch(`/api/v1/admin/students/${id}`).send({
      displayName: 'Bé Quản Trị 2',
      grade: 4,
      avatarKey: 'gau',
    });
    expect(updated.status).toBe(200);
    expect(updated.body.data.displayName).toBe('Bé Quản Trị 2');
    expect(updated.body.data.grade).toBe(4);
    expect(updated.body.data.avatarKey).toBe('gau');

    const empty = await adminAgent.patch(`/api/v1/admin/students/${id}`).send({});
    expect(empty.status).toBe(400);
  });

  test('test_admin_student_lock_blocks_login_and_live_session', async () => {
    const list = await adminAgent.get(`/api/v1/admin/students?q=${username}`);
    const id = list.body.data[0].id;
    const student = await loginAs(username, 'Student@123');
    expect(student.response.status).toBe(200);
    const studentAgent = student.agent;

    const lock = await adminAgent.post(`/api/v1/admin/students/${id}/lock`).send({ locked: true });
    expect(lock.status).toBe(200);
    expect(lock.body.data.locked).toBe(true);

    const blockedLogin = await loginAs(username, 'Student@123');
    expect(blockedLogin.response.status).toBe(403);
    expect(blockedLogin.response.body.error.code).toBe('ACCOUNT_LOCKED');

    const blockedSession = await studentAgent.get('/api/v1/auth/me');
    expect(blockedSession.status).toBe(403);
    expect(blockedSession.body.error.code).toBe('ACCOUNT_LOCKED');

    const unlock = await adminAgent.post(`/api/v1/admin/students/${id}/lock`).send({ locked: false });
    expect(unlock.status).toBe(200);
    expect(unlock.body.data.locked).toBe(false);
    const relogin = await loginAs(username, 'Student@123');
    expect(relogin.response.status).toBe(200);
  });

  test('test_admin_student_password_reset_keeps_existing_session', async () => {
    const list = await adminAgent.get(`/api/v1/admin/students?q=${username}`);
    const id = list.body.data[0].id;
    const current = await loginAs(username, 'Student@123');
    expect(current.response.status).toBe(200);

    const reset = await adminAgent
      .post(`/api/v1/admin/students/${id}/password`)
      .send({ newPassword: 'Student@456' });
    expect(reset.status).toBe(200);
    expect(reset.body.data.updated).toBe(true);

    const stillValid = await current.agent.get('/api/v1/auth/me');
    expect(stillValid.status).toBe(200);
    const oldPassword = await loginAs(username, 'Student@123');
    expect(oldPassword.response.status).toBe(401);
    const newPassword = await loginAs(username, 'Student@456');
    expect(newPassword.response.status).toBe(200);
  });

  test('test_admin_student_roles_cannot_use_admin_students', async () => {
    const student = await createTestUser({ username: 'test_not_admin' });
    const agent = await loginStudent(student);
    const response = await agent.get('/api/v1/admin/students');
    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  test('creates and edits Chinese learners without a primary grade', async () => {
    const created = await adminAgent.post('/api/v1/admin/students').send({
      username: 'test_chinese_learner', password: 'Chinese@123', displayName: 'Học viên Trung', grade: null,
    });
    expect(created.status).toBe(201);
    expect(created.body.data.grade).toBeNull();
    const login = await loginAs('test_chinese_learner', 'Chinese@123');
    expect(login.response.status).toBe(200);
    expect((await login.agent.get('/api/v1/chinese/catalog')).status).toBe(200);
    expect((await login.agent.post('/api/v1/admin/students').send({})).status).toBe(403);
    const filtered = await adminAgent.get('/api/v1/admin/students?program=chinese');
    expect(filtered.body.data.some(s => s.id === created.body.data.id)).toBe(true);
    expect(filtered.body.data.every(s => s.grade === null)).toBe(true);
    const changed = await adminAgent.patch(`/api/v1/admin/students/${created.body.data.id}`).send({ grade: 3 });
    expect(changed.body.data.grade).toBe(3);
    const back = await adminAgent.patch(`/api/v1/admin/students/${created.body.data.id}`).send({ grade: null });
    expect(back.body.data.grade).toBeNull();
    const bad = await adminAgent.post('/api/v1/admin/students').send({username:'test_bad_grade',password:'Chinese@123',displayName:'Sai lớp',grade:6});
    expect(bad.status).toBe(400);
  });
});
