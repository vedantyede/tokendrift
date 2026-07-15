import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

export interface DetectedTokenTheme {
  /** On-scale spacing values in px, derived from `dimension`-typed tokens. */
  spacingScalePx: number[] | null;
  /**
   * Color-family words derived from `color`-typed token paths (e.g. "brand"
   * from `color.brand.500`) — useful when a Tailwind palette is generated
   * from the same token file and shares its naming.
   */
  colorPaletteWords: string[];
}

const EMPTY_THEME: DetectedTokenTheme = { spacingScalePx: null, colorPaletteWords: [] };

// Conventional filenames for a W3C Design Tokens Community Group format
// token file. Additional paths can be supplied via `tokenSources` in
// tokensdrift.config.js.
const DEFAULT_TOKEN_FILENAMES = ['tokens.json', 'design-tokens.json', 'design.tokens.json'];

interface FlatToken {
  path: string[];
  type: string | undefined;
  rawValue: unknown;
}

function isTokenNode(node: Record<string, unknown>): boolean {
  return '$value' in node;
}

/** Recursively walks a W3C token tree, flattening `$value` leaves with their inherited `$type`. */
function collectTokens(
  node: unknown,
  pathSoFar: string[],
  inheritedType: string | undefined,
  out: FlatToken[],
): void {
  if (!node || typeof node !== 'object' || Array.isArray(node)) return;
  const obj = node as Record<string, unknown>;
  const effectiveType = typeof obj.$type === 'string' ? obj.$type : inheritedType;

  if (isTokenNode(obj)) {
    out.push({ path: pathSoFar, type: effectiveType, rawValue: obj.$value });
    return;
  }

  for (const [key, value] of Object.entries(obj)) {
    if (key.startsWith('$')) continue;
    collectTokens(value, [...pathSoFar, key], effectiveType, out);
  }
}

/** Resolves `{alias.path}` references against the flattened token set, with cycle protection. */
function resolveAliases(tokens: FlatToken[]): Map<string, { type: string | undefined; value: unknown }> {
  const byPath = new Map(tokens.map((t) => [t.path.join('.'), t]));
  const resolved = new Map<string, { type: string | undefined; value: unknown }>();

  function resolve(pathKey: string, seen: Set<string>): { type: string | undefined; value: unknown } | null {
    if (resolved.has(pathKey)) return resolved.get(pathKey)!;
    if (seen.has(pathKey)) return null;
    const token = byPath.get(pathKey);
    if (!token) return null;
    seen.add(pathKey);

    let value = token.rawValue;
    if (typeof value === 'string') {
      const aliasMatch = /^\{([^}]+)\}$/.exec(value.trim());
      if (aliasMatch) {
        const target = resolve(aliasMatch[1]!.trim(), seen);
        if (target) value = target.value;
      }
    }
    const result = { type: token.type, value };
    resolved.set(pathKey, result);
    return result;
  }

  for (const t of tokens) resolve(t.path.join('.'), new Set());
  return resolved;
}

/** Parses a CSS length string (e.g. "1.5rem", "12px") into px. Returns null if unparseable. */
function cssLengthToPx(value: unknown): number | null {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string') return null;
  const match = /^(-?\d+(?:\.\d+)?)(px|rem|em)?$/.exec(value.trim());
  if (!match) return null;
  const num = Number(match[1]);
  const unit = match[2];
  if (unit === 'rem' || unit === 'em') return num * 16;
  return num;
}

/** Derives a Tailwind-style palette word from a color token path, e.g. ["color","brand","500"] -> "brand". */
function deriveColorPaletteWord(tokenPath: string[]): string | null {
  const last = tokenPath[tokenPath.length - 1];
  if (!last) return null;
  const isShadeLike = /^\d+$/.test(last) || last.toUpperCase() === 'DEFAULT';
  const word = isShadeLike ? tokenPath[tokenPath.length - 2] : last;
  return word && /^[a-zA-Z][a-zA-Z0-9]*$/.test(word) ? word : null;
}

async function loadOneTokenFile(filePath: string): Promise<DetectedTokenTheme> {
  let raw: string;
  try {
    raw = await readFile(filePath, 'utf8');
  } catch {
    return EMPTY_THEME;
  }

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return EMPTY_THEME;
  }

  const flat: FlatToken[] = [];
  collectTokens(json, [], undefined, flat);
  const resolved = resolveAliases(flat);

  const spacingPx = new Set<number>();
  const colorWords = new Set<string>();

  for (const token of flat) {
    const r = resolved.get(token.path.join('.'));
    if (!r) continue;
    if (r.type === 'dimension') {
      const px = cssLengthToPx(r.value);
      if (px !== null) spacingPx.add(px);
    } else if (r.type === 'color') {
      const word = deriveColorPaletteWord(token.path);
      if (word) colorWords.add(word);
    }
  }

  return {
    spacingScalePx: spacingPx.size > 0 ? [...spacingPx].sort((a, b) => a - b) : null,
    colorPaletteWords: [...colorWords],
  };
}

/**
 * Auto-detects design tokens from W3C Design Tokens Community Group format
 * JSON files: conventional filenames in `rootDir`, plus any `tokenSources`
 * paths from tokensdrift.config.js. Results from multiple files are merged.
 */
export async function loadTokenJsonTheme(
  rootDir: string,
  extraSources: readonly string[],
): Promise<DetectedTokenTheme> {
  const candidates = [...DEFAULT_TOKEN_FILENAMES, ...extraSources];
  const seenPaths = new Set<string>();
  const spacingPx = new Set<number>();
  const colorWords = new Set<string>();
  let foundAny = false;

  for (const rel of candidates) {
    const fullPath = path.resolve(rootDir, rel);
    if (seenPaths.has(fullPath)) continue;
    seenPaths.add(fullPath);
    if (!existsSync(fullPath)) continue;

    const theme = await loadOneTokenFile(fullPath);
    if (theme.spacingScalePx) {
      foundAny = true;
      for (const px of theme.spacingScalePx) spacingPx.add(px);
    }
    if (theme.colorPaletteWords.length > 0) {
      foundAny = true;
      for (const word of theme.colorPaletteWords) colorWords.add(word);
    }
  }

  if (!foundAny) return EMPTY_THEME;
  return {
    spacingScalePx: spacingPx.size > 0 ? [...spacingPx].sort((a, b) => a - b) : null,
    colorPaletteWords: [...colorWords],
  };
}
