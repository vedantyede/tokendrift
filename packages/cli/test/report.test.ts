import assert from 'node:assert/strict';
import { test } from 'node:test';
import { aggregateResults } from '../src/aggregate.js';
import { renderReport } from '../src/report.js';
import type { FileScanResult } from '../src/types.js';

test('renderReport produces self-contained HTML and escapes source content', () => {
  const fileResults: FileScanResult[] = [
    {
      file: 'a.css',
      violations: [
        {
          rule: 'hardcoded-color',
          category: 'color',
          kind: 'hex',
          file: 'a.css',
          line: 1,
          column: 1,
          value: '#fff',
          snippet: '<script>alert(1)</script> color: #fff;',
        },
      ],
      tokenReferences: [],
    },
  ];
  const aggregate = aggregateResults(fileResults, 10);
  const html = renderReport(aggregate, {
    rootDir: '<img src=x onerror=alert(1)>',
    generatedAt: '2026-07-12T00:00:00.000Z',
    toolVersion: '0.1.0',
  });

  assert.ok(html.startsWith('<!doctype html>'));
  assert.ok(html.includes(`${aggregate.driftScore.score}`));
  assert.ok(!html.includes('<script>alert(1)</script>'));
  assert.ok(!html.includes('<img src=x onerror=alert(1)>'));
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt;'));
});
