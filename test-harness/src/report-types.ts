export type HarnessSuite = 'core' | 'llm';
export type HarnessCaseStatus = 'PASSED' | 'FAILED' | 'SKIPPED';

export interface HarnessCheck {
  name: string;
  passed: boolean;
  detail: string;
}

export interface HarnessComparison {
  id: string;
  label: string;
  expectedPath?: string;
  actualPath?: string;
  diffPath?: string;
  matched?: boolean;
}

export interface HarnessCaseReport {
  id: string;
  title: string;
  suite: HarnessSuite;
  status: HarnessCaseStatus;
  command: string;
  durationMs: number;
  exitCode: number | null;
  skippedReason?: string;
  stdoutPath: string;
  stderrPath: string;
  checks: HarnessCheck[];
  comparisons: HarnessComparison[];
}

export interface HarnessSummary {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
}

export interface HarnessReport {
  generatedAt: string;
  suite: HarnessSuite;
  fixtureOrigin?: string;
  artifactsRoot: string;
  summary: HarnessSummary;
  cases: HarnessCaseReport[];
}
