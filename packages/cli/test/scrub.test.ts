import assert from 'node:assert/strict';
import { test } from 'node:test';
import { scrubSecrets } from '../src/scrub.js';

test('scrubSecrets redacts common secret shapes', () => {
  const cases: Array<[string, string]> = [
    ['key: AKIAIOSFODNN7EXAMPLE', 'AKIA'],
    ['token=ghp_1234567890abcdefghijklmnopqrstuvwxyz', 'ghp_'],
    ['sk_live_51H8xyzabcdefghijklmnop', 'sk_live_'],
    ['xoxb-1234567890-abcdefghijklmnop', 'xoxb-'],
    [
      'auth: eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U',
      'eyJ',
    ],
    ['const apiKey = "sk-abcdefghijklmnopqrstuvwx";', 'apiKey'],
  ];

  for (const [input, mustNotContain] of cases) {
    const scrubbed = scrubSecrets(input);
    assert.ok(scrubbed.includes('[REDACTED]'), `expected redaction for: ${input}`);
    assert.ok(!scrubbed.includes(mustNotContain), `expected "${mustNotContain}" to be gone from: ${scrubbed}`);
  }
});

test('scrubSecrets redacts private key blocks', () => {
  const input = '-----BEGIN RSA PRIVATE KEY-----\nMIIEow...\n-----END RSA PRIVATE KEY-----';
  const scrubbed = scrubSecrets(input);
  assert.equal(scrubbed, '[REDACTED]');
});

test('scrubSecrets leaves ordinary color/spacing snippets untouched', () => {
  const snippets = [
    "style={{ backgroundColor: '#FF0000', borderColor: 'blue' }}",
    'className="text-white bg-blue-500 hover:bg-[#1D4ED8]"',
    'margin: 25px;',
    'box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);',
  ];
  for (const snippet of snippets) {
    assert.equal(scrubSecrets(snippet), snippet);
  }
});
