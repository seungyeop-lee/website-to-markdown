/**
 * 책임: 하니스 도메인 전반에서 공유하는 핵심 타입을 정의한다.
 * 협력: services/infrastructure 계층이 동일 타입 계약으로 통신한다.
 * 비책임: 실행 로직, 파일 I/O, CLI 파싱은 담당하지 않는다.
 */

/** 실행할 하니스 스위트 식별자. */
export type HarnessSuite = 'core' | 'llm';

/** 케이스 실행 결과 상태. */
export type HarnessCaseStatus = 'PASSED' | 'FAILED' | 'SKIPPED';

/** 단일 검증 항목 결과. */
export interface HarnessCheck {
  name: string;
  passed: boolean;
  detail: string;
}

/** expected/actual markdown 비교 결과. */
export interface HarnessComparison {
  id: string;
  label: string;
  expectedPath?: string;
  actualPath?: string;
  diffPath?: string;
  matched?: boolean;
}

/** 단일 하니스 케이스 실행 리포트. */
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

/** 전체 케이스 집계 요약. */
export interface HarnessSummary {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
}

/** 하니스 최종 JSON 리포트 구조. */
export interface HarnessReport {
  generatedAt: string;
  suite: HarnessSuite;
  fixtureOrigin?: string;
  artifactsRoot: string;
  summary: HarnessSummary;
  cases: HarnessCaseReport[];
}

/** CLI 프로세스 실행 결과. */
export interface CommandResult {
  command: string;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  durationMs: number;
}

/** 실행 시점 하니스 경로/환경 컨텍스트. */
export interface HarnessContext {
  suite: HarnessSuite;
  projectRoot: string;
  expectedRoot: string;
  artifactsRoot: string;
  stdoutRoot: string;
  stderrRoot: string;
  actualRoot: string;
  diffRoot: string;
  fixtureOrigin: string;
}
