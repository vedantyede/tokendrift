import { parseArgs } from 'node:util';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { loadConfig } from './configLoader.js';
import { walk } from './walker.js';
import { detectColors } from './rules/colors.js';
import { detectSpacing } from './rules/spacing.js';
import { aggregateResults } from './aggregate.js';
import { renderReport } from './report.js';
import { buildSharePayload, uploadReport, DEFAULT_SHARE_URL } from './share.js';
import { violationFingerprint } from './scan.js';
import type { FileScanResult, ScanAggregate } from './types.js';

const TOOL_VERSION = '0.1.0';

const USAGE = `tokensdrift [dir] [options]

Scans a codebase for design system drift and generates a scored HTML report.

Options:
  -o, --output <path>       HTML report output path (default: tokensdrift-report.html)
  --json <path>             Also write the raw scan aggregate as JSON
  --baseline <path>         Previous scan JSON (from --json) to compare against
  --fail-on-new             Exit 1 if new violations exist vs. --baseline
  --max-score-drop <n>      Exit 1 if the score drops by more than n vs. --baseline
  --share                   Upload the report artifact and print a hosted URL.
                             Opt-in; nothing is uploaded unless you pass this.
  --teardown-title <text>   Render as a "Published by TokensDrift" editorial
                             teardown (for public write-ups of open-source
                             repos), with this as the headline.
  --teardown-note <text>    Optional short editorial note shown under the
                             teardown title.
  --quiet                   Suppress the stdout summary
  -h, --help                Show this help
  -v, --version             Print the tool version

Exit codes: 0 clean/report-only, 1 threshold failure, 2 config/runtime error.
`;

// Caps concurrent open file handles. Unbounded Promise.all over every
// matched file blows past the OS file-descriptor limit on large real-world
// repos (tens of thousands of files) — EMFILE, especially on Windows.
const READ_CONCURRENCY = 64;

