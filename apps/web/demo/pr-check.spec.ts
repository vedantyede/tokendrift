import { test } from '@playwright/test';

const TERMINAL_URL = process.env.DEMO_TERMINAL_URL ?? 'http://localhost:4600/';

test('PR check ratchet mode (terminal)', async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto(TERMINAL_URL);
  await page.waitForTimeout(1000);
  await page.locator('#output', { hasText: /exit \d/i }).waitFor({ timeout: 30_000 });
  await page.waitForTimeout(2500);
});
