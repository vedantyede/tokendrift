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
}

export interface ShareUploadPayload {
  aggregate: ScanAggregate;
  meta: ShareMeta;
}

export interface ShareResult {
  id: string;
  url: string;
  deletionToken: string;
}
