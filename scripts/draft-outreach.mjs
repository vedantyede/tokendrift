#!/usr/bin/env node
// Internal sales tool, not part of the shipped product: scans a target repo
// with the real CLI and drafts a cold-outreach email from the real numbers
// (the "send prospects their own report" tactic from the PRD's Phase 5).
//
// Usage:
//   node scripts/draft-outreach.mjs <path-or-git-url> [--name "Their Name"] [--share]
//
// --share uploads the report and links to a real hosted page in the email
// (needs --share-url wired below, or set TOKENSDRIFT_SHARE_URL env var).

import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const cliBin = path.join(repoRoot, 'packages/cli/dist/index.js');

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--name') args.name = argv[++i];
    else if (a === '--share') args.share = true;
    else args._.push(a);
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
const target = args._[0];
if (!target) {
  console.error('Usage: node scripts/draft-outreach.mjs <path-or-git-url> [--name "Their Name"] [--share]');
  process.exit(2);
}

const isUrl = /^(https?:\/\/|git@)/.test(target);
let scanDir = target;
let cloneDir = null;

const jsonOut = path.join(mkdtempSync(path.join(tmpdir(), 'tokensdrift-scan-')), 'scan.json');
const htmlOut = path.join(path.dirname(jsonOut), 'report.html');

// No --share-url override by default — the CLI's own DEFAULT_SHARE_URL
// already points at tokensdrift.com. TOKENSDRIFT_SHARE_URL is only for
// testing against a different deployment.
const shareArgs = args.share
  ? ['--share', ...(process.env.TOKENSDRIFT_SHARE_URL ? ['--share-url', process.env.TOKENSDRIFT_SHARE_URL] : [])]
  : [];

let shareUrl = null;
try {
  if (isUrl) {
    cloneDir = mkdtempSync(path.join(tmpdir(), 'tokensdrift-outreach-'));
    console.error(`Cloning ${target}...`);
    // core.longpaths works around Windows' 260-char MAX_PATH default, which
    // real-world monorepos (deeply nested feature folders) routinely exceed.
    execFileSync(
      'git',
      ['-c', 'core.longpaths=true', 'clone', '--depth', '1', target, cloneDir],
      { stdio: 'inherit' },
    );
    scanDir = cloneDir;
  }

  const output = execFileSync(
    process.execPath,
    [cliBin, scanDir, '--json', jsonOut, '-o', htmlOut, ...shareArgs],
    { encoding: 'utf8' },
  );
  const match = output.match(/Shared: (\S+)/);
  if (match) shareUrl = match[1];
} finally {
  if (cloneDir) rmSync(cloneDir, { recursive: true, force: true });
}

const aggregate = JSON.parse(readFileSync(jsonOut, 'utf8'));
const repoLabel = path.basename(target.replace(/\.git$/, '').replace(/\/$/, ''));
const adoptionPct = Math.round(aggregate.adoption.overall.rate * 100);

const topFiles = Object.entries(aggregate.violationsByFile)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 3);

const examples = aggregate.violations.slice(0, 2);

const name = args.name ?? 'there';
const senderName = '[Your name]';

const lines = [];
lines.push(`Subject: ${repoLabel}'s design system score: ${aggregate.driftScore.score}/100`);
lines.push('');
lines.push(`Hi ${name},`);
lines.push('');
lines.push(
  `I ran TokensDrift (a free, local-only scanner — nothing leaves your machine) against ${repoLabel}. ` +
    `It measures how much of a codebase actually uses your design tokens vs. hardcoded colors and spacing.`,
);
lines.push('');
lines.push(`Score: ${aggregate.driftScore.score}/100`);
lines.push(`${aggregate.violations.length} violations across ${aggregate.filesScanned} files scanned`);
lines.push(`Token adoption: ${adoptionPct}%`);
lines.push('');
if (topFiles.length > 0) {
  lines.push('Top offenders:');
  for (const [file, count] of topFiles) {
    lines.push(`- ${file}: ${count} violation${count === 1 ? '' : 's'}`);
  }
  lines.push('');
}
if (examples.length > 0) {
  lines.push('A couple of examples:');
  for (const v of examples) {
    lines.push(`- ${v.file}:${v.line} — ${v.snippet}`);
  }
  lines.push('');
}
lines.push(shareUrl ? `Full report: ${shareUrl}` : 'Full report attached.');
lines.push('');
lines.push(
  `No pitch yet — just wanted to hand you the number. If it's useful, happy to talk about ` +
    `the version that keeps this from creeping back up in CI.`,
);
lines.push('');
lines.push(`— ${senderName}`);

console.log(lines.join('\n'));
