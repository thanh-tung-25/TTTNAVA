import { afterAll, afterEach, beforeEach, expect, it, vi } from 'vitest';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { query } from '../src/config/db.js';
import { resetRateLimits } from '../src/middlewares/rate-limit.js';
import { app, createTestUser, loginStudent } from './helpers/index.js';

const password = 'Registration@123!';
const identities = new Set(), usernames = new Set(), fixtureIds = new Set();
let deliveries;

function newEmail() {
  const email = `rg${randomUUID().replaceAll('-', '').slice(0, 18)}@gmail.com`;
  identities.add(email);
  return email;
}
function newUsername() {
  const username = `rg_${randomUUID().replaceAll('-', '').slice(0, 12)}`;
  usernames.add(username);
  return username;
}
function details(challengeId, otp, overrides = {}) {
  return { challengeId, otp, username: newUsername(), password, displayName: 'Học sinh tự đăng ký', grade: null, ...overrides };
}
async function issue(email = newEmail()) {
  const response = await request(app).post('/api/v1/auth/register/request-otp').send({ email });
  expect(response.status).toBe(200);
  const message = deliveries.at(-1);
  const otp = message.text.match(/\b\d{6}\b/)?.[0];
  expect(otp).toMatch(/^\d{6}$/);
  return { email, response, challengeId: response.body.data.challengeId, otp };
}
const register = body => request(app).post('/api/v1/auth/register').send(body);

