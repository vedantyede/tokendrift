// Best-effort secret redaction applied to violation snippets/values before
// upload (--share). This is defense-in-depth, not a guarantee: it catches
// common, recognizable secret shapes, not arbitrary sensitive data. Local
// scans never run this — it only applies to the upload payload.
const SECRET_PATTERNS: RegExp[] = [
  // AWS access key ID
  /\bAKIA[0-9A-Z]{16}\b/g,
  // GitHub tokens (ghp_, gho_, ghu_, ghs_, ghr_, github_pat_)
  /\bgh[oprsu]_[A-Za-z0-9]{36,}\b/g,
  /\bgithub_pat_[A-Za-z0-9_]{20,}\b/g,
  // Stripe keys
  /\b[sr]k_(live|test)_[A-Za-z0-9]{16,}\b/g,
  // Slack tokens
  /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g,
  // JWTs
  /\bey[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g,
  // Generic private key blocks
  /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
  // Generic key/secret/token/password assignment followed by a long opaque value
  /\b(api[_-]?key|secret|token|password|passwd|pwd)\s*[:=]\s*['"][A-Za-z0-9\-_./+=]{12,}['"]/gi,
];

/** Redacts recognizable secret patterns in a string, returning the scrubbed text. */
export function scrubSecrets(text: string): string {
  let result = text;
  for (const pattern of SECRET_PATTERNS) {
    result = result.replace(pattern, '[REDACTED]');
  }
  return result;
}
