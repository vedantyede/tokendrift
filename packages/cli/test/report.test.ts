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

test('renderReport omits the email capture form without a reportId (local file output)', () => {
  const aggregate = aggregateResults([], 0);
  const html = renderReport(aggregate, {
    rootDir: 'my-project',
    generatedAt: '2026-07-12T00:00:00.000Z',
    toolVersion: '0.1.0',
  });

  assert.ok(!html.includes('subscribe-form'));
  assert.ok(!html.includes('/subscribe'));
});

test('renderReport includes the email capture form pointed at the report id (hosted output)', () => {
  const aggregate = aggregateResults([], 0);
  const html = renderReport(aggregate, {
    rootDir: 'my-project',
    generatedAt: '2026-07-12T00:00:00.000Z',
    toolVersion: '0.1.0',
    reportId: 'abc123',
  });

  assert.ok(html.includes('subscribe-form'));
  assert.ok(html.includes('/api/reports/abc123/subscribe'));
});

test('renderReport omits teardown framing by default', () => {
  const aggregate = aggregateResults([], 0);
  const html = renderReport(aggregate, {
    rootDir: 'my-project',
    generatedAt: '2026-07-12T00:00:00.000Z',
    toolVersion: '0.1.0',
  });

  assert.ok(!html.includes('teardown-banner'));
  assert.ok(!html.includes('Published by TokenDrift'));
});

test('renderReport shows teardown banner, title, and note when set, and escapes them', () => {
  const aggregate = aggregateResults([], 0);
  const html = renderReport(aggregate, {
    rootDir: 'react-router',
    generatedAt: '2026-07-12T00:00:00.000Z',
    toolVersion: '0.1.0',
    teardownTitle: 'We scanned <script>alert(1)</script> react-router',
    teardownNote: 'A look at token adoption in a popular open-source repo.',
  });

  assert.ok(html.includes('teardown-banner'));
  assert.ok(html.includes('Published by TokenDrift'));
  assert.ok(html.includes('A look at token adoption in a popular open-source repo.'));
  assert.ok(!html.includes('<script>alert(1)</script>'));
  assert.ok(html.includes('&lt;script&gt;'));
  // The <title> tag should reflect the teardown title, not the generic one.
  assert.ok(!html.includes('<title>TokenDrift Report'));
});
