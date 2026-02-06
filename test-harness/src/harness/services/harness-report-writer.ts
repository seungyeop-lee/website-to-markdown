/**
 * 책임: 케이스 결과 집계와 report.json/summary.md 생성을 담당한다.
 * 협력: runner가 실행 결과 배열을 전달하면 최종 산출물을 기록한다.
 * 비책임: 케이스 실행이나 fixture 서버 생명주기 관리는 담당하지 않는다.
 */

import type { HarnessCaseReport, HarnessReport, HarnessSuite, HarnessSummary } from '../domain/harness-types.ts';
import { ArtifactStore } from '../infrastructure/artifact-store.ts';

/** 하니스 최종 리포트 생성/저장을 담당한다. */
export class HarnessReportWriter {
  public constructor(private readonly artifactStore: ArtifactStore) {}

  /** 케이스 결과 배열로 summary를 계산한다. */
  public buildSummary(cases: HarnessCaseReport[]): HarnessSummary {
    return {
      total: cases.length,
      passed: cases.filter((entry) => entry.status === 'PASSED').length,
      failed: cases.filter((entry) => entry.status === 'FAILED').length,
      skipped: cases.filter((entry) => entry.status === 'SKIPPED').length,
    };
  }

  /** 실행 결과로 하니스 리포트 객체를 구성한다. */
  public buildReport(suite: HarnessSuite, fixtureOrigin: string, cases: HarnessCaseReport[]): HarnessReport {
    return {
      generatedAt: new Date().toISOString(),
      suite,
      fixtureOrigin,
      artifactsRoot: this.artifactStore.getArtifactsRootPosix(),
      summary: this.buildSummary(cases),
      cases,
    };
  }

  /** report.json과 summary.md를 저장하고 파일 경로를 반환한다. */
  public async write(report: HarnessReport): Promise<{ reportPath: string; summaryPath: string }> {
    const reportPath = this.artifactStore.getReportPath();
    const summaryPath = this.artifactStore.getSummaryPath();

    await this.artifactStore.writeText(reportPath, `${JSON.stringify(report, null, 2)}\n`);
    await this.artifactStore.writeText(summaryPath, this.renderSummaryMarkdown(report));

    return { reportPath, summaryPath };
  }

  /** summary.md 렌더링 문자열을 생성한다. */
  public renderSummaryMarkdown(report: HarnessReport): string {
    const lines: string[] = [];
    lines.push('# CLI Harness Summary');
    lines.push('');
    lines.push(`- Generated At: ${report.generatedAt}`);
    lines.push(`- Suite: ${report.suite}`);
    lines.push(`- Fixture Origin: ${report.fixtureOrigin ?? '(none)'}`);
    lines.push(`- Total: ${report.summary.total}`);
    lines.push(`- Passed: ${report.summary.passed}`);
    lines.push(`- Failed: ${report.summary.failed}`);
    lines.push(`- Skipped: ${report.summary.skipped}`);
    lines.push('');
    lines.push('| Case ID | Status | Exit Code | Duration (ms) |');
    lines.push('| --- | --- | --- | --- |');

    for (const entry of report.cases) {
      lines.push(`| ${entry.id} | ${entry.status} | ${entry.exitCode ?? ''} | ${entry.durationMs} |`);
    }

    lines.push('');
    return `${lines.join('\n')}\n`;
  }
}
