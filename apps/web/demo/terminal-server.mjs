// Standalone terminal-in-a-browser-tab for recording the PR-check ratchet
// demo. There's no web page for that feature (it only shows up as a GitHub
// Check Run on a real PR, and no GitHub App private key is configured
// locally — see the conversation this was built from), so this streams a
// real CLI run into a styled <pre> instead of faking GitHub's UI. Deliberately
// separate from the Next app (this is a throwaway recording aid, not a
// product route).
import { createServer } from 'node:http';
import { readFile, cp, copyFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..', '..');
const cliDist = path.join(repoRoot, 'packages', 'cli', 'dist', 'index.js');

const fixtureRepo = process.env.DEMO_FIXTURE_REPO;
const cardAfter = process.env.DEMO_CARD_AFTER;
const workDir = process.env.DEMO_TERMINAL_WORKDIR;
const port = Number(process.env.DEMO_TERMINAL_PORT ?? 4600);

if (!fixtureRepo || !cardAfter || !workDir) {
  throw new Error('DEMO_FIXTURE_REPO, DEMO_CARD_AFTER, DEMO_TERMINAL_WORKDIR are required');
}

function runCli(args, cwd) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [cliDist, ...args], { cwd });
    let combined = '';
    child.stdout.on('data', (d) => (combined += d.toString()));
    child.stderr.on('data', (d) => (combined += d.toString()));
    child.on('close', (code) => resolve({ code, output: combined }));
  });
}

function sseSend(res, text) {
  for (const line of text.split('\n')) {
    res.write(`data: ${line}\n`);
  }
  res.write('\n');
}

async function handleRun(res) {
  res.writeHead(200, {
    'content-type': 'text/event-stream',
    'cache-control': 'no-cache',
    connection: 'keep-alive',
  });

  await cp(fixtureRepo, workDir, { recursive: true, force: true });
  const baselineJson = path.join(workDir, '..', 'baseline.json');
  const reportOut = path.join(workDir, '..', 'demo-scan-report.html');

  sseSend(res, '$ tokensdrift scan main --json baseline.json\n(this is the base branch — the last known-good state)\n');
  await new Promise((r) => setTimeout(r, 1200));
  const clean = await runCli([workDir, '--json', baselineJson, '-o', reportOut], workDir);
  sseSend(res, clean.output.trimEnd());

  await new Promise((r) => setTimeout(r, 1800));
  sseSend(res, '\n# A pull request modifies src/components/Card.tsx —');
  sseSend(res, '# adds a new hardcoded border color and an off-scale padding value\n');
  await new Promise((r) => setTimeout(r, 1500));
  await copyFile(cardAfter, path.join(workDir, 'src', 'components', 'Card.tsx'));

  sseSend(
    res,
    '$ tokensdrift scan pr-41 --baseline baseline.json --fail-on-new\n(this is exactly what the GitHub App\'s PR check runs server-side —\nsame ratchet logic, same fingerprint diff, just no GitHub Check Run UI here)\n',
  );
  await new Promise((r) => setTimeout(r, 1200));
  const afterRun = await runCli([workDir, '--baseline', baselineJson, '--fail-on-new', '-o', reportOut], workDir);
  sseSend(res, afterRun.output.trimEnd());

  await new Promise((r) => setTimeout(r, 800));
  sseSend(
    res,
    afterRun.code === 0
      ? '\n✓ Check passed — no new violations vs. base branch (exit 0)'
      : `\n✗ Check failed — new drift introduced vs. base branch (exit ${afterRun.code})\n  A real PR gets this as a failed GitHub Check Run + a drift-delta PR comment.`,
  );

  res.write('event: done\ndata: {}\n\n');
  res.end();
}

const server = createServer(async (req, res) => {
  if (req.url === '/run') {
    await handleRun(res).catch((err) => {
      res.write(`data: error: ${err.message}\n\n`);
      res.end();
    });
    return;
  }
  const html = await readFile(path.join(__dirname, 'terminal.html'), 'utf8');
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  res.end(html);
});

server.listen(port, () => {
  console.log(`terminal demo server on http://localhost:${port}`);
});
