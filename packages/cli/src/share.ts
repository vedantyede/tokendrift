import path from 'node:path';
import { scrubSecrets } from './scrub.js';
import { deriveRepoSlug } from './repoIdentity.js';
import type { ScanAggregate, ShareResult, ShareUploadPayload, Violation } from './types.js';

export const DEFAULT_SHARE_URL = 'https://usetokendrift.com';

function scrubViolation(v: Violation): Violation {
  return { ...v, value: scrubSecrets(v.value), snippet: scrubSecrets(v.snippet) };
}

function scrubAggregate(aggregate: ScanAggregate): ScanAggregate {
  return { ...aggregate, violations: aggregate.violations.map(scrubViolation) };
}

/**
 * Builds the --share upload payload: the report artifact only (aggregates +
 * violation locations/scrubbed snippets), never full source. `rootDir` is
 * reduced to its basename — the full local path never leaves the machine.
 */
export interface TeardownOptions {
  teardownTitle?: string;
  teardownNote?: string;
}

export function buildSharePayload(
  aggregate: ScanAggregate,
  rootDir: string,
  toolVersion: string,
  teardown?: TeardownOptions,
): ShareUploadPayload {
  return {
    aggregate: scrubAggregate(aggregate),
    meta: {
      toolVersion,
      generatedAt: new Date().toISOString(),
      label: path.basename(rootDir) || 'repository',
      repoSlug: deriveRepoSlug(rootDir) ?? undefined,
      teardownTitle: teardown?.teardownTitle,
      teardownNote: teardown?.teardownNote,
    },
  };
}

export async function uploadReport(
  payload: ShareUploadPayload,
  shareBaseUrl: string,
): Promise<ShareResult> {
  const res = await fetch(new URL('/api/reports', shareBaseUrl), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`upload failed (${res.status}): ${text || res.statusText}`);
  }
  return (await res.json()) as ShareResult;
}
