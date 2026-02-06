/**
 * 책임: expected/actual markdown 정규화 비교와 diff 생성을 담당한다.
 * 협력: case-executor가 케이스 검증 중 비교 요청을 전달한다.
 * 비책임: 케이스 실행 순서 제어나 CLI 실행은 담당하지 않는다.
 */

import { dirname, join } from 'node:path';
import { normalizeMarkdown } from '../../normalize.ts';
import { createCheck, type MarkdownComparisonRequest, type MarkdownComparisonResult } from '../domain/harness-case-definition.ts';
import type { HarnessContext, HarnessComparison } from '../domain/harness-types.ts';
import { ArtifactStore } from '../infrastructure/artifact-store.ts';

/** markdown 비교 요청을 처리해 검증 체크/비교 정보를 반환한다. */
export class MarkdownComparisonService {
  public constructor(private readonly artifactStore: ArtifactStore) {}

  /** expected/actual 파일을 비교하고 필요 시 diff를 생성한다. */
  public async compare(ctx: HarnessContext, request: MarkdownComparisonRequest): Promise<MarkdownComparisonResult> {
    const expectedExists = await this.artifactStore.fileExists(request.expectedPath);
    const actualExists = await this.artifactStore.fileExists(request.actualPath);
    const expectedSnapshotPath = join(ctx.artifactsRoot, 'expected', `${request.comparisonId}.md`);

    const comparison: HarnessComparison = {
      id: request.comparisonId,
      label: request.label,
      expectedPath: undefined,
      actualPath: actualExists ? this.artifactStore.toArtifactRelative(request.actualPath) : undefined,
      matched: false,
    };

    if (expectedExists) {
      await this.artifactStore.ensureDir(dirname(expectedSnapshotPath));
      await this.artifactStore.writeText(expectedSnapshotPath, await this.artifactStore.readText(request.expectedPath));
      comparison.expectedPath = this.artifactStore.toArtifactRelative(expectedSnapshotPath);
    }

    if (!expectedExists || !actualExists) {
      const check = createCheck(
        `${request.label} markdown 일치`,
        false,
        `${request.label} markdown 일치`,
        `${request.label}: ${!expectedExists ? 'expected 누락' : ''}${!expectedExists && !actualExists ? ', ' : ''}${!actualExists ? 'actual 누락' : ''}`,
      );
      return { check, comparison };
    }

    const expectedNormalized = normalizeMarkdown(await this.artifactStore.readText(request.expectedPath));
    const actualNormalized = normalizeMarkdown(await this.artifactStore.readText(request.actualPath));
    const matched = expectedNormalized === actualNormalized;

    comparison.matched = matched;

    if (!matched) {
      await this.artifactStore.writeText(request.diffPath, this.createSimpleDiff(expectedNormalized, actualNormalized));
      comparison.diffPath = this.artifactStore.toArtifactRelative(request.diffPath);
    }

    const check = createCheck(
      `${request.label} markdown 일치`,
      matched,
      `${request.label}: expected와 actual이 일치합니다.`,
      `${request.label}: markdown 내용이 다릅니다.${matched ? '' : ` diff: ${this.artifactStore.toArtifactRelative(request.diffPath)}`}`,
    );

    return { check, comparison };
  }

  private createSimpleDiff(expectedText: string, actualText: string): string {
    const expectedLines = expectedText.split('\n');
    const actualLines = actualText.split('\n');
    const maxLength = Math.max(expectedLines.length, actualLines.length);
    const rows: string[] = ['--- expected', '+++ actual'];

    for (let i = 0; i < maxLength; i++) {
      const expectedLine = expectedLines[i];
      const actualLine = actualLines[i];

      if (expectedLine === actualLine) {
        rows.push(` ${expectedLine ?? ''}`);
        continue;
      }

      if (expectedLine !== undefined) {
        rows.push(`-${expectedLine}`);
      }
      if (actualLine !== undefined) {
        rows.push(`+${actualLine}`);
      }
    }

    return `${rows.join('\n')}\n`;
  }
}
