/**
 * 책임: 하니스 실행 전체 흐름(아티팩트 준비, fixture 서버, 케이스 루프)을 오케스트레이션한다.
 * 협력: registry/executor/report-writer를 조립된 형태로 호출한다.
 * 비책임: 케이스 상세 검증 규칙 정의나 CLI 인자 파싱 정책 자체는 담당하지 않는다.
 */

import { startFixtureServer } from '../../fixture-server.ts';
import type { HarnessCaseReport, HarnessReport, HarnessSuite } from '../domain/harness-types.ts';
import { ArtifactStore } from '../infrastructure/artifact-store.ts';
import { HarnessCaseExecutor } from './harness-case-executor.ts';
import { HarnessCaseRegistry } from './harness-case-registry.ts';
import { HarnessReportWriter } from './harness-report-writer.ts';

/** suite 옵션이 없을 때 사용할 기본 스위트. */
export const DEFAULT_SUITE: HarnessSuite = 'core';

/** CLI argv에서 suite 값을 파싱한다. */
export function parseSuite(argv: string[]): HarnessSuite {
  const suiteIndex = argv.indexOf('--suite');
  if (suiteIndex === -1) {
    return DEFAULT_SUITE;
  }

  const suiteValue = argv[suiteIndex + 1];
  if (suiteValue === 'core' || suiteValue === 'llm') {
    return suiteValue;
  }

  throw new Error(`Invalid --suite value: ${String(suiteValue)} (expected: core | llm)`);
}

/** 하니스 실행을 end-to-end로 수행하는 애플리케이션 서비스. */
export class HarnessRunner {
  public constructor(
    private readonly caseRegistry: HarnessCaseRegistry,
    private readonly caseExecutor: HarnessCaseExecutor,
    private readonly reportWriter: HarnessReportWriter,
    private readonly artifactStore: ArtifactStore,
  ) {}

  /** 주어진 suite를 실행하고 리포트 및 출력 경로를 반환한다. */
  public async run(suite: HarnessSuite): Promise<{ report: HarnessReport; reportPath: string; summaryPath: string }> {
    await this.artifactStore.prepareArtifacts();

    const fixtureServer = startFixtureServer(41730);
    const context = this.artifactStore.createContext(suite, fixtureServer.origin);
    const definitions = this.caseRegistry.getCasesBySuite(suite);
    const results: HarnessCaseReport[] = [];

    try {
      for (const definition of definitions) {
        const caseReport = await this.caseExecutor.execute(definition, context);
        results.push(caseReport);
        console.error(
          `[HARNESS] ${caseReport.id}: ${caseReport.status} (exit=${caseReport.exitCode ?? 'n/a'}, duration=${caseReport.durationMs}ms)`,
        );
      }
    } finally {
      fixtureServer.stop();
    }

    const report = this.reportWriter.buildReport(suite, context.fixtureOrigin, results);
    const { reportPath, summaryPath } = await this.reportWriter.write(report);

    return { report, reportPath, summaryPath };
  }
}
