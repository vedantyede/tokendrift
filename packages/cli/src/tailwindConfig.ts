import { existsSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { DEFAULT_SPACING_SCALE_PX, TAILWIND_SPACING_SUFFIXES } from './spacingScale.js';

export interface DetectedTailwindTheme {
  /** On-scale spacing values in px, derived from theme.spacing / theme.extend.spacing. */
  spacingScalePx: number[] | null;
  /**
   * Spacing utility suffixes (e.g. "sm" in `p-sm`, "18" in `p-18`), derived
   * from the same config keys as spacingScalePx.
   */
  spacingScaleSuffixes: string[] | null;
  /** Extra Tailwind color-palette words (e.g. "brand") from theme.colors / theme.extend.colors. */
  colorPaletteWords: string[];
}

const EMPTY_THEME: DetectedTailwindTheme = {
  spacingScalePx: null,
  spacingScaleSuffixes: null,
  colorPaletteWords: [],
};

// Only JS/CJS/MJS configs can be safely loaded without a bundler or TS
// transpiler (the zero-dependency constraint rules both out). A
// `tailwind.config.ts` is silently skipped — auto-detection falls back to
// Tailwind's default scale/palette, still overridable via
// `tokensdrift.config.js`.
const LOADABLE_CONFIG_FILENAMES = [
  'tailwind.config.js',
  'tailwind.config.cjs',
  'tailwind.config.mjs',
];

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

function extractSpacingScalePx(spacing: unknown): number[] {
  if (!spacing || typeof spacing !== 'object') return [];
  const pxValues: number[] = [];
  for (const value of Object.values(spacing as Record<string, unknown>)) {
    const px = cssLengthToPx(value);
    if (px !== null) pxValues.push(px);
  }
  return pxValues;
}

/**
 * `theme.spacing` replaces Tailwind's default scale entirely; `theme.extend.spacing`
 * always adds to whatever base scale is in effect (default or replaced).
 * Returns null when neither is customized (caller keeps its own default).
 */
function computeSpacingScalePx(baseSpacing: unknown, extendSpacing: unknown): number[] | null {
  const extendPx = extractSpacingScalePx(extendSpacing);
  if (baseSpacing !== undefined) {
    const basePx = extractSpacingScalePx(baseSpacing);
    return [...new Set([...basePx, ...extendPx])].sort((a, b) => a - b);
  }
  if (extendPx.length > 0) {
    return [...new Set([...DEFAULT_SPACING_SCALE_PX, ...extendPx])].sort((a, b) => a - b);
  }
  return null;
}

function extractSpacingScaleKeys(spacing: unknown): string[] {
  if (!spacing || typeof spacing !== 'object') return [];
  return Object.keys(spacing as Record<string, unknown>);
}

/** Mirrors computeSpacingScalePx, but for the utility suffix (key) names. */
function computeSpacingScaleSuffixes(baseSpacing: unknown, extendSpacing: unknown): string[] | null {
  const extendKeys = extractSpacingScaleKeys(extendSpacing);
  if (baseSpacing !== undefined) {
    const baseKeys = extractSpacingScaleKeys(baseSpacing);
    return [...new Set([...baseKeys, ...extendKeys])];
  }
  if (extendKeys.length > 0) {
    return [...new Set([...TAILWIND_SPACING_SUFFIXES, ...extendKeys])];
  }
  return null;
}

function extractColorPaletteWords(colors: unknown): string[] {
  if (!colors || typeof colors !== 'object') return [];
  return Object.keys(colors as Record<string, unknown>).filter((key) => /^[a-zA-Z][a-zA-Z0-9]*$/.test(key));
}

/**
 * Auto-detects a project's spacing scale and color palette from
 * `tailwind.config.{js,cjs,mjs}`, if present. Returns an empty theme
 * (falling back to Tailwind defaults) when no loadable config is found.
 */
export async function loadTailwindTheme(rootDir: string): Promise<DetectedTailwindTheme> {
  for (const filename of LOADABLE_CONFIG_FILENAMES) {
    const fullPath = path.join(rootDir, filename);
    if (!existsSync(fullPath)) continue;

    let mod: unknown;
    try {
      mod = await import(pathToFileURL(fullPath).href);
    } catch {
      return EMPTY_THEME;
    }
    const config =
      mod && typeof mod === 'object' && 'default' in mod
        ? (mod as { default: unknown }).default
        : mod;
    if (!config || typeof config !== 'object') return EMPTY_THEME;

    const theme = (config as { theme?: unknown }).theme;
    if (!theme || typeof theme !== 'object') return EMPTY_THEME;
    const extend = (theme as { extend?: unknown }).extend;

    const baseSpacing = (theme as { spacing?: unknown }).spacing;
    const extendSpacing =
      extend && typeof extend === 'object' ? (extend as { spacing?: unknown }).spacing : undefined;
    const spacingScalePx = computeSpacingScalePx(baseSpacing, extendSpacing);
    const spacingScaleSuffixes = computeSpacingScaleSuffixes(baseSpacing, extendSpacing);

    const baseColors = (theme as { colors?: unknown }).colors;
    const extendColors =
      extend && typeof extend === 'object' ? (extend as { colors?: unknown }).colors : undefined;
    const colorPaletteWords = [
      ...new Set([...extractColorPaletteWords(baseColors), ...extractColorPaletteWords(extendColors)]),
    ];

    return { spacingScalePx, spacingScaleSuffixes, colorPaletteWords };
  }

  return EMPTY_THEME;
}
