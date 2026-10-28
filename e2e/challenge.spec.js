import { test, expect } from '@playwright/test';
import { accounts, answerCurrentQuestion, confirmModal } from './helpers.js';

test.use({ storageState: 'e2e/.auth/lan.json' });

test.describe('Thách đấu', () => {
  test('test_e2e_challenge_robot_answer_and_forfeit', async ({ page }) => {
    await page.goto('/pages/student/challenge/');
    await expect(page.locator('#robot-topic option').first()).toBeAttached();
    await page.locator('#robot-levels [data-level="medium"]').click();
    await page.locator('#robot-button').click();

    await expect(page.locator('#match-view')).toBeVisible();
    await expect(page.locator('#opponent-player')).toContainText('Robot Thách Đấu');
    await expect(page.locator('#match-status')).toHaveText('Đang thi đấu');

    await answerCurrentQuestion(page, '#match-answer-area');
    await page.locator('#submit-answer').click();
    await expect(page.locator('#match-body .feedback')).toBeVisible();
    await expect(page.locator('#next-challenge-question')).toBeVisible();

    await page.locator('#forfeit-button').click();
    await confirmModal(page, 'Bỏ trận');
    await expect(page.locator('#match-status')).toHaveText('Đã kết thúc');
    await expect(page.locator('#back-to-lobby')).toBeVisible();
  });

  test('test_e2e_challenge_one_v_one_invite_accept_and_forfeit', async ({ browser }) => {
    const lanContext = await browser.newContext({ storageState: 'e2e/.auth/lan.json' });
    const minhContext = await browser.newContext({ storageState: 'e2e/.auth/minh.json' });
    const lanPage = await lanContext.newPage();
    const minhPage = await minhContext.newPage();

    try {
      await lanPage.goto('/pages/student/challenge/');
      await expect(lanPage.locator('#invite-topic option').first()).toBeAttached();
      await lanPage.locator('#opponent-username').fill(accounts.minh.username);
      await lanPage.locator('#invite-topic').selectOption({ index: 0 });
      await lanPage.locator('#invite-button').click();
      await expect(lanPage.locator('#match-status')).toHaveText('Đang chờ bạn nhận lời');

      await minhPage.goto('/pages/student/challenge/');
      const accept = minhPage.locator('[data-accept]').first();
      await expect(accept).toBeVisible({ timeout: 10_000 });
      await accept.click();
      await expect(minhPage.locator('#match-view')).toBeVisible();

      await expect(lanPage.locator('#match-status')).toHaveText('Đang thi đấu', { timeout: 15_000 });
      await expect(minhPage.locator('#match-status')).toHaveText('Đang thi đấu', { timeout: 15_000 });

      await answerCurrentQuestion(lanPage, '#match-answer-area');
      await lanPage.locator('#submit-answer').click();
      await expect(lanPage.locator('#match-body .feedback')).toBeVisible();
      await answerCurrentQuestion(minhPage, '#match-answer-area');
      await minhPage.locator('#submit-answer').click();
      await expect(minhPage.locator('#match-body .feedback')).toBeVisible();

      await lanPage.locator('#forfeit-button').click();
      await confirmModal(lanPage, 'Bỏ trận');
      await expect(lanPage.locator('#match-status')).toHaveText('Đã kết thúc');
      await expect(lanPage.locator('#match-body')).toContainText('Con thua rồi');
      await expect(lanPage.locator('#back-to-lobby')).toBeVisible();
    } finally {
      await lanContext.close();
      await minhContext.close();
    }
  });
});
