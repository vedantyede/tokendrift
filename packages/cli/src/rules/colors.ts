import { LineIndex, resolveOverlaps, snippetAround, type RawMatch } from '../matchUtils.js';
import { CSS_NAMED_COLORS } from '../colorPalette.js';
import type { ColorKind, TokenReference, Violation } from '../types.js';
import { resolveColorPaletteWords, type TokenDriftConfig } from '../config.js';

const TAILWIND_COLOR_PREFIXES = [
  'bg', 'text', 'border', 'ring-offset', 'ring', 'from', 'via', 'to', 'fill',
  'stroke', 'shadow', 'outline', 'decoration', 'divide', 'accent', 'caret',
  'placeholder',
];

const COLOR_PROPERTIES = [
  'background-color', 'backgroundColor', 'background', 'color',
  'border-top-color', 'borderTopColor', 'border-right-color', 'borderRightColor',
  'border-bottom-color', 'borderBottomColor', 'border-left-color', 'borderLeftColor',
  'border-color', 'borderColor', 'border-top', 'border-right', 'border-bottom',
  'border-left', 'border',
  'outline-color', 'outlineColor', 'outline',
  'text-decoration-color', 'textDecorationColor',
  'box-shadow', 'boxShadow', 'caret-color', 'caretColor',
  'column-rule-color', 'columnRuleColor', 'fill', 'stroke',
];

const TAILWIND_ARBITRARY_COLOR_RE = new RegExp(
  `\\b(?:${TAILWIND_COLOR_PREFIXES.join('|')})-\\[(#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})|rgba?\\([^\\]]+\\)|hsla?\\([^\\]]+\\))\\]`,
  'g',
);

const HEX_RE = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})(?![0-9a-fA-F])/g;

const FUNCTIONAL_RE = /\b(rgba?|hsla?)\(\s*[^)]+?\)/gi;

const NAMED_PROPERTY_RE = new RegExp(
  `\\b(${COLOR_PROPERTIES.join('|')})\\s*:\\s*([^;,{}\\n]+)`,
  'g',
);

const VAR_RE = /var\(\s*--[a-zA-Z0-9-_]+[^)]*\)/g;
const THEME_COLOR_RE = /theme\(\s*['"]?colou?rs?\.[a-zA-Z0-9.\-_]+['"]?\s*\)/gi;

function buildTailwindTokenColorRe(paletteWords: readonly string[]): RegExp {
  return new RegExp(
    `\\b(?:${TAILWIND_COLOR_PREFIXES.join('|')})-(?:${paletteWords.join('|')})(?:-\\d{2,3})?\\b(?!-\\[)`,
    'g',
  );
}

// A CSS custom property *declaration* (`--color-primary: #3B82F6;`) is a
// token definition, not a usage — its value must not be flagged as drift.
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

export function detectColors(
  relPath: string,
  content: string,
  config: TokenDriftConfig,
): { violations: Violation[]; tokenReferences: TokenReference[] } {
  const lineIndex = new LineIndex(content);
  const rawMatches: RawMatch<ColorKind>[] = [];

  for (const m of content.matchAll(TAILWIND_ARBITRARY_COLOR_RE)) {
    const start = m.index!;
    rawMatches.push({
      start,
      end: start + m[0].length,
      kind: 'tailwind-arbitrary',
      value: m[0],
      priority: 0,
    });
  }

  for (const m of content.matchAll(HEX_RE)) {
    const start = m.index!;
    rawMatches.push({ start, end: start + m[0].length, kind: 'hex', value: m[0], priority: 1 });
  }

  for (const m of content.matchAll(FUNCTIONAL_RE)) {
    const kind: ColorKind = m[1]!.toLowerCase().startsWith('rgb') ? 'rgb' : 'hsl';
    const start = m.index!;
    rawMatches.push({ start, end: start + m[0].length, kind, value: m[0], priority: 1 });
  }

  for (const m of content.matchAll(NAMED_PROPERTY_RE)) {
    const valueText = m[2]!;
    const valueStart = m.index! + m[0].lastIndexOf(valueText);
    for (const word of valueText.matchAll(/[A-Za-z]+/g)) {
      const candidate = word[0].toLowerCase();
      if (!CSS_NAMED_COLORS.has(candidate)) continue;
      const start = valueStart + word.index!;
      rawMatches.push({ start, end: start + word[0].length, kind: 'named', value: word[0], priority: 2 });
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
      rule: 'hardcoded-color',
      category: 'color',
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
    tokenReferences.push({ category: 'color', file: relPath, line, column, value });
  };

  const tailwindTokenColorRe = buildTailwindTokenColorRe(resolveColorPaletteWords(config));

  for (const m of content.matchAll(VAR_RE)) pushRef(m.index!, m[0]);
  for (const m of content.matchAll(THEME_COLOR_RE)) pushRef(m.index!, m[0]);
  for (const m of content.matchAll(tailwindTokenColorRe)) pushRef(m.index!, m[0]);
  for (const fnName of config.colorTokenFunctions) {
    const re = new RegExp(`\\b${escapeRegExp(fnName)}\\(\\s*[^)]*\\)`, 'g');
    for (const m of content.matchAll(re)) pushRef(m.index!, m[0]);
  }

  return { violations, tokenReferences };
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