async function mapWithConcurrency<T>(items: T[], limit: number, fn: (item: T) => Promise<void>): Promise<void> {
  let next = 0;
  async function worker(): Promise<void> {
    for (;;) {
      const i = next++;
      if (i >= items.length) return;
      await fn(items[i]!);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
}

async function scanRepo(rootDir: string): Promise<ScanAggregate> {
  const config = await loadConfig(rootDir);
  const files = await walk(rootDir, config);

  let linesScanned = 0;
  const fileResults: FileScanResult[] = [];

  await mapWithConcurrency(files, READ_CONCURRENCY, async (f) => {
    const content = await readFile(f.absPath, 'utf8');
    const colors = detectColors(f.relPath, content, config);
    const spacing = detectSpacing(f.relPath, content, config);
    fileResults.push({
      file: f.relPath,
      violations: [...colors.violations, ...spacing.violations],
      tokenReferences: [...colors.tokenReferences, ...spacing.tokenReferences],
    });
    linesScanned += content.length === 0 ? 0 : content.split('\n').length;
  });

  fileResults.sort((a, b) => (a.file < b.file ? -1 : a.file > b.file ? 1 : 0));
  for (const fr of fileResults) {
    fr.violations.sort((a, b) => a.line - b.line || a.column - b.column);
  }

  return aggregateResults(fileResults, linesScanned);
}

async function readBaseline(baselinePath: string): Promise<ScanAggregate | null> {
  try {
    const raw = await readFile(baselinePath, 'utf8');
    return JSON.parse(raw) as ScanAggregate;
  } catch {
    return null;
  }
}

async function main(): Promise<number> {
  let values: Record<string, string | boolean | undefined>;
  let positionals: string[];
  try {
    ({ values, positionals } = parseArgs({
      allowPositionals: true,
      options: {
        output: { type: 'string', short: 'o' },
        json: { type: 'string' },
        baseline: { type: 'string' },
        'fail-on-new': { type: 'boolean' },
        'max-score-drop': { type: 'string' },
        share: { type: 'boolean' },
        'share-url': { type: 'string' },
        'teardown-title': { type: 'string' },
        'teardown-note': { type: 'string' },
        quiet: { type: 'boolean' },
        help: { type: 'boolean', short: 'h' },
        version: { type: 'boolean', short: 'v' },
      },
    }));
  } catch (err) {
    process.stderr.write(`${(err as Error).message}\n\n${USAGE}`);
    return 2;
  }

  if (values.help) {
    process.stdout.write(USAGE);
    return 0;
  }
  if (values.version) {
    process.stdout.write(`${TOOL_VERSION}\n`);
    return 0;
  }

  const rootDir = path.resolve(process.cwd(), positionals[0] ?? '.');
  const outputPath = path.resolve(process.cwd(), (values.output as string) ?? 'tokensdrift-report.html');

  let aggregate: ScanAggregate;
  try {
    aggregate = await scanRepo(rootDir);
  } catch (err) {
    process.stderr.write(`tokensdrift: scan failed: ${(err as Error).message}\n`);
    return 2;
  }

  const teardownTitle = values['teardown-title'] as string | undefined;
  const teardownNote = values['teardown-note'] as string | undefined;

  const html = renderReport(aggregate, {
    rootDir,
    generatedAt: new Date().toISOString(),
    toolVersion: TOOL_VERSION,
    teardownTitle,
    teardownNote,
  });

  try {
    await writeFile(outputPath, html, 'utf8');
    if (values.json) {
      const jsonPath = path.resolve(process.cwd(), values.json as string);
      await writeFile(jsonPath, JSON.stringify(aggregate, null, 2), 'utf8');
    }
  } catch (err) {
    process.stderr.write(`tokensdrift: failed to write report: ${(err as Error).message}\n`);
    return 2;
  }

  if (!values.quiet) {
    process.stdout.write(
      `Drift Score: ${aggregate.driftScore.score}/100\n` +
        `${aggregate.filesScanned} files scanned, ${aggregate.violations.length} violations\n` +
        `Report written to ${outputPath}\n`,
    );
  }

  if (values.share) {
    const shareBaseUrl = (values['share-url'] as string) ?? DEFAULT_SHARE_URL;
    try {
      const payload = buildSharePayload(aggregate, rootDir, TOOL_VERSION, { teardownTitle, teardownNote });
      const result = await uploadReport(payload, shareBaseUrl);
      process.stdout.write(
        `\nShared: ${result.url}\n` +
          `To delete it later, visit (save this — shown only once):\n` +
          `${result.url}/delete?token=${result.deletionToken}\n`,
      );
      if (result.badgeUrl) {
        process.stdout.write(
          `\nBadge (tracks this repo's latest score — add to your README):\n` +
            `[![Drift Score](${result.badgeUrl})](${result.url})\n`,
        );
      } else {
        process.stdout.write(
          `\nNo badge registered — no git remote "origin" was found for this directory.\n`,
        );
      }
    } catch (err) {
      // A hosting outage must never break a local scan (N3) — this is a
      // warning, not a failure; scan/threshold exit codes are unaffected.
      process.stderr.write(`tokensdrift: --share upload failed: ${(err as Error).message}\n`);
    }
  }

  let exitCode = 0;

  const maxScoreDropRaw = values['max-score-drop'] as string | undefined;
  const failOnNew = Boolean(values['fail-on-new']);

  if ((maxScoreDropRaw !== undefined || failOnNew) && !values.baseline) {
    process.stderr.write(
      'tokensdrift: --fail-on-new / --max-score-drop require --baseline <path>; skipping threshold checks.\n',
    );
  } else if (values.baseline) {
    const baseline = await readBaseline(path.resolve(process.cwd(), values.baseline as string));
    if (!baseline) {
      process.stderr.write(`tokensdrift: could not read baseline at ${values.baseline}\n`);
      return 2;
    }

    if (maxScoreDropRaw !== undefined) {
      const maxDrop = Number(maxScoreDropRaw);
      if (Number.isNaN(maxDrop)) {
        process.stderr.write(`tokensdrift: --max-score-drop must be a number, got "${maxScoreDropRaw}"\n`);
        return 2;
      }
      const drop = baseline.driftScore.score - aggregate.driftScore.score;
      if (drop > maxDrop) {
        process.stderr.write(
          `tokensdrift: drift score dropped by ${drop} (max allowed: ${maxDrop})\n`,
        );
        exitCode = 1;
      }
    }

    if (failOnNew) {
      const baselineFingerprints = new Set(baseline.violations.map(violationFingerprint));
      const newViolations = aggregate.violations.filter(
        (v) => !baselineFingerprints.has(violationFingerprint(v)),
      );
      if (newViolations.length > 0) {
        process.stderr.write(`tokensdrift: ${newViolations.length} new violation(s) introduced\n`);
        exitCode = 1;
      }
    }
  }

  return exitCode;
}

main().then(
  (code) => process.exit(code),
  (err) => {
    process.stderr.write(`tokensdrift: unexpected error: ${(err as Error).stack ?? err}\n`);
    process.exit(2);
  },
);
