import { LineIndex, resolveOverlaps, snippetAround, type RawMatch } from '../matchUtils.js';
import { PX_PER_REM } from '../spacingScale.js';
import type { SpacingKind, TokenReference, Violation } from '../types.js';
import {
  resolveSpacingScalePx,
  resolveSpacingScaleSuffixes,
  type TokenDriftConfig,
} from '../config.js';

const TAILWIND_SPACING_PREFIXES = [
  'mt', 'mr', 'mb', 'ml', 'mx', 'my', 'm',
  'pt', 'pr', 'pb', 'pl', 'px', 'py', 'p',
  'gap-x', 'gap-y', 'gap', 'space-x', 'space-y',
  'inset-x', 'inset-y', 'inset', 'top', 'right', 'bottom', 'left',
];

const SPACING_PROPERTIES = [
  'margin', 'marginTop', 'margin-top', 'marginRight', 'margin-right',
  'marginBottom', 'margin-bottom', 'marginLeft', 'margin-left',
  'padding', 'paddingTop', 'padding-top', 'paddingRight', 'padding-right',
  'paddingBottom', 'padding-bottom', 'paddingLeft', 'padding-left',
  'gap', 'rowGap', 'row-gap', 'columnGap', 'column-gap',
  'top', 'right', 'bottom', 'left', 'inset',
];

const TAILWIND_ARBITRARY_SPACING_RE = new RegExp(
  `\\b(?:${TAILWIND_SPACING_PREFIXES.join('|')})-\\[(\\d+(?:\\.\\d+)?(?:px|rem|em))\\]`,
  'g',
);

const SPACING_VALUE_RE = /(\d+(?:\.\d+)?)(px|rem|em)\b/g;

const NAMED_PROPERTY_RE = new RegExp(
  `\\b(${SPACING_PROPERTIES.join('|')})\\s*:\\s*([^;,{}\\n]+)`,
  'g',
);

const VAR_RE = /var\(\s*--[a-zA-Z0-9-_]+[^)]*\)/g;
const THEME_SPACING_RE = /theme\(\s*['"]?spacing\.[a-zA-Z0-9.\-_]+['"]?\s*\)/gi;

function buildTailwindTokenSpacingRe(suffixes: readonly string[]): RegExp {
  const escaped = suffixes.map(escapeRegExp);
  return new RegExp(
    `\\b(?:${TAILWIND_SPACING_PREFIXES.join('|')})-(?:${escaped.join('|')})\\b(?!-\\[)`,
    'g',
  );
}

// A CSS custom property *declaration* (`--space-md: 12px;`) is a token
// definition, not a usage — its value must not be flagged as drift.
const CUSTOM_PROPERTY_DECL_RE = /--[a-zA-Z0-9-]+\s*:\s*([^;]+);/g;

function findExemptRanges(content: string): Array<{ start: number; end: number }> {
  const ranges: Array<{ start: number; end: number }> = [];
  for (const m of content.matchAll(CUSTOM_PROPERTY_DECL_RE)) {
    const value = m[1]!;
    const start = m.index! + m[0].lastIndexOf(value);
    ranges.push({ start, end: start + value.length });
  }
  return ranges;
}

function toPx(num: number, unit: string): number {
  return unit === 'px' ? num : num * PX_PER_REM;
}

function isOnScale(px: number, scalePx: readonly number[]): boolean {
  return scalePx.some((s) => Math.abs(s - px) < 0.01);
}

export function detectSpacing(
  relPath: string,
  content: string,
  config: TokenDriftConfig,
): { violations: Violation[]; tokenReferences: TokenReference[] } {
  const lineIndex = new LineIndex(content);
  const scalePx = resolveSpacingScalePx(config);
  const rawMatches: RawMatch<SpacingKind>[] = [];

  for (const m of content.matchAll(TAILWIND_ARBITRARY_SPACING_RE)) {
    const start = m.index!;
    rawMatches.push({
      start,
      end: start + m[0].length,
      kind: 'tailwind-arbitrary',
      value: m[0],
      priority: 0,
    });
  }

  for (const m of content.matchAll(NAMED_PROPERTY_RE)) {
    const valueText = m[2]!;
    const valueStart = m.index! + m[0].lastIndexOf(valueText);
    for (const valueMatch of valueText.matchAll(SPACING_VALUE_RE)) {
      const num = Number(valueMatch[1]);
      const unit = valueMatch[2]! as 'px' | 'rem' | 'em';
      const px = toPx(num, unit);
      if (isOnScale(px, scalePx)) continue;
      const start = valueStart + valueMatch.index!;
      rawMatches.push({
        start,
        end: start + valueMatch[0].length,
        kind: unit,
        value: valueMatch[0],
        priority: 1,
      });
    }
  }

  const exemptRanges = findExemptRanges(content);
  const nonExempt = rawMatches.filter(
    (m) => !exemptRanges.some((r) => m.start >= r.start && m.end <= r.end),
  );

  const kept = resolveOverlaps(nonExempt);
  const violations: Violation[] = kept.map((m) => {
    const { line, column } = lineIndex.positionAt(m.start);
    return {
      rule: 'off-scale-spacing',
      category: 'spacing',
      kind: m.kind,
      file: relPath,
      line,
      column,
      value: m.value,
      snippet: snippetAround(lineIndex.lineText(content, line), column),
    };
  });

  const tokenReferences: TokenReference[] = [];
  const pushRef = (start: number, value: string) => {
    const { line, column } = lineIndex.positionAt(start);
    tokenReferences.push({ category: 'spacing', file: relPath, line, column, value });
  };

  const tailwindTokenSpacingRe = buildTailwindTokenSpacingRe(resolveSpacingScaleSuffixes(config));

  for (const m of content.matchAll(VAR_RE)) pushRef(m.index!, m[0]);
  for (const m of content.matchAll(THEME_SPACING_RE)) pushRef(m.index!, m[0]);
  for (const m of content.matchAll(tailwindTokenSpacingRe)) pushRef(m.index!, m[0]);
  for (const fnName of config.spacingTokenFunctions) {
    const re = new RegExp(`\\b${escapeRegExp(fnName)}\\(\\s*[^)]*\\)`, 'g');
    for (const m of content.matchAll(re)) pushRef(m.index!, m[0]);
  }

  return { violations, tokenReferences };
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
