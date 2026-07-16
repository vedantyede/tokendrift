import type { ScoreHistoryEntry } from '@/lib/scoreHistoryStore';

const WIDTH = 90;
const HEIGHT = 28;
const PAD = 4;

// Drift Score has a fixed, meaningful 0-100 range, so the y-axis is pinned to
// that domain rather than autoscaled per repo — autoscaling would make a
// steady 80-82 wobble look as dramatic as a 20-80 swing.
function yFor(score: number): number {
  const clamped = Math.max(0, Math.min(100, score));
  return HEIGHT - PAD - (clamped / 100) * (HEIGHT - PAD * 2);
}

export function ScoreSparkline({ history }: { history: ScoreHistoryEntry[] }) {
  if (history.length === 0) {
    return <span style={{ color: 'var(--ink-soft)' }}>—</span>;
  }

  const title = history.map((h) => h.score).join(' → ');

  if (history.length === 1) {
    const y = yFor(history[0].score);
    return (
      <svg width={WIDTH} height={HEIGHT} role="img" aria-label={`Score trend: ${title}`}>
        <title>{title}</title>
        <circle cx={WIDTH / 2} cy={y} r={4} fill="var(--token)" stroke="var(--paper-raised)" strokeWidth={2} />
      </svg>
    );
  }

  const step = (WIDTH - PAD * 2) / (history.length - 1);
  const points = history.map((h, i) => [PAD + i * step, yFor(h.score)] as const);
  const path = points.map(([x, y]) => `${x},${y}`).join(' ');
  const [lastX, lastY] = points[points.length - 1];

  return (
    <svg width={WIDTH} height={HEIGHT} role="img" aria-label={`Score trend: ${title}`}>
      <title>{title}</title>
      <polyline
        points={path}
        fill="none"
        stroke="var(--ink-soft)"
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx={lastX} cy={lastY} r={4} fill="var(--token)" stroke="var(--paper-raised)" strokeWidth={2} />
    </svg>
  );
}
