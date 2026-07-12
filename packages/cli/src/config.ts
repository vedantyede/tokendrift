import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { DEFAULT_SPACING_SCALE_PX, TAILWIND_SPACING_SUFFIXES } from './spacingScale.js';
import { TAILWIND_PALETTE_WORDS } from './colorPalette.js';
import { loadTailwindTheme } from './tailwindConfig.js';
import { loadTokenJsonTheme } from './tokenJson.js';

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

const CONFIG_FILENAMES = [
  'tokendrift.config.js',
  'tokendrift.config.mjs',
  'tokendrift.config.cjs',
  'tokendrift.config.json',
];

function mergeConfig(
  base: TokenDriftConfig,
  override: Partial<TokenDriftConfig>,
): TokenDriftConfig {
  return {
    ignore: [...base.ignore, ...(override.ignore ?? [])],
    spacingScale: { ...base.spacingScale, ...(override.spacingScale ?? {}) },
    colorTokenFunctions: [
      ...base.colorTokenFunctions,
      ...(override.colorTokenFunctions ?? []),
    ],
    spacingTokenFunctions: [
      ...base.spacingTokenFunctions,
      ...(override.spacingTokenFunctions ?? []),
    ],
    colorPaletteWords: [...base.colorPaletteWords, ...(override.colorPaletteWords ?? [])],
    tokenSources: [...base.tokenSources, ...(override.tokenSources ?? [])],
    detectedSpacingScalePx: base.detectedSpacingScalePx,
    detectedSpacingScaleSuffixes: base.detectedSpacingScaleSuffixes,
    detectedColorPaletteWords: base.detectedColorPaletteWords,
  };
}

async function loadUserConfig(rootDir: string): Promise<TokenDriftConfig> {
  for (const filename of CONFIG_FILENAMES) {
    const fullPath = path.join(rootDir, filename);
    if (!existsSync(fullPath)) continue;

    if (filename.endsWith('.json')) {
      const raw = await readFile(fullPath, 'utf8');
      const parsed = JSON.parse(raw) as Partial<TokenDriftConfig>;
      return mergeConfig(DEFAULT_CONFIG, parsed);
    }

    const mod: unknown = await import(pathToFileURL(fullPath).href);
    const exported =
      mod && typeof mod === 'object' && 'default' in mod
        ? (mod as { default: unknown }).default
        : mod;
    return mergeConfig(DEFAULT_CONFIG, exported as Partial<TokenDriftConfig>);
  }

  return DEFAULT_CONFIG;
}

function mergeSpacingScalePx(a: number[] | null, b: number[] | null): number[] | null {
  if (!a && !b) return null;
  return [...new Set([...(a ?? []), ...(b ?? [])])].sort((x, y) => x - y);
}

export async function loadConfig(rootDir: string): Promise<TokenDriftConfig> {
  // tokenSources (for token-JSON detection) can only be known once the user
  // config is loaded, so this step can't run in parallel with it.
  const config = await loadUserConfig(rootDir);
  const [tailwindTheme, tokenTheme] = await Promise.all([
    loadTailwindTheme(rootDir),
    loadTokenJsonTheme(rootDir, config.tokenSources),
  ]);
  return {
    ...config,
    detectedSpacingScalePx: mergeSpacingScalePx(tailwindTheme.spacingScalePx, tokenTheme.spacingScalePx),
    detectedSpacingScaleSuffixes: tailwindTheme.spacingScaleSuffixes,
    detectedColorPaletteWords: [
      ...new Set([...tailwindTheme.colorPaletteWords, ...tokenTheme.colorPaletteWords]),
    ],
  };
}

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
