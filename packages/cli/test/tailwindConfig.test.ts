import assert from 'node:assert/strict';
import { test } from 'node:test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadTailwindTheme } from '../src/tailwindConfig.js';
import { DEFAULT_SPACING_SCALE_PX, TAILWIND_SPACING_SUFFIXES } from '../src/spacingScale.js';

const here = path.dirname(fileURLToPath(import.meta.url));

test('loadTailwindTheme merges theme.extend on top of Tailwind defaults', async () => {
  const rootDir = path.join(here, 'fixtures/tailwind-config-extend');
  const theme = await loadTailwindTheme(rootDir);

  assert.ok(theme.spacingScalePx);
  // Default scale is preserved...
  for (const px of DEFAULT_SPACING_SCALE_PX) {
    assert.ok(theme.spacingScalePx!.includes(px), `expected default ${px}px to be preserved`);
  }
  // ...plus the extended values (18 -> 4.5rem = 72px, sm -> 8px already on default scale).
  assert.ok(theme.spacingScalePx!.includes(72));

  assert.ok(theme.spacingScaleSuffixes);
  for (const suffix of TAILWIND_SPACING_SUFFIXES) {
    assert.ok(theme.spacingScaleSuffixes!.includes(suffix));
  }
  assert.ok(theme.spacingScaleSuffixes!.includes('18'));
  assert.ok(theme.spacingScaleSuffixes!.includes('sm'));

  assert.deepEqual(theme.colorPaletteWords, ['brand']);
});

test('loadTailwindTheme replaces the base scale when theme.spacing is set directly', async () => {
  const rootDir = path.join(here, 'fixtures/tailwind-config-replace');
  const theme = await loadTailwindTheme(rootDir);

  // Base spacing fully replaces the default scale: 4 (a default value) is gone.
  assert.deepEqual(theme.spacingScalePx, [0, 8, 16, 32]);
  assert.deepEqual(new Set(theme.spacingScaleSuffixes), new Set(['none', 'sm', 'md', 'lg']));
  assert.deepEqual(theme.colorPaletteWords, ['brand']);
});

test('loadTailwindTheme returns an empty theme when no config is present', async () => {
  const rootDir = path.join(here, 'fixtures/colors');
  const theme = await loadTailwindTheme(rootDir);

  assert.equal(theme.spacingScalePx, null);
  assert.equal(theme.spacingScaleSuffixes, null);
  assert.deepEqual(theme.colorPaletteWords, []);
});
