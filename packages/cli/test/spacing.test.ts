import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { detectSpacing } from '../src/rules/spacing.js';
import { DEFAULT_CONFIG } from '../src/config.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const fixtureDir = path.join(here, 'fixtures/spacing');
const inputDir = path.join(fixtureDir, 'input');

test('detectSpacing matches fixture expectations', async () => {
  const expected = JSON.parse(await readFile(path.join(fixtureDir, 'expected.json'), 'utf8'));
  const files = await readdir(inputDir);
  assert.deepEqual(new Set(files), new Set(Object.keys(expected)));

  for (const file of files) {
    const content = await readFile(path.join(inputDir, file), 'utf8');
    const result = detectSpacing(file, content, DEFAULT_CONFIG);
    assert.deepEqual(result, expected[file], `mismatch for fixture file ${file}`);
  }
});
