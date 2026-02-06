/**
 * 책임: 하니스 케이스 정의 계약과 검증 도구 인터페이스를 제공한다.
 * 협력: case-registry가 케이스를 선언하고, case-executor가 도구 구현을 주입한다.
 * 비책임: 실제 명령 실행/파일 생성/리포트 저장은 담당하지 않는다.
 */

import type {
  CommandResult,
  HarnessCheck,
  HarnessComparison,
  HarnessContext,
  HarnessSuite,
} from './harness-types.ts';

/** 케이스 검증 단계에서 사용하는 markdown 비교 입력값. */
export interface MarkdownComparisonRequest {
  comparisonId: string;
  label: string;
  expectedPath: string;
  actualPath: string;
  diffPath: string;
}

/** markdown 비교 결과의 체크/비교 레코드 묶음. */
export interface MarkdownComparisonResult {
  check: HarnessCheck;
  comparison: HarnessComparison;
}

/** 케이스 검증 단계에서 사용할 도구 모음. */
export interface HarnessCaseVerifyTools {
  makeCheck: (name: string, passed: boolean, successDetail: string, failureDetail: string) => HarnessCheck;
  fileExists: (path: string) => Promise<boolean>;
  readText: (path: string) => Promise<string>;
  toArtifactRelative: (absolutePath: string) => string;
  collectMarkdownFiles: (rootDir: string) => Promise<string[]>;
  compareMarkdown: (request: MarkdownComparisonRequest) => Promise<MarkdownComparisonResult>;
}

/** 케이스별 검증 결과. */
export interface VerificationResult {
  checks: HarnessCheck[];
  comparisons: HarnessComparison[];
}

/** 하니스가 실행할 단일 케이스 선언. */
export interface HarnessCaseDefinition {
  id: string;
  title: string;
  suite: HarnessSuite;
  args: (ctx: HarnessContext) => string[];
  beforeRun?: (ctx: HarnessContext) => Promise<void>;
  verify: (
    ctx: HarnessContext,
    result: CommandResult,
    tools: HarnessCaseVerifyTools,
  ) => Promise<VerificationResult>;
  skipReason?: (ctx: HarnessContext) => string | undefined;
}

/** 성공/실패 상세 메시지를 포함한 표준 검증 항목을 생성한다. */
export function createCheck(
  name: string,
  passed: boolean,
  successDetail: string,
  failureDetail: string,
): HarnessCheck {
  return {
    name,
    passed,
    detail: passed ? successDetail : failureDetail,
  };
}
