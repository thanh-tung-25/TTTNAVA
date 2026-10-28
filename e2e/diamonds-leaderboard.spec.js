import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/lan.json' });

test.describe('Kim cương và xếp hạng', () => {
  test('test_e2e_diamonds_page_shows_totals_and_ledger', async ({ page }) => {
    await page.goto('/pages/student/diamonds/');
    await expect(page.locator('#diamond-total')).toHaveText(/^\d+$/);
    await expect(page.locator('#diamond-week')).toContainText('Tuần này:');
    await expect(page.locator('#diamond-month')).toContainText('Tháng này:');
    await expect(page.locator('#ledger-list .ledger-row').first()).toBeVisible();
    const total = Number(await page.locator('#diamond-total').innerText());
    expect(total).toBeGreaterThanOrEqual(3);
  });

  test('test_e2e_leaderboard_lists_students_and_filters', async ({ page }) => {
    await page.goto('/pages/student/leaderboard/');
    await expect(page.locator('#rank-list .rank-row').first()).toBeVisible();
    await expect(page.locator('#rank-list')).toContainText('Bé E2E Lan');
    await page.locator('#range-tabs [data-range="month"]').click();
    await expect(page.locator('#rank-list .rank-row').first()).toBeVisible();
    await page.locator('#grade-filter').selectOption('3');
    await expect(page.locator('#rank-list .rank-row').first()).toBeVisible();
    await expect(page.locator('#rank-list')).toContainText('Lớp 3');
  });
});
