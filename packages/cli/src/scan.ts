export { detectColors } from './rules/colors';
export { detectSpacing } from './rules/spacing';
export { aggregateResults } from './aggregate';
export { DEFAULT_CONFIG } from './config';
export type { TokenDriftConfig } from './config';

import type { Violation } from './types';

// Shared by the CLI's --fail-on-new/--baseline and the hosted PR ratchet
// check, so "new violation" means exactly the same thing in both places.
export function violationFingerprint(v: Violation): string {
  return `${v.rule}|${v.file}|${v.line}|${v.column}|${v.value}`;
}
