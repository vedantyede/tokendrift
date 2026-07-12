export interface RawMatch<TKind extends string> {
  start: number;
  end: number;
  kind: TKind;
  value: string;
  /** Lower priority wins when ranges overlap (0 = highest priority). */
  priority: number;
}

/**
 * Resolves overlapping matches (e.g. a bare hex code that's also inside a
 * Tailwind arbitrary-value bracket) by keeping the highest-priority match
 * for any given span and discarding matches fully or partially covered by
 * an already-kept, higher-priority match.
 */
export function resolveOverlaps<TKind extends string>(
  matches: RawMatch<TKind>[],
): RawMatch<TKind>[] {
  const sorted = [...matches].sort((a, b) =>
    a.start !== b.start ? a.start - b.start : a.priority - b.priority,
  );
  const kept: RawMatch<TKind>[] = [];
  for (const candidate of sorted) {
    const overlaps = kept.some(
      (k) => candidate.start < k.end && candidate.end > k.start,
    );
    if (!overlaps) kept.push(candidate);
  }
  kept.sort((a, b) => a.start - b.start);
  return kept;
}

export class LineIndex {
  private lineStarts: number[];

  constructor(content: string) {
    this.lineStarts = [0];
    for (let i = 0; i < content.length; i++) {
      if (content[i] === '\n') this.lineStarts.push(i + 1);
    }
  }

  /** Converts a 0-based character offset into a 1-based { line, column }. */
  positionAt(offset: number): { line: number; column: number } {
    let low = 0;
    let high = this.lineStarts.length - 1;
    while (low < high) {
      const mid = Math.ceil((low + high) / 2);
      if (this.lineStarts[mid]! <= offset) low = mid;
      else high = mid - 1;
    }
    const lineStart = this.lineStarts[low]!;
    return { line: low + 1, column: offset - lineStart + 1 };
  }

  lineText(content: string, line: number): string {
    const start = this.lineStarts[line - 1] ?? 0;
    const end = this.lineStarts[line] ?? content.length;
    return content.slice(start, end).replace(/\r?\n$/, '');
  }
}

export function snippetAround(lineText: string, column: number, radius = 40): string {
  const leadingWs = lineText.length - lineText.trimStart().length;
  const trimmed = lineText.trim();
  if (trimmed.length <= radius * 2) return trimmed;
  const idxInTrimmed = Math.max(0, column - 1 - leadingWs);
  const start = Math.max(0, idxInTrimmed - radius);
  const end = Math.min(trimmed.length, idxInTrimmed + radius);
  return (start > 0 ? '…' : '') + trimmed.slice(start, end) + (end < trimmed.length ? '…' : '');
}
