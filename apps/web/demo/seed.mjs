// Seeds local-only demo data before the Playwright recording runs.
// Must be run against a dev server started with Redis/Blob env vars
// stripped (see demo/run-demo.mjs) so nothing here touches production data.
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHmac } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(webRoot, '..', '..');
const cliDist = path.join(repoRoot, 'packages', 'cli', 'dist', 'index.js');
const fixtureRepo = process.env.DEMO_FIXTURE_REPO;
const baseUrl = 'http://localhost:3000';

async function loadEnvLocal() {
  const raw = await readFile(path.join(webRoot, '.env.local'), 'utf8');
  const env = {};
  for (const line of raw.split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)="?(.*?)"?\s*$/);
    if (m) env[m[1]] = m[2];
  }
  return env;
}

function base64url(input) {
  return Buffer.from(input).toString('base64url');
}

function signSession(payload, secret) {
  const now = Date.now();
  const signed = { ...payload, iat: now, exp: now + 30 * 24 * 60 * 60 * 1000 };
  const body = base64url(JSON.stringify(signed));
  const signature = createHmac('sha256', secret).update(body).digest('base64url');
  return `${body}.${signature}`;
}

async function seedInstallation(webhookSecret, installationId) {
  const payload = {
    action: 'created',
    installation: {
      id: installationId,
      account: { login: 'demo-org', type: 'Organization' },
      repository_selection: 'all',
    },
    repositories: [{ full_name: 'demo-org/demo-repo' }],
  };
  const rawBody = JSON.stringify(payload);
  const signature = `sha256=${createHmac('sha256', webhookSecret).update(rawBody).digest('hex')}`;

  const res = await fetch(`${baseUrl}/api/github/webhook`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-github-event': 'installation',
      'x-hub-signature-256': signature,
    },
    body: rawBody,
  });
  if (!res.ok) throw new Error(`installation webhook failed: ${res.status} ${await res.text()}`);
}

function runCli(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [cliDist, ...args], { cwd: webRoot });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => (stdout += d.toString()));
    child.stderr.on('data', (d) => (stderr += d.toString()));
    child.on('close', (code) => {
      if (code !== 0) return reject(new Error(`CLI exited ${code}: ${stderr}`));
      resolve(stdout);
    });
  });
}

async function main() {
  if (!fixtureRepo) throw new Error('DEMO_FIXTURE_REPO env var is required');

  const env = await loadEnvLocal();
  const webhookSecret = env.GITHUB_APP_WEBHOOK_SECRET;
  const sessionSecret = env.SESSION_SECRET;
  if (!webhookSecret || !sessionSecret) throw new Error('missing GITHUB_APP_WEBHOOK_SECRET or SESSION_SECRET in .env.local');

  const installationId = 990001;
  await seedInstallation(webhookSecret, installationId);

  const stdout = await runCli([
    fixtureRepo,
    '--share',
    '--share-url',
    baseUrl,
    '-o',
    path.join(fixtureRepo, '..', 'demo-report.html'),
  ]);

  const reportUrlMatch = stdout.match(/Shared: (\S+)/);
  const badgeMatch = stdout.match(/\[!\[Drift Score]\((\S+)\)]\((\S+)\)/);
  if (!reportUrlMatch) throw new Error(`could not find shared report URL in CLI output:\n${stdout}`);

  const reportUrl = reportUrlMatch[1];
  const reportId = reportUrl.split('/r/')[1];
  const badgeUrl = badgeMatch?.[1];
  const badgeSlug = badgeUrl?.split('/badge/')[1]?.replace(/\.svg$/, '');

  const sessionToken = signSession(
    { githubUserId: 424242, githubLogin: 'demo-user', installationIds: [installationId] },
    sessionSecret,
  );

  // Playwright's outputDir (demo-recordings/) is cleared at the start of
  // every test run, and apps/web/demo/ is tracked source (not a place for
  // generated data), so seed data goes to an explicit scratch location.
  const outDir = process.env.DEMO_SEED_OUT_DIR;
  if (!outDir) throw new Error('DEMO_SEED_OUT_DIR env var is required');
  await mkdir(outDir, { recursive: true });
  const seedData = { installationId, reportId, reportUrl, badgeSlug, sessionToken };
  await writeFile(path.join(outDir, 'seed-data.json'), JSON.stringify(seedData, null, 2), 'utf8');

  console.log('Seeded demo data:', seedData);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
