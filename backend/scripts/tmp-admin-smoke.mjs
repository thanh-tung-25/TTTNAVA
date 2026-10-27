import { query, closePool } from '../src/config/db.js';

const BASE = process.env.SMOKE_BASE ?? 'http://localhost:3000';
const results = [];
const username = 'be_kiem_thu';
const password = 'KiemThu@123';
const newPassword = 'KiemThu@456';

function ok(name, detail = '') {
  results.push({ name, pass: true, detail });
  console.log(`PASS  ${name}${detail ? ` :: ${detail}` : ''}`);
}

function fail(name, detail = '') {
  results.push({ name, pass: false, detail });
  console.log(`FAIL  ${name}${detail ? ` :: ${detail}` : ''}`);
}

function assert(condition, name, detail = '') {
  if (condition) ok(name, detail);
  else fail(name, detail);
}

async function login(user, pass) {
  const response = await fetch(`${BASE}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: user, password: pass }),
  });
  const body = await response.json().catch(() => null);
  const cookie = response.headers.getSetCookie().map((value) => value.split(';')[0]).join('; ');
  return { status: response.status, body, data: body?.data, error: body?.error, cookie };
}

async function api(cookie, method, path, payload) {
  const response = await fetch(`${BASE}/api/v1${path}`, {
    method,
    headers: { 'content-type': 'application/json', cookie },
    body: payload === undefined ? undefined : JSON.stringify(payload),
  });
  const body = await response.json().catch(() => null);
  return { status: response.status, body, data: body?.data, error: body?.error, pagination: body?.pagination };
}

async function main() {
  const admin = await login('admin', 'Admin@123');
  assert(admin.status === 200 && admin.data.profile.role === 'admin', 'admin_login');

  // Dọn tài khoản test cũ
  const oldRows = await query('SELECT id FROM profiles WHERE username = ?', [username]);
  if (oldRows[0]) {
    await query('DELETE FROM diamond_ledger WHERE profile_id = ?', [oldRows[0].id]);
    await query('DELETE FROM profiles WHERE id = ?', [oldRows[0].id]);
    ok('cleanup_old_test_student');
  }

  // Tạo học sinh
  const created = await api(admin.cookie, 'POST', '/admin/students', {
    username,
    password,
    displayName: 'Bé Kiểm Thử',
    grade: 2,
    avatarKey: 'tho',
  });
  assert(created.status === 201 && created.data.username === username, 'create_student_201', `status=${created.status}`);
  assert(created.data.displayName === 'Bé Kiểm Thử' && created.data.grade === 2, 'create_student_fields');
  assert(created.data.locked === false, 'create_student_unlocked');
  const studentId = created.data.id;

  const duplicate = await api(admin.cookie, 'POST', '/admin/students', {
    username, password, displayName: 'Trùng', grade: 1,
  });
  assert(duplicate.status === 409 && duplicate.error?.code === 'DUPLICATE', 'duplicate_username_409',
    `status=${duplicate.status}`);

  const list = await api(admin.cookie, 'GET', `/admin/students?q=${encodeURIComponent('be_kiem_thu')}`);
  assert(list.status === 200 && list.data.some((row) => row.id === studentId), 'list_students_search');

  // Sửa thông tin
  const updated = await api(admin.cookie, 'PATCH', `/admin/students/${studentId}`, {
    displayName: 'Bé Kiểm Thử 2',
    grade: 4,
    avatarKey: 'gau',
  });
  assert(updated.status === 200 && updated.data.displayName === 'Bé Kiểm Thử 2'
    && updated.data.grade === 4 && updated.data.avatarKey === 'gau', 'update_student_fields');
  const emptyPatch = await api(admin.cookie, 'PATCH', `/admin/students/${studentId}`, {});
  assert(emptyPatch.status === 400, 'update_student_empty_rejected', `status=${emptyPatch.status}`);

  // Đăng nhập học sinh, sau đó khoá
  const student = await login(username, password);
  assert(student.status === 200 && student.data.profile.role === 'student', 'student_login');
  const meBefore = await api(student.cookie, 'GET', '/auth/me');
  assert(meBefore.status === 200, 'student_session_valid');

  const locked = await api(admin.cookie, 'POST', `/admin/students/${studentId}/lock`, { locked: true });
  assert(locked.status === 200 && locked.data.locked === true, 'lock_student');

  const lockedLogin = await login(username, password);
  assert(lockedLogin.status === 403 && lockedLogin.error?.code === 'ACCOUNT_LOCKED', 'locked_login_blocked',
    `status=${lockedLogin.status}`);
  const lockedSession = await api(student.cookie, 'GET', '/auth/me');
  assert(lockedSession.status === 403 && lockedSession.error?.code === 'ACCOUNT_LOCKED', 'locked_session_blocked',
    `status=${lockedSession.status}`);

  const unlocked = await api(admin.cookie, 'POST', `/admin/students/${studentId}/lock`, { locked: false });
  assert(unlocked.status === 200 && unlocked.data.locked === false, 'unlock_student');

  const relogin = await login(username, password);
  assert(relogin.status === 200, 'unlocked_login_works');

  // Reset mật khẩu không đăng xuất phiên khác
  const reset = await api(admin.cookie, 'POST', `/admin/students/${studentId}/password`, { newPassword });
  assert(reset.status === 200 && reset.data.updated === true, 'reset_password');
  const sessionAfterReset = await api(relogin.cookie, 'GET', '/auth/me');
  assert(sessionAfterReset.status === 200, 'reset_keeps_existing_session', `status=${sessionAfterReset.status}`);
  const oldLogin = await login(username, password);
  assert(oldLogin.status === 401, 'old_password_rejected', `status=${oldLogin.status}`);
  const newLogin = await login(username, newPassword);
  assert(newLogin.status === 200, 'new_password_accepted');

  // Phân quyền
  const forbidden = await api(newLogin.cookie, 'GET', '/admin/stats');
  assert(forbidden.status === 403 && forbidden.error?.code === 'FORBIDDEN', 'student_cannot_admin',
    `status=${forbidden.status}`);
  const adminPractice = await api(admin.cookie, 'POST', '/practice/start', { topicId: 'toan-3-phep-cong' });
  assert(adminPractice.status === 403, 'admin_cannot_practice', `status=${adminPractice.status}`);

  // Câu hỏi: xem, sửa, ẩn, hiện, audit
  const questions = await api(admin.cookie, 'GET', '/admin/questions?limit=5');
  assert(questions.status === 200 && questions.data.length > 0, 'list_questions', `count=${questions.data?.length}`);
  const questionId = questions.data[0].id;
  const detail = await api(admin.cookie, 'GET', `/admin/questions/${questionId}`);
  assert(detail.status === 200 && detail.data.id === questionId, 'question_detail');
  const original = detail.data;

  const basePayload = {
    prompt: original.prompt,
    imageUrl: original.imageUrl,
    difficulty: original.difficulty,
    status: 'visible',
    options: original.options.map((option, index) => ({ ...option, sortOrder: index + 1 })),
    answer: original.answer,
    explanation: `${original.explanation} (kiểm thử)`,
  };
  const edited = await api(admin.cookie, 'PATCH', `/admin/questions/${questionId}`, basePayload);
  assert(edited.status === 200 && edited.data.explanation.endsWith('(kiểm thử)'), 'edit_question');

  const hide = await api(admin.cookie, 'PATCH', `/admin/questions/${questionId}`, { ...basePayload, status: 'hidden' });
  assert(hide.status === 200 && hide.data.status === 'hidden', 'hide_question');
  const hiddenList = await api(admin.cookie, 'GET', `/admin/questions?status=hidden&q=${encodeURIComponent(original.prompt.slice(0, 20))}`);
  assert(hiddenList.data.some((row) => row.id === questionId), 'hidden_question_filter');

  const show = await api(admin.cookie, 'PATCH', `/admin/questions/${questionId}`, { ...basePayload, status: 'visible' });
  assert(show.status === 200 && show.data.status === 'visible', 'show_question');

  const audit = await api(admin.cookie, 'GET', `/admin/questions/${questionId}/audit`);
  const actions = audit.data.map((row) => row.action);
  assert(audit.status === 200 && actions.includes('update') && actions.includes('hide') && actions.includes('show'),
    'question_audit_actions', JSON.stringify(actions.slice(0, 3)));

  const badAnswer = await api(admin.cookie, 'PATCH', `/admin/questions/${questionId}`, {
    ...basePayload,
    answer: { key: 'z' },
  });
  assert(badAnswer.status === 400 && badAnswer.error?.code === 'INVALID_ANSWER', 'invalid_answer_rejected',
    `status=${badAnswer.status}`);
  const detailAfterBad = await api(admin.cookie, 'GET', `/admin/questions/${questionId}`);
  assert(detailAfterBad.data.explanation.endsWith('(kiểm thử)'), 'failed_edit_is_atomic');

  // Khôi phục câu hỏi
  const restore = await api(admin.cookie, 'PATCH', `/admin/questions/${questionId}`, {
    prompt: original.prompt,
    imageUrl: original.imageUrl,
    difficulty: original.difficulty,
    status: original.status,
    options: original.options,
    answer: original.answer,
    explanation: original.explanation,
  });
  assert(restore.status === 200 && restore.data.explanation === original.explanation, 'restore_question');

  // Thống kê
  const stats = await api(admin.cookie, 'GET', '/admin/stats');
  assert(stats.status === 200, 'admin_stats');
  assert(stats.data.bank.questions === 5263 && stats.data.bank.topics === 91, 'stats_bank_volume',
    `questions=${stats.data.bank.questions} topics=${stats.data.bank.topics}`);
  assert(stats.data.students.total >= 2, 'stats_students_total');
  assert(stats.data.challenges.robot >= 1, 'stats_robot_matches_included', `robot=${stats.data.challenges.robot}`);
  assert(Array.isArray(stats.data.bySubject) && stats.data.bySubject.length === 3, 'stats_by_subject');

  // Dọn tài khoản test
  await query('DELETE FROM profiles WHERE id = ?', [studentId]);
  const leftover = await query('SELECT id FROM profiles WHERE id = ?', [studentId]);
  assert(leftover.length === 0, 'cleanup_test_student');

  const failed = results.filter((row) => !row.pass);
  console.log(`\nSUMMARY ${results.length - failed.length}/${results.length} passed`);
  if (failed.length) {
    console.log(failed.map((row) => ` - ${row.name} ${row.detail}`).join('\n'));
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error('SMOKE ERROR', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closePool();
  });
