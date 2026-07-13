import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { loadTailwindTheme } from './tailwindConfig.js';
import { loadTokenJsonTheme } from './tokenJson.js';
import { DEFAULT_CONFIG, type TokenDriftConfig } from './config.js';

// Split out from config.ts on purpose: this file does real filesystem
// walking (tokendrift.config.js, tailwind.config.*, token JSON discovery),
// which only the CLI itself needs. Bundlers that trace dynamic fs access
// (e.g. Next.js/Turbopack's Node File Trace) choke on it if it's reachable
// from a serverless function that only wants the pure DEFAULT_CONFIG/types
// in config.ts — found this the hard way wiring the PR-check feature.

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
