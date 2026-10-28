import { test, expect } from '@playwright/test';
import { accounts, loginStudent } from './helpers.js';

test.describe('Đăng nhập và bảo vệ trang', () => {
  test('test_e2e_auth_guest_redirected_from_student_page', async ({ page }) => {
    await page.goto('/pages/student/home/');
    await expect(page).toHaveURL(/\/pages\/login\/\?next=/);
    await expect(page.locator('#login-form')).toBeVisible();
  });

  test('test_e2e_auth_wrong_password_shows_error', async ({ page }) => {
    await page.goto('/pages/login/');
    await page.locator('#username').fill(accounts.lan.username);
    await page.locator('#password').fill('SaiMatKhau@123');
    await page.locator('#login-button').click();
    await expect(page.locator('#login-error')).toBeVisible();
    await expect(page.locator('#login-error')).toContainText('mật khẩu');
    await expect(page).toHaveURL(/\/pages\/login\//);
  });

  test('test_e2e_auth_student_login_opens_home', async ({ page }) => {
    await loginStudent(page);
    await expect(page.locator('main')).toContainText('Chào');
    await expect(page.locator('#diamond-chip')).toContainText('3');
    const navText = await page.locator('nav').innerText();
    expect(navText).toContain('Luyện tập');
    expect(navText).toContain('Thi');
    expect(navText).toContain('Thách đấu');
  });

  test('test_e2e_auth_logout_returns_to_login', async ({ page }) => {
    await loginStudent(page);
    await page.locator('#logout-button').click();
    await page.waitForURL((url) => url.pathname === '/pages/login/');
    await page.goto('/pages/student/home/');
    await expect(page).toHaveURL(/\/pages\/login\//);
  });
});
