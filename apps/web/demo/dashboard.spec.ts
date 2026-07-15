import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(__dirname, '..');

interface SeedData {
  installationId: number;
  reportId: string;
  reportUrl: string;
  badgeSlug: string;
  sessionToken: string;
}

async function loadSeedData(): Promise<SeedData> {
  const outDir = process.env.DEMO_SEED_OUT_DIR;
  if (!outDir) throw new Error('DEMO_SEED_OUT_DIR env var is required');
  const raw = await readFile(path.join(outDir, 'seed-data.json'), 'utf8');
  return JSON.parse(raw) as SeedData;
}

function runNode(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, { cwd: webRoot, stdio: 'inherit' });
    child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`exited ${code}`))));
  });
}

test('TokensDrift feature tour', async ({ page, context }) => {
  test.setTimeout(180_000);
  const seed = await loadSeedData();

  // 1. Landing page
  await page.goto('/');
  await page.waitForTimeout(1500);
  await page.mouse.wheel(0, 500);
  await page.waitForTimeout(1000);
  await page.mouse.wheel(0, 800);
  await page.waitForTimeout(1500);

  // 2. Hosted report page (produced by a real `tokensdrift --share` run)
  await page.goto(seed.reportUrl);
  await page.waitForTimeout(1500);
  await page.mouse.wheel(0, 600);
  await page.waitForTimeout(1500);
  await page.mouse.wheel(0, 600);
  await page.waitForTimeout(1500);

  // 3. README badge for the same repo
  await page.goto(`/badge/${seed.badgeSlug}.svg`);
  await page.waitForTimeout(1500);

  // 4. GitHub App registration page (view only — never submits to github.com)
  await page.goto('/setup/github-app');
  await page.waitForTimeout(2000);

  // 5. Dashboard, signed out
  await page.goto('/dashboard');
  await page.waitForTimeout(2000);

  // 6. Sign in — mints a real session via the app's own signSession(), no
  // live GitHub OAuth performed
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
  await page.waitForTimeout(2500);

  // 7. Checkout — opens the real Paddle sandbox overlay
  await page.getByRole('button', { name: /upgrade to pro/i }).click();
  const paddleFrame = page.frameLocator('iframe[name="paddle_frame"]');
  try {
    await paddleFrame.getByLabel(/email address/i).waitFor({ state: 'visible', timeout: 20_000 });
    await page.waitForTimeout(1000);
    await paddleFrame.getByLabel(/email address/i).fill('demo@tokensdrift.com');
    const zip = paddleFrame.getByLabel(/zip|postcode/i);
    if (await zip.count()) await zip.fill('400001');
    await page.waitForTimeout(1000);
    await paddleFrame.getByRole('button', { name: /continue/i }).click();
    await page.waitForTimeout(3000);

    const cardNumber = paddleFrame.getByLabel(/card number/i);
    if (await cardNumber.count().catch(() => 0)) {
      await cardNumber.fill('4242 4242 4242 4242');
      await paddleFrame.getByLabel(/expiry/i).fill('12 / 30');
      await paddleFrame.getByLabel(/security code|cvv|cvc/i).fill('123');
      const cardholder = paddleFrame.getByLabel(/name on card|cardholder/i);
      if (await cardholder.count()) await cardholder.fill('Demo User');
      await page.waitForTimeout(1000);
      await paddleFrame.getByRole('button', { name: /pay|subscribe|confirm/i }).click();
      await page.waitForTimeout(4000);
    }
  } catch {
    // Best-effort: the sandbox overlay UI can change shape. Even a partial
    // walk-through still shows the real checkout flow on video; the
    // dashboard's "subscribed" state below is demonstrated independently
    // via the webhook simulation regardless of how far this got.
  }
  await page.waitForTimeout(1500);

  // Paddle sandbox can't call back to localhost, so fire the same
  // subscription.created webhook Paddle would send, through the app's own
  // signature-verified handler (see demo/simulate-subscription.mjs).
  await runNode([path.join(webRoot, 'demo', 'simulate-subscription.mjs'), String(seed.installationId), 'pro']);

  // 8. Dashboard again — now shows the Pro plan + billing portal link
  await page.goto('/dashboard');
  await page.waitForTimeout(2000);
  await expect(page.getByText(/pro plan/i)).toBeVisible({ timeout: 10_000 });

  // 9. Manage billing — same-tab redirect to a real Paddle sandbox customer
  // portal session (billing-portal-button.tsx sets window.location.href)
  await page.getByRole('button', { name: /manage billing/i }).click();
  await page.waitForURL(/paddle\.com/, { timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(3000);
});
