import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildSharePayload } from '../src/share.js';
import { aggregateResults } from '../src/aggregate.js';
import type { FileScanResult } from '../src/types.js';

test('buildSharePayload reduces rootDir to a basename, never a full path', () => {
  const aggregate = aggregateResults([], 0);
  const payload = buildSharePayload(aggregate, '/Users/alice/secret-client-project', '0.1.0');

  assert.equal(payload.meta.label, 'secret-client-project');
  assert.ok(!JSON.stringify(payload).includes('/Users/alice'));
});

test('buildSharePayload scrubs secrets out of violation snippets and values', () => {
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
          snippet: "const key = 'AKIAIOSFODNN7EXAMPLE'; color: #fff;",
        },
      ],
      tokenReferences: [],
    },
  ];
  const aggregate = aggregateResults(fileResults, 10);
  const payload = buildSharePayload(aggregate, '/repo', '0.1.0');

  const snippet = payload.aggregate.violations[0]!.snippet;
  assert.ok(snippet.includes('[REDACTED]'));
  assert.ok(!snippet.includes('AKIA'));
});

test('buildSharePayload does not mutate the original aggregate', () => {
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
          snippet: "key: 'AKIAIOSFODNN7EXAMPLE'",
        },
      ],
      tokenReferences: [],
    },
  ];
  const aggregate = aggregateResults(fileResults, 10);
  buildSharePayload(aggregate, '/repo', '0.1.0');

  assert.ok(aggregate.violations[0]!.snippet.includes('AKIA'));
});
