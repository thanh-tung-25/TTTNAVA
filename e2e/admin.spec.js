import path from 'node:path';
import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/admin.json' });

const DOCX_PATH = path.resolve('frontend/assets/templates/mau-nhap-cau-hoi.docx');

test.describe('Quản trị', () => {
  test('test_e2e_admin_students_page_creates_and_lists_student', async ({ page }) => {
    await page.goto('/pages/admin/students/');
    await expect(page.locator('#app-header')).toContainText('Cô E2E');
    await expect(page.locator('#students-table tbody tr').first()).toBeVisible();
    await expect(page.locator('#students-table')).toContainText('Bé E2E Lan');

    const username = `e2e_ui_${Date.now().toString().slice(-6)}`;
    await page.locator('#create-button').click();
    await expect(page.locator('.modal')).toBeVisible();
    await page.locator('#new-username').fill(username);
    await page.locator('#new-display-name').fill('Bé Giao Diện');
    await page.locator('#new-password').fill('UiTest@123');
    await page.locator('#new-grade').selectOption('2');
    await page.locator('#new-avatar').selectOption('tho');
    await page.locator('.modal-actions button', { hasText: 'Tạo tài khoản' }).click();

    await expect(page.locator('.modal')).toHaveCount(0);
    await expect(page.locator('#students-table')).toContainText('Bé Giao Diện');
    await expect(page.locator('#students-table')).toContainText(`@${username}`);
  });

  test('test_e2e_admin_questions_page_lists_and_opens_detail', async ({ page }) => {
    await page.goto('/pages/admin/questions/');
    await expect(page.locator('#questions-table tbody tr').first()).toBeVisible();
    await expect(page.locator('#page-label')).toContainText('câu');
    await page.locator('#filter-type').selectOption('single_choice');
    await page.locator('#filter-button').click();
    await page.locator('#questions-table [data-view]').first().click();
    await expect(page.locator('.modal')).toBeVisible();
    await expect(page.locator('.modal h2')).toHaveText('Chi tiết câu hỏi');
    await expect(page.locator('.modal form')).toBeVisible();
    expect(await page.locator('.modal [data-option-key]').count()).toBeGreaterThanOrEqual(2);
    await expect(page.locator('.modal [data-status]')).toBeVisible();
    await page.locator('.modal [data-close]').click();
    await expect(page.locator('.modal')).toHaveCount(0);
  });

  test('test_e2e_admin_question_create_draft_and_publish', async ({ page }) => {
    const prompt = `E2E câu hỏi ${Date.now().toString().slice(-6)}: 12 + 8 = ?`;
    await page.goto('/pages/admin/questions/');
    await page.locator('#create-question').click();
    await expect(page.locator('.modal [data-topic]')).toBeVisible();
    await page.locator('.modal [data-subject]').selectOption('toan');
    await page.locator('.modal [data-grade]').selectOption('3');
    await expect(page.locator('.modal [data-topic] option[value="toan-3-cong-tru-1000"]')).toBeAttached();
    await page.locator('.modal [data-topic]').selectOption('toan-3-cong-tru-1000');
    await page.locator('.modal [data-prompt]').fill(prompt);
    const options = page.locator('.modal [data-option-text]');
    await options.nth(0).fill('20');
    await options.nth(1).fill('19');
    await options.nth(2).fill('21');
    await options.nth(3).fill('22');
    await page.locator('.modal input[name="answerKey"][value="a"]').check();
    await page.locator('.modal [data-explanation]').fill('12 + 8 = 20.');
    await page.locator('.modal [data-status]').selectOption('draft');
    await page.locator('.modal-actions button', { hasText: 'Lưu câu hỏi' }).click();

    await expect(page.locator('.modal')).toHaveCount(0);
    const row = page.locator('#questions-table tbody tr', { hasText: prompt });
    await expect(row).toBeVisible();
    await expect(row).toContainText('Nháp');

    await row.locator('[data-view]').click();
    await expect(page.locator('.modal [data-status]')).toBeVisible();
    await page.locator('.modal [data-status]').selectOption('published');
    await page.locator('.modal-actions button', { hasText: 'Lưu thay đổi' }).click();
    await expect(page.locator('.modal')).toHaveCount(0);
    await expect(row).toContainText('Đã đăng');
  });

  test('test_e2e_admin_question_import_docx_saves_drafts', async ({ page }) => {
    await page.goto('/pages/admin/questions/');
    await page.locator('#import-questions').click();
    await expect(page.locator('#docx-file')).toBeVisible();
    await page.locator('#docx-file').setInputFiles(DOCX_PATH);
    await page.locator('[data-read]').click();
    await expect(page.locator('[data-import-status]')).toContainText('Đọc được 4 câu hỏi nháp');
    await expect(page.locator('.import-question-card')).toHaveCount(4);
    await expect(page.locator('[data-topic] option[value="toan-3-cong-tru-1000"]')).toBeAttached();
    await page.locator('[data-topic]').selectOption('toan-3-cong-tru-1000');
    await page.locator('[data-save]').click();

    await expect(page.locator('.modal')).toHaveCount(0);
    const row = page.locator('#questions-table tbody tr', { hasText: '325 + 247 = ?' });
    await expect(row).toBeVisible();
    await expect(row).toContainText('Nháp');
  });

  test('test_e2e_admin_stats_page_shows_bank_and_robot', async ({ page }) => {
    await page.goto('/pages/admin/stats/');
    await expect(page.locator('#stats-content .stat').first()).toBeVisible();
    await expect(page.locator('#stats-content')).toContainText('Tổng câu hỏi');
    await expect(page.locator('#stats-content')).toContainText('Đã đăng');
    await expect(page.locator('#stats-content')).toContainText('91');
    await expect(page.locator('#stats-content')).toContainText('Trận với Robot');
    await expect(page.locator('#stats-content tbody tr')).toHaveCount(3);
  });
});
