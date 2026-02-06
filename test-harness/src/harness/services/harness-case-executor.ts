/**
 * 책임: 단일 하니스 케이스의 실행 흐름(skip/beforeRun/검증/로그 저장)을 관리한다.
 * 협력: runner가 케이스를 전달하면 cli-runner/comparison-service/artifact-store를 조합해 실행한다.
 * 비책임: 케이스 목록 관리나 최종 보고서 집계는 담당하지 않는다.
 */

import { type HarnessCaseDefinition, createCheck, type HarnessCaseVerifyTools } from '../domain/harness-case-definition.ts';
import type { HarnessCaseReport, HarnessContext } from '../domain/harness-types.ts';
import { ArtifactStore } from '../infrastructure/artifact-store.ts';
import { CliCommandRunner } from '../infrastructure/cli-command-runner.ts';
import { MarkdownComparisonService } from './markdown-comparison-service.ts';

/** 하니스 단일 케이스를 일관된 방식으로 실행한다. */
export class HarnessCaseExecutor {
  public constructor(
    private readonly cliRunner: CliCommandRunner,
    private readonly artifactStore: ArtifactStore,
    private readonly comparisonService: MarkdownComparisonService,
  ) {}

  /** 케이스 하나를 실행하고 결과 리포트를 반환한다. */
  public async execute(definition: HarnessCaseDefinition, ctx: HarnessContext): Promise<HarnessCaseReport> {
    const stdoutFile = this.artifactStore.getStdoutPath(definition.id);
    const stderrFile = this.artifactStore.getStderrPath(definition.id);

    await this.artifactStore.ensureDir(ctx.stdoutRoot);
    await this.artifactStore.ensureDir(ctx.stderrRoot);

    const args = definition.args(ctx);
    const commandPreview = this.cliRunner.previewCommand(args);

    const skippedReason = definition.skipReason?.(ctx);
    if (skippedReason) {
      await this.artifactStore.writeText(stdoutFile, `SKIPPED: ${skippedReason}\n`);
      await this.artifactStore.writeText(stderrFile, '');

      return {
        id: definition.id,
        title: definition.title,
        suite: definition.suite,
        status: 'SKIPPED',
        command: commandPreview,
        durationMs: 0,
        exitCode: null,
        skippedReason,
        stdoutPath: this.artifactStore.toArtifactRelative(stdoutFile),
        stderrPath: this.artifactStore.toArtifactRelative(stderrFile),
        checks: [
          {
            name: 'suite prerequisites',
            passed: true,
            detail: skippedReason,
          },
        ],
        comparisons: [],
      };
    }

    try {
      if (definition.beforeRun) {
        await definition.beforeRun(ctx);
      }

      const commandResult = await this.cliRunner.run(args);
      await this.artifactStore.writeText(stdoutFile, commandResult.stdout);
      await this.artifactStore.writeText(stderrFile, commandResult.stderr);

      const verification = await definition.verify(ctx, commandResult, this.buildVerifyTools(ctx));
      const status = verification.checks.every((check) => check.passed) ? 'PASSED' : 'FAILED';

      return {
        id: definition.id,
        title: definition.title,
        suite: definition.suite,
        status,
        command: commandResult.command,
        durationMs: commandResult.durationMs,
        exitCode: commandResult.exitCode,
        stdoutPath: this.artifactStore.toArtifactRelative(stdoutFile),
        stderrPath: this.artifactStore.toArtifactRelative(stderrFile),
        checks: verification.checks,
        comparisons: verification.comparisons,
      };
    } catch (error) {
      const message = error instanceof Error ? error.stack ?? error.message : String(error);
      await this.artifactStore.writeText(stdoutFile, '');
      await this.artifactStore.writeText(stderrFile, `${message}\n`);

      return {
        id: definition.id,
        title: definition.title,
        suite: definition.suite,
        status: 'FAILED',
        command: commandPreview,
        durationMs: 0,
        exitCode: null,
        stdoutPath: this.artifactStore.toArtifactRelative(stdoutFile),
        stderrPath: this.artifactStore.toArtifactRelative(stderrFile),
        checks: [
          {
            name: 'command execution',
            passed: false,
            detail: message,
          },
        ],
        comparisons: [],
      };
    }
  }

  private buildVerifyTools(ctx: HarnessContext): HarnessCaseVerifyTools {
    return {
      makeCheck: createCheck,
      fileExists: async (path) => await this.artifactStore.fileExists(path),
      readText: async (path) => await this.artifactStore.readText(path),
      toArtifactRelative: (absolutePath) => this.artifactStore.toArtifactRelative(absolutePath),
      collectMarkdownFiles: async (rootDir) => await this.artifactStore.collectMarkdownFiles(rootDir),
      compareMarkdown: async (request) => await this.comparisonService.compare(ctx, request),
    };
  }
}
