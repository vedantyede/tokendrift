import { DEFAULT_SPACING_SCALE_PX, TAILWIND_SPACING_SUFFIXES } from './spacingScale';
import { TAILWIND_PALETTE_WORDS } from './colorPalette';

export interface SpacingScaleConfig {
  /** Explicit list of on-scale values, in px. Overrides `base` when set. */
  scale?: number[];
  /** Generate an on-scale set as multiples of `base` px, up to `max` px. */
  base?: number;
  max?: number;
}

export interface TokenDriftConfig {
  /** Extra glob-ish ignore patterns, merged with the built-in defaults and .gitignore. */
  ignore: string[];
  spacingScale: SpacingScaleConfig;
  /**
   * Extra identifiers/prefixes treated as "tokenized" color references beyond
   * var(--x), theme(...) and non-arbitrary Tailwind color utilities.
   */
  colorTokenFunctions: string[];
  /**
   * Extra identifiers/prefixes treated as "tokenized" spacing references
   * beyond var(--x), theme(...) and non-arbitrary Tailwind spacing utilities.
   */
  spacingTokenFunctions: string[];
  /**
   * Extra Tailwind color-palette words (e.g. "brand") beyond Tailwind's
   * defaults, for projects whose custom palette can't be auto-detected
   * (e.g. a `tailwind.config.ts`).
   */
  colorPaletteWords: string[];
  /**
   * Extra W3C design-token JSON file paths (relative to the scan root) to
   * auto-detect, beyond the conventional tokens.json / design-tokens.json.
   */
  tokenSources: string[];
  /** Populated by auto-detecting tailwind.config.{js,cjs,mjs}; not user-settable. */
  detectedSpacingScalePx: number[] | null;
  /** Populated by auto-detecting tailwind.config.{js,cjs,mjs}; not user-settable. */
  detectedSpacingScaleSuffixes: string[] | null;
  /** Populated by auto-detecting tailwind.config.{js,cjs,mjs} and token JSON; not user-settable. */
  detectedColorPaletteWords: string[];
}

export const DEFAULT_CONFIG: TokenDriftConfig = {
  ignore: [],
  spacingScale: {},
  colorTokenFunctions: [],
  spacingTokenFunctions: [],
  colorPaletteWords: [],
  tokenSources: [],
  detectedSpacingScalePx: null,
  detectedSpacingScaleSuffixes: null,
  detectedColorPaletteWords: [],
};

/** Resolves the effective on-scale spacing values (in px) for a given config. */
export function resolveSpacingScalePx(config: TokenDriftConfig): number[] {
  const { scale, base, max } = config.spacingScale;
  if (scale && scale.length > 0) {
    return [...scale].sort((a, b) => a - b);
  }
  if (base && base > 0) {
    const ceiling = max ?? base * 32;
    const generated: number[] = [];
    for (let v = 0; v <= ceiling; v += base) generated.push(v);
    return generated;
  }
  if (config.detectedSpacingScalePx && config.detectedSpacingScalePx.length > 0) {
    return config.detectedSpacingScalePx;
  }
  return [...DEFAULT_SPACING_SCALE_PX];
}

/** Resolves the effective set of Tailwind spacing-utility suffixes for a given config. */
export function resolveSpacingScaleSuffixes(config: TokenDriftConfig): string[] {
  if (config.detectedSpacingScaleSuffixes && config.detectedSpacingScaleSuffixes.length > 0) {
    return config.detectedSpacingScaleSuffixes;
  }
  return [...TAILWIND_SPACING_SUFFIXES];
}

/** Resolves the effective set of Tailwind color-palette words for a given config. */
export function resolveColorPaletteWords(config: TokenDriftConfig): string[] {
  return [
    ...new Set([
      ...TAILWIND_PALETTE_WORDS,
      ...config.detectedColorPaletteWords,
      ...config.colorPaletteWords,
    ]),
  ];
}
