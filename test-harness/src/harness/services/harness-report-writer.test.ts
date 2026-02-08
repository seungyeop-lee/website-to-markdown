/**
 * 책임: HarnessReportWriter의 집계(summary) 계산 정확성을 검증한다.
 * 협력: 리팩토링 후 PASS/FAIL/SKIP 카운트 회귀를 단위 수준에서 방지한다.
 * 비책임: report 파일 저장 I/O 동작은 검증하지 않는다.
 */

import { describe, expect, it } from 'bun:test';
import type { HarnessCaseReport } from '../domain/harness-types.ts';
import { ArtifactStore } from '../infrastructure/artifact-store.ts';
import { HarnessReportWriter } from './harness-report-writer.ts';

function buildCase(id: string, status: HarnessCaseReport['status']): HarnessCaseReport {
  return {
    id,
    title: id,
    suite: 'core',
    status,
    command: 'bun src/cli/index.ts convert',
    durationMs: 10,
    exitCode: status === 'FAILED' ? 1 : 0,
    stdoutPath: 'stdout/test.log',
    stderrPath: 'stderr/test.log',
    checks: [],
    comparisons: [],
  };
}

describe('HarnessReportWriter', () => {
  it('PASSED/FAILED/SKIPPED 카운트를 정확히 집계한다', () => {
    const artifactStore = new ArtifactStore('/tmp/wtm-harness-writer-test');
    const writer = new HarnessReportWriter(artifactStore);

    const summary = writer.buildSummary([
      buildCase('c1', 'PASSED'),
      buildCase('c2', 'FAILED'),
      buildCase('c3', 'SKIPPED'),
      buildCase('c4', 'PASSED'),
    ]);

    expect(summary).toEqual({
      total: 4,
      passed: 2,
      failed: 1,
      skipped: 1,
    });
  });
});
