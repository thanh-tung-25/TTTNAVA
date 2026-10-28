import { test, expect } from '@playwright/test';
import { answerCurrentQuestion, confirmModal } from './helpers.js';

test.use({ storageState: 'e2e/.auth/lan.json' });

test.describe('Bài thi', () => {
  test('test_e2e_exam_start_answer_submit_and_review', async ({ page }) => {
    await page.goto('/pages/student/exam/');
    await expect(page.locator('[data-topic]').first()).toBeVisible();
    await page.locator('[data-topic]').first().click();
    await confirmModal(page, 'Bắt đầu');

    await expect(page.locator('#exam-view')).toBeVisible();
    await expect(page.locator('#exam-timer')).toHaveText(/^\d{2}:\d{2}$/);
    await expect(page.locator('#exam-progress')).toContainText('Câu 1/20');
    await expect(page.locator('#question-palette button')).toHaveCount(20);

    await answerCurrentQuestion(page);
    await expect(page.locator('#feedback')).toHaveCount(0);
    await page.locator('#next-button').click();
    await expect(page.locator('#exam-progress')).toContainText('Câu 2/20');
    await answerCurrentQuestion(page);
    await expect(page.locator('#exam-answered')).toContainText('Đã làm');

    await page.locator('#submit-button').click();
    await confirmModal(page, 'Nộp bài');
    await expect(page.locator('#result-view')).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('#result-correct')).toContainText('/20');
    await expect(page.locator('#result-diamonds')).toContainText('kim cương');
    await expect(page.locator('#review-list .review-item')).toHaveCount(20);
    await expect(page.locator('#review-list')).toContainText('Đáp án đúng');

    await page.goto('/pages/student/history/');
    await page.locator('#history-tabs [data-tab="exam"]').click();
    await expect(page.locator('#history-list .history-item').first()).toBeVisible();
    const first = await page.locator('#history-list .history-item').first().innerText();
    expect(first).toMatch(/\/20 câu/);
    expect(first).toMatch(/điểm/);
    expect(first).not.toContain('chưa nộp');
  });
});
