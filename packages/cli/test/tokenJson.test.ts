import assert from 'node:assert/strict';
import { test } from 'node:test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadTokenJsonTheme } from '../src/tokenJson.js';

const here = path.dirname(fileURLToPath(import.meta.url));

test('loadTokenJsonTheme extracts dimension tokens as an on-scale spacing set', async () => {
  const rootDir = path.join(here, 'fixtures/token-json');
  const theme = await loadTokenJsonTheme(rootDir, []);

  // sm: 8px, md: 1rem -> 16px, lg: alias to md -> 16px (deduped), xl: 2.25rem -> 36px
  assert.deepEqual(theme.spacingScalePx, [8, 16, 36]);
});

test('loadTokenJsonTheme derives color palette words from color-typed token paths', async () => {
  const rootDir = path.join(here, 'fixtures/token-json');
  const theme = await loadTokenJsonTheme(rootDir, []);

  assert.deepEqual(new Set(theme.colorPaletteWords), new Set(['brand', 'accent']));
});

test('loadTokenJsonTheme resolves aliases and tolerates alias cycles without hanging', async () => {
  const rootDir = path.join(here, 'fixtures/token-json');
  const theme = await loadTokenJsonTheme(rootDir, []);
  // The cyclic alias-cycle.a/b tokens should simply be excluded, not crash or hang.
  assert.ok(theme.spacingScalePx);
  assert.equal(theme.spacingScalePx!.length, 3);
});

test('loadTokenJsonTheme honors extra tokenSources and merges with the default file', async () => {
  const rootDir = path.join(here, 'fixtures/token-json');
  const theme = await loadTokenJsonTheme(rootDir, ['extra.tokens.json']);

  assert.ok(theme.spacingScalePx!.includes(8));
  assert.ok(theme.spacingScalePx!.includes(24));
  assert.ok(theme.colorPaletteWords.includes('brand'));
  assert.ok(theme.colorPaletteWords.includes('success'));
});

test('loadTokenJsonTheme returns an empty theme when no token file is present', async () => {
  const rootDir = path.join(here, 'fixtures/colors');
  const theme = await loadTokenJsonTheme(rootDir, []);
  assert.equal(theme.spacingScalePx, null);
  assert.deepEqual(theme.colorPaletteWords, []);
});
