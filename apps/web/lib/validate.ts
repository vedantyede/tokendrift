import type { ScanAggregate, ShareUploadPayload } from 'tokendrift/types';

export const MAX_PAYLOAD_BYTES = 5 * 1024 * 1024;
// Sanity cap, not a hard product limit — the local HTML report already
// truncates rendering at 500 violations; this just bounds upload abuse.
const MAX_VIOLATIONS = 20000;

/** Lightweight structural check — not a full schema validator, just enough to reject garbage. */
export function validateSharePayload(body: unknown): ShareUploadPayload | null {
  if (!body || typeof body !== 'object') return null;
  const { aggregate, meta } = body as Partial<ShareUploadPayload>;
  if (!aggregate || typeof aggregate !== 'object') return null;
  if (!meta || typeof meta !== 'object') return null;

  const a = aggregate as Partial<ScanAggregate>;
  if (typeof a.filesScanned !== 'number') return null;
  if (typeof a.linesScanned !== 'number') return null;
  if (!Array.isArray(a.violations) || a.violations.length > MAX_VIOLATIONS) return null;
  if (!a.adoption || typeof a.adoption !== 'object') return null;
  if (!a.violationsByFile || typeof a.violationsByFile !== 'object') return null;
  if (!a.driftScore || typeof a.driftScore.score !== 'number') return null;
  if (a.driftScore.score < 0 || a.driftScore.score > 100) return null;

  const m = meta as Partial<ShareUploadPayload['meta']>;
  if (typeof m.toolVersion !== 'string') return null;
  if (typeof m.generatedAt !== 'string') return null;
  if (typeof m.label !== 'string') return null;

  return body as ShareUploadPayload;
}
