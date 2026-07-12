import type {
  AdoptionSummary,
  CategoryAdoption,
  DriftScoreResult,
  FileScanResult,
  ScanAggregate,
  TokenReference,
  Violation,
} from './types.js';

export const SCORE_VERSION = 1;

// Violations per thousand lines of code at which the density component
// bottoms out at 0. Chosen so a handful of stray hardcoded values in an
// otherwise healthy file doesn't tank the score, while a file that's
// consistently raw values does.
const DENSITY_CEILING_PER_KLOC = 30;

// How many of the worst-offending files count toward "concentration" —
// mirrors the report's "fix these N files" framing (F8).
const TOP_OFFENDER_FILE_COUNT = 10;

function computeCategoryAdoption(tokenized: number, raw: number): CategoryAdoption {
  const total = tokenized + raw;
  // No usages of this category at all means no drift is possible: treat as
  // fully adopted rather than penalizing files that simply never touch it.
  const rate = total === 0 ? 1 : tokenized / total;
  return { tokenized, raw, rate };
}

function computeAdoption(
  tokenReferences: TokenReference[],
  violations: Violation[],
): AdoptionSummary {
  const colorTokenized = tokenReferences.filter((r) => r.category === 'color').length;
  const colorRaw = violations.filter((v) => v.category === 'color').length;
  const spacingTokenized = tokenReferences.filter((r) => r.category === 'spacing').length;
  const spacingRaw = violations.filter((v) => v.category === 'spacing').length;

  return {
    color: computeCategoryAdoption(colorTokenized, colorRaw),
    spacing: computeCategoryAdoption(spacingTokenized, spacingRaw),
    overall: computeCategoryAdoption(colorTokenized + spacingTokenized, colorRaw + spacingRaw),
  };
}

function computeViolationsByFile(violations: Violation[]): Record<string, number> {
  const byFile: Record<string, number> = {};
  for (const v of violations) {
    byFile[v.file] = (byFile[v.file] ?? 0) + 1;
  }
  return byFile;
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

function computeDriftScore(
  violations: Violation[],
  adoption: AdoptionSummary,
  linesScanned: number,
  violationsByFile: Record<string, number>,
): DriftScoreResult {
  const adoptionComponent = 50 * adoption.overall.rate;

  const density = linesScanned > 0 ? violations.length / (linesScanned / 1000) : 0;
  const densityComponent = 30 * clamp01(1 - density / DENSITY_CEILING_PER_KLOC);

  const totalViolations = violations.length;
  let concentrationRatio = 1;
  if (totalViolations > 0) {
    const counts = Object.values(violationsByFile).sort((a, b) => b - a);
    const topSum = counts.slice(0, TOP_OFFENDER_FILE_COUNT).reduce((a, b) => a + b, 0);
    concentrationRatio = topSum / totalViolations;
  }
  const concentrationComponent = 20 * concentrationRatio;

  const score = Math.round(
    clamp01((adoptionComponent + densityComponent + concentrationComponent) / 100) * 100,
  );

  return {
    score,
    scoreVersion: SCORE_VERSION,
    breakdown: { adoptionComponent, densityComponent, concentrationComponent },
  };
}

export function aggregateResults(
  fileResults: FileScanResult[],
  linesScanned: number,
): ScanAggregate {
  const violations = fileResults.flatMap((f) => f.violations);
  const tokenReferences = fileResults.flatMap((f) => f.tokenReferences);
  const adoption = computeAdoption(tokenReferences, violations);
  const violationsByFile = computeViolationsByFile(violations);

  return {
    filesScanned: fileResults.length,
    linesScanned,
    violations,
    adoption,
    violationsByFile,
    driftScore: computeDriftScore(violations, adoption, linesScanned, violationsByFile),
  };
}
