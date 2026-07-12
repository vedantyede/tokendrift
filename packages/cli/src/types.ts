export type ColorKind = 'hex' | 'rgb' | 'hsl' | 'named' | 'tailwind-arbitrary';
export type SpacingKind = 'px' | 'rem' | 'em' | 'tailwind-arbitrary';
export type RuleId = 'hardcoded-color' | 'off-scale-spacing';
export type Category = 'color' | 'spacing';

export interface Violation {
  rule: RuleId;
  category: Category;
  kind: ColorKind | SpacingKind;
  file: string;
  line: number;
  column: number;
  value: string;
  snippet: string;
}

export interface TokenReference {
  category: Category;
  file: string;
  line: number;
  column: number;
  value: string;
}

export interface FileScanResult {
  file: string;
  violations: Violation[];
  tokenReferences: TokenReference[];
}

export interface CategoryAdoption {
  tokenized: number;
  raw: number;
  rate: number;
}

export interface AdoptionSummary {
  color: CategoryAdoption;
  spacing: CategoryAdoption;
  overall: CategoryAdoption;
}

export interface DriftScoreBreakdown {
  adoptionComponent: number;
  densityComponent: number;
  concentrationComponent: number;
}

export interface DriftScoreResult {
  score: number;
  scoreVersion: number;
  breakdown: DriftScoreBreakdown;
}

export interface ScanAggregate {
  filesScanned: number;
  linesScanned: number;
  violations: Violation[];
  adoption: AdoptionSummary;
  violationsByFile: Record<string, number>;
  driftScore: DriftScoreResult;
}

export interface ShareMeta {
  toolVersion: string;
  generatedAt: string;
  /** Basename of the scanned directory only — never a full local path. */
  label: string;
  /**
   * Stable per-repo identity derived from the git origin remote (see
   * repoIdentity.ts) — lets a README badge track the latest score across
   * separate --share runs of the same repo. Absent if no git remote is
   * found; badge registration is then simply skipped.
   */
  repoSlug?: string;
  /**
   * "Published by TokenDrift" editorial teardown mode (PRD growth
   * mechanic #4) — set via --teardown-title/--teardown-note for public
   * teardowns of open-source repos used as content marketing. Ordinary
   * shared reports never set this.
   */
  teardownTitle?: string;
  teardownNote?: string;
}

export interface ShareUploadPayload {
  aggregate: ScanAggregate;
  meta: ShareMeta;
}

export interface ShareResult {
  id: string;
  url: string;
  deletionToken: string;
  /** Present only when the payload carried a repoSlug the server accepted. */
  badgeUrl?: string;
}
