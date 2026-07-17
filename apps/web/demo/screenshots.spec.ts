import { test, expect } from '@playwright/test';
import { readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Local-only screenshot capture, same seed data as dashboard.spec.ts. Not
// part of the app's test suite (see playwright.config.ts) — output goes to
// apps/web/demo-images/, a sibling of the gitignored demo-recordings/.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(__dirname, '..');
const outDir = path.join(webRoot, 'demo-images');

interface SeedData {
  installationId: number;
  reportId: string;
  reportUrl: string;
  badgeSlug: string;
  sessionToken: string;
}

async function loadSeedData(): Promise<SeedData> {
  const seedOutDir = process.env.DEMO_SEED_OUT_DIR;
  if (!seedOutDir) throw new Error('DEMO_SEED_OUT_DIR env var is required');
  const raw = await readFile(path.join(seedOutDir, 'seed-data.json'), 'utf8');
  return JSON.parse(raw) as SeedData;
}

test('capture UI screenshots', async ({ page, context }) => {
  test.setTimeout(60_000);
  await mkdir(outDir, { recursive: true });
  const seed = await loadSeedData();

  await page.goto('/');
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(outDir, '01-landing.png'), fullPage: true });

  await page.goto(seed.reportUrl);
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(outDir, '02-hosted-report.png'), fullPage: true });

  await page.goto('/setup/github-app');
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(outDir, '03-github-app-setup.png'), fullPage: true });

  await page.goto('/dashboard');
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(outDir, '04-dashboard-signed-out.png'), fullPage: true });

  await context.addCookies([
    {
      name: 'tokensdrift_session',
      value: seed.sessionToken,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
    },
  ]);
  await page.goto('/dashboard');
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(outDir, '05-dashboard-signed-in.png'), fullPage: true });

  await page.getByRole('button', { name: /upgrade to pro/i }).click();
  const paddleFrame = page.frameLocator('iframe[name="paddle_frame"]');
  await paddleFrame.getByLabel(/email address/i).waitFor({ state: 'visible', timeout: 20_000 }).catch(() => {});
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(outDir, '06-paddle-checkout.png'), fullPage: true });
});

test('capture PR-check terminal screenshot', async ({ page }) => {
  test.setTimeout(30_000);
  await mkdir(outDir, { recursive: true });
  const terminalUrl = process.env.DEMO_TERMINAL_URL ?? 'http://localhost:4600/';
  await page.goto(terminalUrl);
  await page.locator('#output', { hasText: /exit \d/i }).waitFor({ timeout: 20_000 });
  await page.waitForTimeout(500);
  await expect(page.locator('#output')).toBeVisible();
  await page.screenshot({ path: path.join(outDir, '07-pr-check-terminal.png'), fullPage: true });
});
