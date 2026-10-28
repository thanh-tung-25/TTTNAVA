import { test, expect } from '@playwright/test';
import { answerCurrentQuestion } from './helpers.js';

test.use({ storageState: 'e2e/.auth/lan.json' });

test.describe('Luyện tập', () => {
  test('test_e2e_practice_full_round_shows_feedback_and_result', async ({ page }) => {
    await page.goto('/pages/student/practice/');
    await expect(page.locator('[data-topic]').first()).toBeVisible();
    await page.locator('[data-topic]').first().click();

    await expect(page.locator('#quiz-view')).toBeVisible();
    await expect(page.locator('#quiz-progress')).toContainText('Câu 1/10');

    for (let index = 0; index < 10; index += 1) {
      await answerCurrentQuestion(page);
      await page.locator('#check-button').click();
      await expect(page.locator('#feedback')).toBeVisible();
      await expect(page.locator('#next-button')).toBeVisible();
      await page.locator('#next-button').click();
    }

    await expect(page.locator('#result-view')).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('#result-percent')).toHaveText(/^\d+$/);
    await expect(page.locator('#result-correct')).toContainText('/10');
    await expect(page.locator('#result-diamonds')).toContainText('kim cương');
    await expect(page.locator('#result-title')).not.toBeEmpty();
    await expect(page.locator('#diamond-chip')).toContainText('💎');
  });

  test('test_e2e_practice_history_lists_finished_session', async ({ page }) => {
    await page.goto('/pages/student/history/');
    await expect(page.locator('#history-list .history-item').first()).toBeVisible();
    const first = await page.locator('#history-list .history-item').first().innerText();
    expect(first).toMatch(/câu/);
    expect(first).toMatch(/%/);
  });
});
