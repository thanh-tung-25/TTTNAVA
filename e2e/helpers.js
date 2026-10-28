import { expect } from '@playwright/test';

export const accounts = {
  admin: { username: 'e2e_admin', password: 'E2eAdmin@123' },
  lan: { username: 'e2e_lan', password: 'E2eLan@123' },
  minh: { username: 'e2e_minh', password: 'E2eMinh@123' },
};

export async function login(page, account, expectedPath) {
  await page.goto('/pages/login/');
  await page.locator('#username').fill(account.username);
  await page.locator('#password').fill(account.password);
  await page.locator('#login-button').click();
  await page.waitForURL((url) => url.pathname === expectedPath, { timeout: 15_000 });
  await expect(page.locator('#app-header')).toContainText(account.username === 'e2e_admin' ? 'Cô E2E' : 'Bé E2E');
}

export async function loginStudent(page, account = accounts.lan) {
  await login(page, account, '/pages/student/home/');
}

export async function loginAdmin(page, account = accounts.admin) {
  await login(page, account, '/pages/admin/students/');
}

export async function answerCurrentQuestion(page, areaSelector = '#answer-area') {
  const option = page.locator(`${areaSelector} .option`).first();
  const input = page.locator(`${areaSelector} input.input`).first();
  await page.waitForTimeout(150);
  if (await option.isVisible().catch(() => false)) {
    await option.click();
    return;
  }
  await expect(input).toBeVisible();
  await input.fill('0');
}

export async function confirmModal(page, text) {
  const modal = page.locator('.modal');
  await expect(modal).toBeVisible();
  await modal.locator('.modal-actions button', { hasText: text }).click();
}

export async function waitForApp(page) {
  await expect(page.locator('#app-header')).toBeVisible();
}
