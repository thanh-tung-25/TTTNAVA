import fs from 'node:fs/promises';
import { test, expect } from '@playwright/test';

async function setup(page, { available = true } = {}) {
  const state = { sends: [], registrations: [] };
  await page.route('**/pages/register/', async route => route.fulfill({ contentType: 'text/html', body: await fs.readFile('frontend/pages/register/index.html', 'utf8') }));
  await page.route('**/pages/student/courses/', async route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><html lang="vi"><title>Khóa học</title><h1>Khóa học của bạn</h1></html>' }));
  await page.route('**/api/v1/auth/**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/registration-status')) return route.fulfill({ json: { data: { available } } });
    if (path.endsWith('/register/request-otp')) {
      state.sends.push(route.request().postDataJSON());
      return route.fulfill({ json: { data: { challengeId: `challenge-${state.sends.length}`, expiresIn: 300, resendAfter: 60 } } });
    }
    if (path.endsWith('/register')) {
      const payload = route.request().postDataJSON();
      state.registrations.push(payload);
      if (payload.otp !== '123456') return route.fulfill({ status: 400, json: { error: { code: 'REGISTRATION_OTP_INVALID', message: 'Mã xác minh chưa đúng. Bạn hãy kiểm tra lại.' } } });
      return route.fulfill({ status: 201, json: { data: { profile: { id: 'new-student', username: payload.username, role: 'student', grade: payload.grade } } } });
    }
    return route.fulfill({ status: 404, json: { error: { message: 'Unknown auth route' } } });
  });
  return state;
}
async function requestOtp(page, email = 'hoc.sinh@gmail.com') {
  await page.locator('#registration-email').fill(email);
  await page.locator('#send-otp-button').click();
  await expect(page.locator('#registration-account-step')).toBeVisible();
}

test('registration explains unavailability without pretending an OTP was sent', async ({ page }) => {
  const state = await setup(page, { available: false });
  await page.goto('/pages/register/');
  await expect(page.locator('#registration-availability')).toContainText('tạm thời chưa khả dụng');
  await expect(page.locator('#send-otp-button')).toBeHidden();
  await expect(page.getByRole('link', { name: 'Đăng nhập', exact: true })).toBeVisible();
  expect(state.sends).toEqual([]);
});

test('Gmail OTP registration keeps validation inline and creates an account only with the entered code', async ({ page }) => {
  const state = await setup(page);
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/pages/register/');
  await page.locator('#registration-email').fill('hoc.sinh@example.com');
  await page.locator('#send-otp-button').click();
  await expect(page.locator('#registration-error')).toContainText('Gmail hợp lệ');
  expect(state.sends).toEqual([]);
  await requestOtp(page);
  await expect(page.locator('#registration-sent-message')).toContainText('hoc.sinh@gmail.com');
  await expect(page.locator('#resend-otp-button')).toBeDisabled();
  await page.locator('#registration-otp').fill('000000');
  await page.locator('#registration-username').fill('hoc_sinh_moi');
  await page.locator('#registration-display-name').fill('Học sinh mới');
  await page.locator('#registration-grade').selectOption('7');
  await page.locator('#registration-password').fill('UiRegistration@123!');
  await page.locator('#registration-password-confirm').fill('UiRegistration@123!');
  await page.locator('#register-button').click();
  await expect(page.locator('#registration-error')).toContainText('Mã xác minh chưa đúng');
  await expect(page).toHaveURL(/\/pages\/register\/$/);
  expect(state.registrations[0]).toMatchObject({ challengeId: 'challenge-1', otp: '000000', grade: 7 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const stored = await page.evaluate(() => JSON.stringify({ ...localStorage }));
  expect(stored).not.toContain('UiRegistration@123!'); expect(stored).not.toContain('000000');
  await page.locator('#registration-otp').fill('123456');
  await page.locator('#register-button').click();
  await expect(page).toHaveURL(/\/pages\/student\/courses\/$/);
  expect(state.sends).toEqual([{ email: 'hoc.sinh@gmail.com' }]);
  expect(state.registrations).toHaveLength(2);
  expect(state.registrations[1]).toMatchObject({ username: 'hoc_sinh_moi', displayName: 'Học sinh mới', grade: 7, otp: '123456' });
  expect(errors).toEqual([]);
});

test('OTP resend waits for cooldown, replaces the challenge and allows changing Gmail', async ({ page }) => {
  await page.clock.install();
  const state = await setup(page);
  await page.goto('/pages/register/');
  await requestOtp(page);
  await expect(page.locator('#resend-otp-button')).toBeDisabled();
  await page.clock.fastForward(60_000);
  await expect(page.locator('#resend-otp-button')).toBeEnabled();
  await page.locator('#resend-otp-button').click();
  await expect(page.locator('#resend-otp-button')).toBeDisabled();
  expect(state.sends).toHaveLength(2);
  await page.clock.fastForward(300_000);
  await expect(page.locator('#otp-expiry')).toContainText('Mã đã hết hạn');
  await expect(page.locator('#register-button')).toBeDisabled();
  await page.locator('#registration-password').fill('DiscardThisPassword');
  await page.locator('#change-email-button').click();
  await expect(page.locator('#registration-email-form')).toBeVisible();
  await expect(page.locator('#registration-account-step')).toBeHidden();
  await expect(page.locator('#registration-password')).toHaveValue('');
  await requestOtp(page, 'hoc.sinh.khac@gmail.com');
  await expect(page.locator('#registration-sent-message')).toContainText('hoc.sinh.khac@gmail.com');
  expect(state.sends).toHaveLength(3);
});
