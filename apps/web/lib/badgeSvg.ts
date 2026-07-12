const INK = '#16171c';
const GOOD = '#1f8f6f';
const WARN = '#b9891a';
const DRIFT = '#e05a2b';
const NEUTRAL = '#4a4c56';

export function scoreColor(score: number): string {
  if (score >= 80) return GOOD;
  if (score >= 50) return WARN;
  return DRIFT;
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Classic two-box "shields.io style" badge — a label box and a value box,
// widths estimated from character count (same rough heuristic shields.io
// itself uses; badges don't need pixel-perfect font metrics).
export function renderBadge(label: string, value: string, color: string): string {
  const CHAR_W = 6.5;
  const PAD = 10;
  const labelWidth = Math.round(label.length * CHAR_W) + PAD * 2;
  const valueWidth = Math.round(value.length * CHAR_W) + PAD * 2;
  const totalWidth = labelWidth + valueWidth;
  const labelEsc = escapeXml(label);
  const valueEsc = escapeXml(value);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="20" role="img" aria-label="${labelEsc}: ${valueEsc}">
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r"><rect width="${totalWidth}" height="20" rx="3" fill="#fff"/></clipPath>
  <g clip-path="url(#r)">
    <rect width="${labelWidth}" height="20" fill="${INK}"/>
    <rect x="${labelWidth}" width="${valueWidth}" height="20" fill="${color}"/>
    <rect width="${totalWidth}" height="20" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11">
    <text x="${labelWidth / 2}" y="14">${labelEsc}</text>
    <text x="${labelWidth + valueWidth / 2}" y="14">${valueEsc}</text>
  </g>
</svg>`;
}

export function renderScoreBadge(score: number | null): string {
  if (score === null) return renderBadge('tokendrift', 'no data', NEUTRAL);
  return renderBadge('tokendrift', `${score}/100`, scoreColor(score));
}
