import { beforeAll, describe, expect, test } from 'vitest';
import request from 'supertest';
import {
  PASSWORD,
  app,
  createTestUser,
  loginAs,
  loginStudent,
} from './helpers/index.js';

describe('Xác thực và phân quyền', () => {
  let student;
  let admin;
  let locked;

  beforeAll(async () => {
    student = await createTestUser({ username: 'test_auth_student' });
    admin = await createTestUser({ username: 'test_auth_admin', role: 'admin', displayName: 'Cô Kiểm Thử' });
    locked = await createTestUser({ username: 'test_auth_locked', locked: true });
  });

  test('test_auth_register_disabled_returns_403', async () => {
    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({ username: 'tu_dang_ky', password: PASSWORD });
    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('REGISTRATION_DISABLED');
  });

  test('test_auth_login_success_returns_profile_and_cookie', async () => {
    const { response } = await loginAs(student.username);
    expect(response.status).toBe(200);
    expect(response.body.data.profile.username).toBe(student.username);
    expect(response.body.data.profile.role).toBe('student');
    expect(response.headers['set-cookie'][0]).toContain('HttpOnly');
  });

  test('test_auth_login_wrong_password_returns_401', async () => {
    const { response } = await loginAs(student.username, 'SaiMatKhau@123');
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  test('test_auth_locked_account_login_returns_403', async () => {
    const { response } = await loginAs(locked.username);
    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('ACCOUNT_LOCKED');
  });

  test('test_auth_me_requires_cookie', async () => {
    const response = await request(app).get('/api/v1/auth/me');
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHENTICATED');
  });

  test('test_auth_me_returns_current_profile', async () => {
    const agent = await loginStudent(student);
    const response = await agent.get('/api/v1/auth/me');
    expect(response.status).toBe(200);
    expect(response.body.data.profile.id).toBe(student.id);
  });

  test('test_auth_logout_clears_session', async () => {
    const agent = await loginStudent(student);
    const logout = await agent.post('/api/v1/auth/logout');
    expect(logout.status).toBe(200);
    const me = await agent.get('/api/v1/auth/me');
    expect(me.status).toBe(401);
  });

  test('test_auth_student_forbidden_admin_api', async () => {
    const agent = await loginStudent(student);
    const response = await agent.get('/api/v1/admin/stats');
    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  test('test_auth_admin_forbidden_student_practice', async () => {
    const agent = await loginStudent(admin);
    const response = await agent
      .post('/api/v1/practice')
      .send({ topicId: 'toan-3-cong-tru-1000' });
    expect(response.status).toBe(403);
  });

  test('test_auth_cross_origin_write_returns_403', async () => {
    const agent = await loginStudent(student);
    const response = await agent
      .post('/api/v1/practice')
      .set('Origin', 'https://evil.example')
      .send({ topicId: 'toan-3-cong-tru-1000' });
    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('CSRF_ORIGIN');
  });

  test('test_auth_protected_page_redirects_to_login', async () => {
    const response = await request(app).get('/pages/student/home/');
    expect(response.status).toBe(302);
    expect(response.headers.location).toContain('/pages/login/');
  });
});
