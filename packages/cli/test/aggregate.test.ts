import assert from 'node:assert/strict';
import { test } from 'node:test';
import { aggregateResults } from '../src/aggregate.js';
import type { FileScanResult, TokenReference, Violation } from '../src/types.js';

function violation(file: string, category: 'color' | 'spacing'): Violation {
  return {
    rule: category === 'color' ? 'hardcoded-color' : 'off-scale-spacing',
    category,
    kind: category === 'color' ? 'hex' : 'px',
    file,
    line: 1,
    column: 1,
    value: 'x',
    snippet: 'x',
  };
}

function tokenRef(file: string, category: 'color' | 'spacing'): TokenReference {
  return { category, file, line: 1, column: 1, value: 'var(--x)' };
}

test('aggregateResults scores a clean repo at 100', () => {
  const fileResults: FileScanResult[] = [
    { file: 'a.css', violations: [], tokenReferences: [tokenRef('a.css', 'color')] },
  ];
  const result = aggregateResults(fileResults, 100);

  assert.equal(result.driftScore.score, 100);
  assert.equal(result.driftScore.scoreVersion, 1);
  assert.equal(result.adoption.overall.rate, 1);
});

test('aggregateResults blends adoption, density, and concentration', () => {
  const fileResults: FileScanResult[] = [
    {
      file: 'a.css',
      violations: [
        violation('a.css', 'color'),
        violation('a.css', 'color'),
        violation('a.css', 'color'),
        violation('a.css', 'spacing'),
      ],
      tokenReferences: [tokenRef('a.css', 'color')],
    },
    {
      file: 'b.css',
      violations: [violation('b.css', 'color')],
      tokenReferences: [
        tokenRef('b.css', 'spacing'),
        tokenRef('b.css', 'spacing'),
        tokenRef('b.css', 'spacing'),
      ],
    },
  ];

  const result = aggregateResults(fileResults, 200);

  // color: tokenized 1, raw 4 -> rate 0.2; spacing: tokenized 3, raw 1 -> rate 0.75
  // overall: tokenized 4, raw 5, total 9 -> rate 4/9
  assert.equal(result.adoption.color.rate, 1 / 5);
  assert.equal(result.adoption.spacing.rate, 3 / 4);
  assert.ok(Math.abs(result.adoption.overall.rate - 4 / 9) < 1e-9);

  assert.equal(result.violationsByFile['a.css'], 4);
  assert.equal(result.violationsByFile['b.css'], 1);

  // adoptionComponent = 50 * 4/9 ≈ 22.22
  // densityComponent = 30 * (1 - 25/30) ≈ 5 (5 violations / 0.2 KLOC = 25/KLOC)
  // concentrationComponent = 20 (only 2 offending files, both within top 10 -> ratio 1)
  const { breakdown } = result.driftScore;
  assert.ok(Math.abs(breakdown.adoptionComponent - 22.222222) < 0.01);
  assert.ok(Math.abs(breakdown.densityComponent - 5) < 0.01);
  assert.ok(Math.abs(breakdown.concentrationComponent - 20) < 0.01);
  assert.equal(result.driftScore.score, 47);
});

test('aggregateResults is deterministic for identical input', () => {
  const fileResults: FileScanResult[] = [
    { file: 'a.css', violations: [violation('a.css', 'color')], tokenReferences: [] },
  ];
  const first = aggregateResults(fileResults, 50);
  const second = aggregateResults(fileResults, 50);
  assert.deepEqual(first, second);
});
