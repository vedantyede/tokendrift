import { parseArgs } from 'node:util';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { loadConfig } from './config.js';
import { walk } from './walker.js';
import { detectColors } from './rules/colors.js';
import { detectSpacing } from './rules/spacing.js';
import { aggregateResults } from './aggregate.js';
import { renderReport } from './report.js';
import { buildSharePayload, uploadReport, DEFAULT_SHARE_URL } from './share.js';
import type { FileScanResult, ScanAggregate, Violation } from './types.js';

const TOOL_VERSION = '0.1.0';

const USAGE = `tokendrift [dir] [options]

Scans a codebase for design system drift and generates a scored HTML report.

Options:
  -o, --output <path>       HTML report output path (default: tokendrift-report.html)
  --json <path>             Also write the raw scan aggregate as JSON
  --baseline <path>         Previous scan JSON (from --json) to compare against
  --fail-on-new             Exit 1 if new violations exist vs. --baseline
  --max-score-drop <n>      Exit 1 if the score drops by more than n vs. --baseline
  --share                   Upload the report artifact and print a hosted URL.
                             Opt-in; nothing is uploaded unless you pass this.
  --quiet                   Suppress the stdout summary
  -h, --help                Show this help
  -v, --version             Print the tool version

Exit codes: 0 clean/report-only, 1 threshold failure, 2 config/runtime error.
`;

function violationFingerprint(v: Violation): string {
  return `${v.rule}|${v.file}|${v.line}|${v.column}|${v.value}`;
}

async function scanRepo(rootDir: string): Promise<ScanAggregate> {
  const config = await loadConfig(rootDir);
  const files = await walk(rootDir, config);

  let linesScanned = 0;
  const fileResults: FileScanResult[] = [];

  await Promise.all(
    files.map(async (f) => {
      const content = await readFile(f.absPath, 'utf8');
      const colors = detectColors(f.relPath, content, config);
      const spacing = detectSpacing(f.relPath, content, config);
      fileResults.push({
        file: f.relPath,
        violations: [...colors.violations, ...spacing.violations],
        tokenReferences: [...colors.tokenReferences, ...spacing.tokenReferences],
      });
      linesScanned += content.length === 0 ? 0 : content.split('\n').length;
    }),
  );

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
  const outputPath = path.resolve(process.cwd(), (values.output as string) ?? 'tokendrift-report.html');

  let aggregate: ScanAggregate;
  try {
    aggregate = await scanRepo(rootDir);
  } catch (err) {
    process.stderr.write(`tokendrift: scan failed: ${(err as Error).message}\n`);
    return 2;
  }

  const html = renderReport(aggregate, {
    rootDir,
    generatedAt: new Date().toISOString(),
    toolVersion: TOOL_VERSION,
  });

  try {
    await writeFile(outputPath, html, 'utf8');
    if (values.json) {
      const jsonPath = path.resolve(process.cwd(), values.json as string);
      await writeFile(jsonPath, JSON.stringify(aggregate, null, 2), 'utf8');
    }
  } catch (err) {
    process.stderr.write(`tokendrift: failed to write report: ${(err as Error).message}\n`);
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
      const payload = buildSharePayload(aggregate, rootDir, TOOL_VERSION);
      const result = await uploadReport(payload, shareBaseUrl);
      process.stdout.write(
        `\nShared: ${result.url}\n` +
          `Deletion token (save this — shown only once): ${result.deletionToken}\n`,
      );
    } catch (err) {
      // A hosting outage must never break a local scan (N3) — this is a
      // warning, not a failure; scan/threshold exit codes are unaffected.
      process.stderr.write(`tokendrift: --share upload failed: ${(err as Error).message}\n`);
    }
  }

  let exitCode = 0;

  const maxScoreDropRaw = values['max-score-drop'] as string | undefined;
  const failOnNew = Boolean(values['fail-on-new']);

  if ((maxScoreDropRaw !== undefined || failOnNew) && !values.baseline) {
    process.stderr.write(
      'tokendrift: --fail-on-new / --max-score-drop require --baseline <path>; skipping threshold checks.\n',
    );
  } else if (values.baseline) {
    const baseline = await readBaseline(path.resolve(process.cwd(), values.baseline as string));
    if (!baseline) {
      process.stderr.write(`tokendrift: could not read baseline at ${values.baseline}\n`);
      return 2;
    }

    if (maxScoreDropRaw !== undefined) {
      const maxDrop = Number(maxScoreDropRaw);
      if (Number.isNaN(maxDrop)) {
        process.stderr.write(`tokendrift: --max-score-drop must be a number, got "${maxScoreDropRaw}"\n`);
        return 2;
      }
      const drop = baseline.driftScore.score - aggregate.driftScore.score;
      if (drop > maxDrop) {
        process.stderr.write(
          `tokendrift: drift score dropped by ${drop} (max allowed: ${maxDrop})\n`,
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
        process.stderr.write(`tokendrift: ${newViolations.length} new violation(s) introduced\n`);
        exitCode = 1;
      }
    }
  }

  return exitCode;
}

main().then(
  (code) => process.exit(code),
  (err) => {
    process.stderr.write(`tokendrift: unexpected error: ${(err as Error).stack ?? err}\n`);
    process.exit(2);
  },
);
