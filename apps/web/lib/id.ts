import { randomBytes, createHash, timingSafeEqual } from 'node:crypto';

/** Unguessable base64url id. 16 bytes -> 22 chars, comfortably over the >=21 char bar (F9). */
export function generateId(): string {
  return randomBytes(16).toString('base64url');
}

/** Longer, separate secret for report deletion — shown to the uploader once, never stored raw. */
export function generateDeletionToken(): string {
  return randomBytes(24).toString('base64url');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function tokensMatch(providedToken: string, storedHash: string): boolean {
  const providedHash = hashToken(providedToken);
  const a = Buffer.from(providedHash, 'utf8');
  const b = Buffer.from(storedHash, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}