beforeEach(() => {
  vi.stubEnv('REGISTRATION_ENABLED', 'true');
  vi.stubEnv('REGISTRATION_MAIL_PROVIDER', 'resend');
  vi.stubEnv('RESEND_API_KEY', 'test_registration_provider_key');
  vi.stubEnv('REGISTRATION_FROM_EMAIL', 'TTNAVA <noreply@example.com>');
  deliveries = [];
  vi.stubGlobal('fetch', vi.fn(async (url, options) => {
    expect(url).toBe('https://api.resend.com/emails');
    deliveries.push(JSON.parse(options.body));
    return new Response(JSON.stringify({ id: randomUUID() }), { status: 200 });
  }));
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
afterAll(async () => {
  for (const username of usernames) await query('DELETE FROM profiles WHERE username=?', [username]);
  for (const id of fixtureIds) await query('DELETE FROM profiles WHERE id=?', [id]);
  for (const identity of identities) await query('DELETE FROM registration_otps WHERE gmail_identity=?', [identity]);
});

it('issues only a hashed expiring challenge before verification and never creates or logs in a student', async () => {
  const email = newEmail();
  const sent = await issue(email);
  expect(sent.response.body).toEqual({ data: { challengeId: expect.any(String), expiresIn: 300, resendAfter: 60 } });
  expect(sent.response.headers['set-cookie']).toBeUndefined();
  expect(sent.response.headers['cache-control']).toContain('no-store');
  expect(await query('SELECT id FROM profiles WHERE email=? OR gmail_identity=?', [email, email])).toEqual([]);
  const [pending] = await query('SELECT * FROM registration_otps WHERE id=?', [sent.challengeId]);
  expect(pending.otp_hash).toMatch(/^[a-f0-9]{64}$/);
  expect(pending.otp_hash).not.toBe(sent.otp);
  expect(Number(pending.attempt_count)).toBe(0);
  expect(Number(pending.send_count)).toBe(1);
  expect(pending.consumed_at).toBeNull();
  expect(new Date(pending.expires_at).getTime() - Date.now()).toBeGreaterThan(280_000);
});

it('creates only a verified student, sets a normal session and makes public registrants visible to both admins without granting courses', async () => {
  const challenge = await issue();
  const payload = details(challenge.challengeId, challenge.otp, {
    grade: 9, role: 'admin', adminScope: 'super', registration_source: 'admin',
    student_created_by: randomUUID(), student_creator_scope: 'super', student_management_scope: 'super',
    email: newEmail(), gmail_identity: newEmail(), courseId: 'hsk-1', enrolled: true,
  });
  const agent = request.agent(app);
  const response = await agent.post('/api/v1/auth/register').send(payload);
  expect(response.status).toBe(201);
  const profile = response.body.data.profile;
  expect(profile).toMatchObject({ username: payload.username, role: 'student', grade: 9, email: challenge.email });
  expect(response.headers['set-cookie'][0]).toContain('HttpOnly');
  expect(response.headers['set-cookie'][0]).toContain('SameSite=Lax');
  expect(profile.password_hash).toBeUndefined();
  const [stored] = await query('SELECT * FROM profiles WHERE id=?', [profile.id]);
  expect(stored.registration_source).toBe('self');
  expect(stored.email_verified_at).not.toBeNull();
  expect(stored.gmail_identity).toBe(challenge.email);
  expect(stored.student_created_by).toBeNull();
  expect(stored.student_creator_scope).toBeNull();
  expect(stored.student_management_scope).toBeNull();
  expect(stored.password_hash).not.toBe(password);
  for (const table of ['course_enrollments', 'course_orders']) {
    expect(await query(`SELECT * FROM ${table} WHERE student_id=?`, [profile.id])).toEqual([]);
  }
  expect(await query('SELECT * FROM diamond_ledger WHERE profile_id=?', [profile.id])).toEqual([]);
  expect((await agent.get('/api/v1/auth/me')).body.data.profile.id).toBe(profile.id);
  expect((await agent.post('/api/v1/auth/login').send({ username: payload.username, password })).status).toBe(200);
  for (const adminScope of ['super', 'chinese']) {
    const admin = await createTestUser({ role: 'admin', adminScope }); fixtureIds.add(admin.id);
    const adminAgent = await loginStudent(admin);
    const list = await adminAgent.get('/api/v1/admin/students').query({ q: payload.username });
    expect(list.status).toBe(200);
    expect(list.body.data.map(student => student.id)).toContain(profile.id);
  }
});

it('commits failed OTP attempts and blocks even the correct code after five failures', async () => {
  const challenge = await issue();
  const wrong = challenge.otp === '000000' ? '111111' : '000000';
  const payload = details(challenge.challengeId, wrong);
  for (let attempt = 1; attempt <= 5; attempt++) {
    const response = await register(payload);
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_REGISTRATION_OTP');
    const [pending] = await query('SELECT attempt_count FROM registration_otps WHERE id=?', [challenge.challengeId]);
    expect(Number(pending.attempt_count)).toBe(attempt);
  }
  expect((await register({ ...payload, otp: challenge.otp })).status).toBe(400);
  expect(await query('SELECT id FROM profiles WHERE username=?', [payload.username])).toEqual([]);
});
it('registers a verified guardian on the same Gmail flow without granting administrator or course access',async()=>{
 const challenge=await issue(),agent=request.agent(app),payload=details(challenge.challengeId,challenge.otp,{accountKind:'guardian',grade:9,role:'admin',adminScope:'super'});
 const result=await agent.post('/api/v1/auth/register').send(payload);expect(result.status).toBe(201);expect(result.body.data.profile).toMatchObject({role:'student',accountKind:'guardian',grade:null});
 const [row]=await query('SELECT account_kind,email_verified_at,registration_source FROM profiles WHERE id=?',[result.body.data.profile.id]);expect(row.account_kind).toBe('guardian');expect(row.email_verified_at).toBeTruthy();expect(row.registration_source).toBe('self');expect((await agent.get('/pages/login/')).headers.location).toBe('/pages/guardian/');expect((await agent.get('/api/v1/admin/students')).status).toBe(403);expect((await agent.get('/api/v1/courses/hsk-1/access')).status).toBe(403);
 expect((await request(app).post('/api/v1/auth/register/request-otp').send({email:challenge.email.replace('@','+second@')})).status).toBe(409);
});

it('rejects expired, missing and malformed challenges without creating an account', async () => {
  const challenge = await issue();
  await query('UPDATE registration_otps SET expires_at=? WHERE id=?', [new Date(Date.now() - 1000), challenge.challengeId]);
  const payload = details(challenge.challengeId, challenge.otp);
  for (const body of [payload, { ...payload, challengeId: randomUUID() }, { ...payload, otp: '12x456' }]) {
    expect((await register(body)).status).toBe(400);
  }
  expect(await query('SELECT id FROM profiles WHERE username=?', [payload.username])).toEqual([]);
});

it('consumes an OTP once when duplicate confirmations arrive concurrently', async () => {
  const challenge = await issue();
  const first = details(challenge.challengeId, challenge.otp), second = details(challenge.challengeId, challenge.otp);
  const responses = await Promise.all([register(first), register(second)]);
  expect(responses.map(response => response.status).sort()).toEqual([201, 400]);
  expect(await query('SELECT id FROM profiles WHERE gmail_identity=?', [challenge.email])).toHaveLength(1);
  expect((await register(details(challenge.challengeId, challenge.otp))).status).toBe(400);
  expect((await query('SELECT consumed_at FROM registration_otps WHERE id=?', [challenge.challengeId]))[0].consumed_at).not.toBeNull();
});

it('shares resend cooldown across Gmail aliases and invalidates the old challenge after resending', async () => {
  const email = newEmail(), local = email.split('@')[0];
  const alias = `${local.slice(0, 4)}.${local.slice(4)}+hoc@gmail.com`;
  const original = await issue(email);
  const blocked = await request(app).post('/api/v1/auth/register/request-otp').send({ email: alias });
  expect(blocked.status).toBe(429);
  expect(blocked.body.error.code).toBe('REGISTRATION_RATE_LIMITED');
  expect(deliveries).toHaveLength(1);
  await query('UPDATE registration_otps SET resend_after=? WHERE id=?', [new Date(Date.now() - 1000), original.challengeId]);
  const renewed = await issue(alias);
  expect(renewed.challengeId).not.toBe(original.challengeId);
  expect((await register(details(original.challengeId, original.otp))).status).toBe(400);
  expect((await register(details(renewed.challengeId, renewed.otp))).status).toBe(201);
  const [stored] = await query('SELECT email,gmail_identity FROM profiles WHERE gmail_identity=?', [email]);
  expect(stored).toEqual({ email: alias, gmail_identity: email });
});

it('limits a Gmail inbox to five sends per hour independently of the IP limiter', async () => {
  const email = newEmail();
  for (let attempt = 0; attempt < 5; attempt++) {
    resetRateLimits();
    if (attempt) await query('UPDATE registration_otps SET resend_after=? WHERE gmail_identity=?', [new Date(Date.now() - 1000), email]);
    await issue(email);
  }
  resetRateLimits();
  await query('UPDATE registration_otps SET resend_after=? WHERE gmail_identity=?', [new Date(Date.now() - 1000), email]);
  const response = await request(app).post('/api/v1/auth/register/request-otp').send({ email });
  expect(response.status).toBe(429);
  expect(response.body.error.code).toBe('REGISTRATION_RATE_LIMITED');
  expect(deliveries).toHaveLength(5);
  expect(Number((await query('SELECT send_count FROM registration_otps WHERE gmail_identity=?', [email]))[0].send_count)).toBe(5);
});

it('rolls back failed email delivery instead of leaving a usable new challenge', async () => {
  const email = newEmail();
  vi.mocked(fetch).mockResolvedValueOnce(new Response('Sensitive provider failure', { status: 503 }));
  const response = await request(app).post('/api/v1/auth/register/request-otp').send({ email });
  expect(response.status).toBe(503);
  expect(response.body.error.code).toBe('MAIL_DELIVERY_FAILED');
  expect(JSON.stringify(response.body)).not.toContain('Sensitive');
  expect(await query('SELECT * FROM registration_otps WHERE gmail_identity=?', [email])).toEqual([]);
  expect(await query('SELECT id FROM profiles WHERE gmail_identity=?', [email])).toEqual([]);
});

it('rejects canonical duplicates including legacy real Gmail accounts', async () => {
  const challenge = await issue();
  expect((await register(details(challenge.challengeId, challenge.otp))).status).toBe(201);
  const local = challenge.email.split('@')[0];
  const duplicate = await request(app).post('/api/v1/auth/register/request-otp').send({ email: `${local}+other@gmail.com` });
  expect(duplicate.status).toBe(409); expect(duplicate.body.error.code).toBe('EMAIL_ALREADY_REGISTERED');
  const legacy = await createTestUser({ enrolled: false }); fixtureIds.add(legacy.id);
  const email = newEmail(), legacyLocal = email.split('@')[0];
  await query('UPDATE profiles SET email=? WHERE id=?', [`${legacyLocal.slice(0, 5)}.${legacyLocal.slice(5)}+old@gmail.com`, legacy.id]);
  const legacyDuplicate = await request(app).post('/api/v1/auth/register/request-otp').send({ email });
  expect(legacyDuplicate.status).toBe(409); expect(legacyDuplicate.body.error.code).toBe('EMAIL_ALREADY_REGISTERED');
  expect(deliveries).toHaveLength(1);
});

it('allows a verified code to be retried with a different username after a username collision', async () => {
  const existing = await createTestUser({ enrolled: false }); fixtureIds.add(existing.id);
  const challenge = await issue();
  const collision = await register(details(challenge.challengeId, challenge.otp, { username: existing.username }));
  expect(collision.status).toBe(409); expect(collision.body.error.code).toBe('USERNAME_TAKEN');
  const [pending] = await query('SELECT attempt_count,consumed_at FROM registration_otps WHERE id=?', [challenge.challengeId]);
  expect(Number(pending.attempt_count)).toBe(0); expect(pending.consumed_at).toBeNull();
  expect((await register(details(challenge.challengeId, challenge.otp))).status).toBe(201);
});

it('reports unavailable configuration without sending mail or accepting registration', async () => {
  vi.stubEnv('RESEND_API_KEY', '');
  const status = await request(app).get('/api/v1/auth/registration-status');
  expect(status.status).toBe(200); expect(status.body.data).toEqual({ available: false });
  const response = await request(app).post('/api/v1/auth/register/request-otp').send({ email: newEmail() });
  expect(response.status).toBe(503); expect(response.body.error.code).toBe('REGISTRATION_UNAVAILABLE');
  const denied = await register(details(randomUUID(), '123456'));
  expect(denied.status).toBe(503); expect(denied.body.error.code).toBe('REGISTRATION_UNAVAILABLE');
  expect(fetch).not.toHaveBeenCalled();
});

it('rejects cross-origin registration requests before delivery or database writes', async () => {
  const email = newEmail();
  const response = await request(app).post('/api/v1/auth/register/request-otp').set('Origin', 'https://evil.example').send({ email });
  expect(response.status).toBe(403); expect(response.body.error.code).toBe('CSRF_ORIGIN');
  const complete = await request(app).post('/api/v1/auth/register').set('Origin', 'https://evil.example').send(details(randomUUID(), '123456'));
  expect(complete.status).toBe(403); expect(complete.body.error.code).toBe('CSRF_ORIGIN');
  expect(fetch).not.toHaveBeenCalled();
  expect(await query('SELECT * FROM registration_otps WHERE gmail_identity=?', [email])).toEqual([]);
});
