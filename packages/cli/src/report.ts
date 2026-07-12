import type { ScanAggregate, Violation } from './types.js';

export interface ReportMeta {
  rootDir: string;
  generatedAt: string;
  toolVersion: string;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function scoreColor(score: number): string {
  if (score >= 80) return '#16a34a';
  if (score >= 50) return '#d97706';
  return '#dc2626';
}

function topOffenders(aggregate: ScanAggregate, limit = 10): Array<[string, number]> {
  return Object.entries(aggregate.violationsByFile)
    .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
    .slice(0, limit);
}

function renderViolationRow(v: Violation): string {
  return `<tr>
    <td class="mono">${escapeHtml(v.file)}:${v.line}</td>
    <td>${escapeHtml(v.category)}</td>
    <td>${escapeHtml(v.kind)}</td>
    <td class="mono">${escapeHtml(v.value)}</td>
    <td class="mono snippet">${escapeHtml(v.snippet)}</td>
  </tr>`;
}

function pct(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

export function renderReport(aggregate: ScanAggregate, meta: ReportMeta): string {
  const { score, breakdown } = aggregate.driftScore;
  const offenders = topOffenders(aggregate);
  const offendersViolationCount = offenders.reduce((sum, [, c]) => sum + c, 0);
  const offendersPct =
    aggregate.violations.length > 0
      ? Math.round((offendersViolationCount / aggregate.violations.length) * 100)
      : 0;

  const violationRows = aggregate.violations
    .slice(0, 500)
    .map(renderViolationRow)
    .join('\n');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>TokenDrift Report — Score ${score}/100</title>
<style>
  :root { color-scheme: light dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 2rem;
    font: 15px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    background: #fafafa; color: #1a1a1a;
  }
  @media (prefers-color-scheme: dark) {
    body { background: #16171a; color: #e6e6e6; }
    .card { background: #1f2023 !important; border-color: #2c2d31 !important; }
    th { color: #9a9ba1 !important; border-color: #2c2d31 !important; }
    td { border-color: #2c2d31 !important; }
    .muted { color: #9a9ba1 !important; }
  }
  .wrap { max-width: 960px; margin: 0 auto; }
  .card {
    background: #fff; border: 1px solid #e5e5e5; border-radius: 12px;
    padding: 1.5rem; margin-bottom: 1.5rem;
  }
  .hero { display: flex; align-items: center; gap: 2rem; flex-wrap: wrap; }
  .score {
    font-size: 4rem; font-weight: 700; line-height: 1;
    color: ${scoreColor(score)};
  }
  .score-label { font-size: 0.9rem; text-transform: uppercase; letter-spacing: 0.05em; }
  .muted { color: #666; }
  h1 { font-size: 1.1rem; margin: 0 0 0.25rem; }
  h2 { font-size: 1rem; margin: 0 0 1rem; }
  table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
  th, td { text-align: left; padding: 0.5rem 0.6rem; border-bottom: 1px solid #eee; }
  th { color: #666; font-weight: 600; font-size: 0.75rem; text-transform: uppercase; }
  .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.8rem; }
  .snippet { max-width: 420px; overflow-x: auto; white-space: pre; }
  .breakdown { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; }
  .metric { font-size: 1.5rem; font-weight: 600; }
  footer { text-align: center; font-size: 0.8rem; margin-top: 2rem; }
</style>
</head>
<body>
<div class="wrap">

  <div class="card hero">
    <div>
      <div class="score">${score}</div>
      <div class="score-label muted">Drift Score / 100</div>
    </div>
    <div>
      <h1>${escapeHtml(meta.rootDir)}</h1>
      <div class="muted">Generated ${escapeHtml(meta.generatedAt)} · TokenDrift ${escapeHtml(meta.toolVersion)} · scoreVersion ${aggregate.driftScore.scoreVersion}</div>
      <div class="muted">${aggregate.filesScanned} files scanned · ${aggregate.linesScanned} lines · ${aggregate.violations.length} violations</div>
      ${
        offenders.length > 0
          ? `<div class="muted">Fix these ${offenders.length} files to eliminate ${offendersPct}% of drift</div>`
          : ''
      }
    </div>
  </div>

  <div class="card">
    <h2>Score breakdown</h2>
    <div class="breakdown">
      <div>
        <div class="metric">${pct(aggregate.adoption.overall.rate)}</div>
        <div class="muted">Token adoption (color ${pct(aggregate.adoption.color.rate)}, spacing ${pct(aggregate.adoption.spacing.rate)})</div>
      </div>
      <div>
        <div class="metric">${breakdown.densityComponent.toFixed(1)} / 30</div>
        <div class="muted">Violation density</div>
      </div>
      <div>
        <div class="metric">${breakdown.concentrationComponent.toFixed(1)} / 20</div>
        <div class="muted">Violation concentration</div>
      </div>
    </div>
  </div>

  ${
    offenders.length > 0
      ? `<div class="card">
    <h2>Top offending files</h2>
    <table>
      <thead><tr><th>File</th><th>Violations</th></tr></thead>
      <tbody>
        ${offenders
          .map(([file, count]) => `<tr><td class="mono">${escapeHtml(file)}</td><td>${count}</td></tr>`)
          .join('\n')}
      </tbody>
    </table>
  </div>`
      : ''
  }

  <div class="card">
    <h2>Violations${aggregate.violations.length > 500 ? ` (showing first 500 of ${aggregate.violations.length})` : ''}</h2>
    <table>
      <thead><tr><th>Location</th><th>Category</th><th>Kind</th><th>Value</th><th>Snippet</th></tr></thead>
      <tbody>
        ${violationRows}
      </tbody>
    </table>
  </div>

  <footer class="muted">Generated by <strong>tokendrift</strong> — usetokendrift.com</footer>
</div>
</body>
</html>
`;
}
