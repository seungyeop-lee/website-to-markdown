/**
 * 책임: MarkdownComparisonService의 비교 규칙(일치/불일치/파일 누락)을 검증한다.
 * 협력: bun test가 정규화/스냅샷/diff 동작 회귀를 빠르게 탐지한다.
 * 비책임: 실제 CLI 실행 결과 생성까지는 검증하지 않는다.
 */

import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { HarnessContext } from '../domain/harness-types.ts';
import { ArtifactStore } from '../infrastructure/artifact-store.ts';
import { MarkdownComparisonService } from './markdown-comparison-service.ts';

describe('MarkdownComparisonService', () => {
  let tempRoot = '';
  let ctx: HarnessContext;
  let artifactStore: ArtifactStore;
  let service: MarkdownComparisonService;

  beforeEach(async () => {
    tempRoot = await mkdtemp(join(tmpdir(), 'wtm-harness-'));
    const projectRoot = join(tempRoot, 'project');
    await mkdir(join(projectRoot, 'test-harness'), { recursive: true });

    artifactStore = new ArtifactStore(projectRoot);
    await artifactStore.prepareArtifacts();

    ctx = artifactStore.createContext('core', 'http://127.0.0.1:41730');
    service = new MarkdownComparisonService(artifactStore);
  });

  afterEach(async () => {
    if (tempRoot) {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('정규화 후 내용이 같으면 matched=true를 반환한다', async () => {
    const expectedPath = join(ctx.expectedRoot, 'convert', 'intro.md');
    const actualPath = join(ctx.actualRoot, 'convert', 'intro.md');
    const diffPath = join(ctx.diffRoot, 'intro.diff');

    await artifactStore.writeText(
      expectedPath,
      '---\ncreatedAt: 2026-02-06T12:00:00.000Z\nurl: http://127.0.0.1:41730/docs/intro.html\n---\n# Intro\n',
    );
    await artifactStore.writeText(
      actualPath,
      '---\ncreatedAt: 2026-02-06T13:00:00.000Z\nurl: http://127.0.0.1:41789/docs/intro.html\n---\n# Intro\n',
    );

    const result = await service.compare(ctx, {
      comparisonId: 'matched-case',
      label: 'matched',
      expectedPath,
      actualPath,
      diffPath,
    });

    expect(result.check.passed).toBe(true);
    expect(result.comparison.matched).toBe(true);
    expect(result.comparison.diffPath).toBeUndefined();

    const snapshotPath = join(ctx.artifactsRoot, 'expected', 'matched-case.md');
    expect(await artifactStore.fileExists(snapshotPath)).toBe(true);
  });

  it('내용이 다르면 diff를 생성하고 실패를 반환한다', async () => {
    const expectedPath = join(ctx.expectedRoot, 'convert', 'intro.md');
    const actualPath = join(ctx.actualRoot, 'convert', 'intro.md');
    const diffPath = join(ctx.diffRoot, 'intro.diff');

    await artifactStore.writeText(expectedPath, '# Intro\nA\n');
    await artifactStore.writeText(actualPath, '# Intro\nB\n');

    const result = await service.compare(ctx, {
      comparisonId: 'mismatch-case',
      label: 'mismatch',
      expectedPath,
      actualPath,
      diffPath,
    });

    expect(result.check.passed).toBe(false);
    expect(result.comparison.matched).toBe(false);
    expect(result.comparison.diffPath).toBe('diff/intro.diff');
    expect(await artifactStore.readText(diffPath)).toContain('--- expected');
  });

  it('expected 파일이 없으면 expected 누락으로 실패한다', async () => {
    const expectedPath = join(ctx.expectedRoot, 'convert', 'intro.md');
    const actualPath = join(ctx.actualRoot, 'convert', 'intro.md');
    const diffPath = join(ctx.diffRoot, 'intro.diff');

    await artifactStore.writeText(actualPath, '# Intro\n');

    const result = await service.compare(ctx, {
      comparisonId: 'missing-expected',
      label: 'missing-expected',
      expectedPath,
      actualPath,
      diffPath,
    });

    expect(result.check.passed).toBe(false);
    expect(result.check.detail).toContain('expected 누락');
  });

  it('actual 파일이 없으면 actual 누락으로 실패한다', async () => {
    const expectedPath = join(ctx.expectedRoot, 'convert', 'intro.md');
    const actualPath = join(ctx.actualRoot, 'convert', 'intro.md');
    const diffPath = join(ctx.diffRoot, 'intro.diff');

    await artifactStore.writeText(expectedPath, '# Intro\n');

    const result = await service.compare(ctx, {
      comparisonId: 'missing-actual',
      label: 'missing-actual',
      expectedPath,
      actualPath,
      diffPath,
    });

    expect(result.check.passed).toBe(false);
    expect(result.check.detail).toContain('actual 누락');
  });
});
