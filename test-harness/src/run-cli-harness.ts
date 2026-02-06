/**
 * 책임: 하니스 실행을 위한 Composition Root로 의존성을 조립하고 시작한다.
 * 협력: Runner/Registry/Executor/Infra 클래스를 wiring해 단일 진입점을 제공한다.
 * 비책임: 케이스 검증 세부 로직이나 markdown 비교 구현은 담당하지 않는다.
 */

import { resolve } from 'node:path';
import { ArtifactStore } from './harness/infrastructure/artifact-store.ts';
import { CliCommandRunner } from './harness/infrastructure/cli-command-runner.ts';
import { HarnessCaseExecutor } from './harness/services/harness-case-executor.ts';
import { HarnessCaseRegistry } from './harness/services/harness-case-registry.ts';
import { HarnessReportWriter } from './harness/services/harness-report-writer.ts';
import { HarnessRunner, parseSuite } from './harness/services/harness-runner.ts';
import { MarkdownComparisonService } from './harness/services/markdown-comparison-service.ts';

/** 하니스 엔트리포인트를 실행한다. */
async function main(): Promise<void> {
  const suite = parseSuite(process.argv.slice(2));
  const projectRoot = resolve(import.meta.dir, '..', '..');

  const artifactStore = ArtifactStore.fromProjectRoot(projectRoot);
  const cliRunner = new CliCommandRunner(projectRoot);
  const comparisonService = new MarkdownComparisonService(artifactStore);
  const caseRegistry = new HarnessCaseRegistry();
  const caseExecutor = new HarnessCaseExecutor(cliRunner, artifactStore, comparisonService);
  const reportWriter = new HarnessReportWriter(artifactStore);
  const runner = new HarnessRunner(caseRegistry, caseExecutor, reportWriter, artifactStore);

  const { report, reportPath, summaryPath } = await runner.run(suite);

  console.error(`[HARNESS] report: ${reportPath}`);
  console.error(`[HARNESS] summary: ${summaryPath}`);

  if (report.summary.failed > 0) {
    process.exit(1);
  }
}

main().catch(async (error) => {
  const projectRoot = resolve(import.meta.dir, '..', '..');
  const artifactStore = ArtifactStore.fromProjectRoot(projectRoot);

  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  await artifactStore.ensureDir(artifactStore.artifactsRoot);
  await artifactStore.writeText(artifactStore.getFatalLogPath(), `${message}\n`);

  console.error('[HARNESS] fatal error');
  console.error(message);
  process.exit(1);
});
