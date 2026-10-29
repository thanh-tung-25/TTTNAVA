import { test, expect } from '@playwright/test';
import { answerCurrentQuestion } from './helpers.js';

test.use({ viewport: { width: 360, height: 800 }, storageState: 'e2e/.auth/lan.json' });

async function expectNoHorizontalOverflow(page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
}

test.describe('Giao diện di động 360px', () => {
  test('test_e2e_mobile_home_has_no_horizontal_overflow', async ({ page }) => {
    await page.goto('/pages/student/home/');
    await expect(page.locator('#app-header')).toBeVisible();
    await expect(page.locator('#diamond-chip')).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await expect(page.locator('main')).toContainText('Chào');
  });

  test('test_e2e_mobile_practice_quiz_fits_viewport', async ({ page }) => {
    await page.goto('/pages/student/practice/');
    await expect(page.locator('[data-topic]').first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.locator('[data-topic]').first().click();
    await expect(page.locator('#quiz-view')).toBeVisible();
    await expect(page.locator('#question-prompt')).toBeVisible();
    await answerCurrentQuestion(page);
    await page.locator('#check-button').click();
    await expect(page.locator('#feedback')).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});

test.describe('Ngân hàng câu hỏi trên di động 360px', () => {
  test.use({ storageState: 'e2e/.auth/admin.json' });

  test('test_e2e_mobile_admin_question_bank_fits_viewport', async ({ page }) => {
    await page.goto('/pages/admin/questions/');
    await expect(page.locator('#curriculum-tree .tree-year')).toBeVisible();
    await expect(page.locator('#scope-empty')).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
