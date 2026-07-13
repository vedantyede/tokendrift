import { getInstallationToken } from './githubAuth';
import { listPrFiles, fetchFileContent, createCheckRun } from './githubApi';
import { detectColors, detectSpacing, DEFAULT_CONFIG, violationFingerprint } from 'tokendrift/scan';
import type { Violation } from 'tokendrift/types';

// Sanity cap for a single webhook invocation — large PRs get a partial scan
// rather than risking a serverless function timeout. Known v1 limitation.
const MAX_FILES = 200;

function scanContent(relPath: string, content: string): Violation[] {
  const colors = detectColors(relPath, content, DEFAULT_CONFIG);
  const spacing = detectSpacing(relPath, content, DEFAULT_CONFIG);
  return [...colors.violations, ...spacing.violations];
}

interface PullRequestPayload {
  installation: { id: number };
  repository: { name: string; owner: { login: string } };
  pull_request: { number: number; head: { sha: string }; base: { sha: string } };
}

// Ratchet check (PRD F13): existing debt in a changed file never blocks —
// only violations introduced by this PR do. Uses the exact same
// fingerprint-based diff as the CLI's --fail-on-new/--baseline, so "new"
// means the same thing whether you run it locally or via this check.
export async function runPrCheck(payload: PullRequestPayload): Promise<void> {
  const owner = payload.repository.owner.login;
  const repo = payload.repository.name;
  const prNumber = payload.pull_request.number;
  const headSha = payload.pull_request.head.sha;
  const baseSha = payload.pull_request.base.sha;

  const token = await getInstallationToken(payload.installation.id);
  const files = (await listPrFiles(token, owner, repo, prNumber)).slice(0, MAX_FILES);

  const headViolations: Violation[] = [];
  const baseViolations: Violation[] = [];

  await Promise.all(
    files.map(async (f) => {
      const [headContent, baseContent] = await Promise.all([
        fetchFileContent(token, owner, repo, f.filename, headSha),
        f.status === 'added' ? Promise.resolve(null) : fetchFileContent(token, owner, repo, f.filename, baseSha),
      ]);
      if (headContent !== null) headViolations.push(...scanContent(f.filename, headContent));
      if (baseContent !== null) baseViolations.push(...scanContent(f.filename, baseContent));
    }),
  );

  const baseFingerprints = new Set(baseViolations.map(violationFingerprint));
  const newViolations = headViolations.filter((v) => !baseFingerprints.has(violationFingerprint(v)));

  const conclusion: 'success' | 'failure' = newViolations.length > 0 ? 'failure' : 'success';
  const title =
    newViolations.length > 0
      ? `${newViolations.length} new drift violation${newViolations.length === 1 ? '' : 's'}`
      : 'No new drift introduced';

  const summaryLines = [`Scanned ${files.length} changed file(s).`, ''];
  if (newViolations.length > 0) {
    summaryLines.push('New violations (existing debt in these files does not block):', '');
    for (const v of newViolations.slice(0, 50)) {
      summaryLines.push(`- \`${v.file}:${v.line}\` — ${v.kind} \`${v.value}\``);
    }
    if (newViolations.length > 50) {
      summaryLines.push(`- ...and ${newViolations.length - 50} more`);
    }
  } else {
    summaryLines.push('This PR does not introduce any new hardcoded colors or off-scale spacing.');
  }

  await createCheckRun(token, owner, repo, {
    name: 'TokenDrift',
    headSha,
    conclusion,
    title,
    summary: summaryLines.join('\n'),
  });
}
