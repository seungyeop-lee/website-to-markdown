/**
 * 책임: 하니스 케이스 목록을 선언하고 suite 기준으로 제공한다.
 * 협력: runner가 현재 suite에 맞는 케이스를 조회하고 executor가 실행한다.
 * 비책임: 케이스 실행 제어, 프로세스 실행, 리포트 저장은 담당하지 않는다.
 */

import { join } from 'node:path';
import { mkdir } from 'node:fs/promises';
import { type HarnessCaseDefinition, createCheck } from '../domain/harness-case-definition.ts';
import type { HarnessCheck, HarnessComparison, HarnessSuite } from '../domain/harness-types.ts';

/** 하니스에서 사용되는 케이스 정의 집합을 제공한다. */
export class HarnessCaseRegistry {
  /** 전체 케이스를 반환한다. */
  public getAllCases(): HarnessCaseDefinition[] {
    return [
      {
        id: 'core-convert-intro',
        title: 'convert --no-llm intro fixture',
        suite: 'core',
        args: (ctx) => {
          const outputFile = join(ctx.actualRoot, 'convert', 'intro.md');
          return ['convert', '--no-llm', `${ctx.fixtureOrigin}/docs/intro.html`, '-o', outputFile];
        },
        beforeRun: async (ctx) => {
          await mkdir(join(ctx.actualRoot, 'convert'), { recursive: true });
        },
        verify: async (ctx, result, tools) => {
          const checks: HarnessCheck[] = [];
          const comparisons: HarnessComparison[] = [];

          const actualPath = join(ctx.actualRoot, 'convert', 'intro.md');
          const expectedPath = join(ctx.expectedRoot, 'convert', 'intro.md');
          const diffPath = join(ctx.diffRoot, 'core-convert-intro.diff');

          checks.push(
            createCheck(
              'exit code',
              result.exitCode === 0,
              '종료코드 0',
              `종료코드가 0이 아닙니다: ${String(result.exitCode)}`,
            ),
          );

          const actualExists = await tools.fileExists(actualPath);
          checks.push(
            createCheck(
              'output file 생성',
              actualExists,
              `파일 생성됨: ${tools.toArtifactRelative(actualPath)}`,
              `파일 생성 실패: ${tools.toArtifactRelative(actualPath)}`,
            ),
          );

          const compared = await tools.compareMarkdown({
            comparisonId: 'core-convert-intro-markdown',
            label: 'core-convert-intro',
            expectedPath,
            actualPath,
            diffPath,
          });
          checks.push(compared.check);
          comparisons.push(compared.comparison);

          return { checks, comparisons };
        },
      },
      {
        id: 'core-convert-spa',
        title: 'convert --no-llm SPA fixture',
        suite: 'core',
        args: (ctx) => {
          const outputFile = join(ctx.actualRoot, 'convert', 'spa.md');
          return ['convert', '--no-llm', `${ctx.fixtureOrigin}/docs/spa.html`, '-o', outputFile];
        },
        beforeRun: async (ctx) => {
          await mkdir(join(ctx.actualRoot, 'convert'), { recursive: true });
        },
        verify: async (ctx, result, tools) => {
          const checks: HarnessCheck[] = [];
          const comparisons: HarnessComparison[] = [];

          const actualPath = join(ctx.actualRoot, 'convert', 'spa.md');
          const expectedPath = join(ctx.expectedRoot, 'convert', 'spa.md');
          const diffPath = join(ctx.diffRoot, 'core-convert-spa.diff');

          checks.push(
            createCheck(
              'exit code',
              result.exitCode === 0,
              '종료코드 0',
              `종료코드가 0이 아닙니다: ${String(result.exitCode)}`,
            ),
          );

          const actualExists = await tools.fileExists(actualPath);
          checks.push(
            createCheck(
              'output file 생성',
              actualExists,
              `파일 생성됨: ${tools.toArtifactRelative(actualPath)}`,
              `파일 생성 실패: ${tools.toArtifactRelative(actualPath)}`,
            ),
          );

          let hasDynamicHeading = false;
          if (actualExists) {
            const text = await tools.readText(actualPath);
            hasDynamicHeading = text.includes('SPA Dynamic Heading');
          }

          checks.push(
            createCheck(
              '동적 렌더링 텍스트 포함',
              hasDynamicHeading,
              'Playwright 렌더링 결과가 포함되었습니다.',
              '동적 렌더링 텍스트(SPA Dynamic Heading)를 찾지 못했습니다.',
            ),
          );

          const compared = await tools.compareMarkdown({
            comparisonId: 'core-convert-spa-markdown',
            label: 'core-convert-spa',
            expectedPath,
            actualPath,
            diffPath,
          });
          checks.push(compared.check);
          comparisons.push(compared.comparison);

          return { checks, comparisons };
        },
      },
      {
        id: 'core-crawl-docs',
        title: 'crawl --no-llm docs fixture',
        suite: 'core',
        args: (ctx) => {
          const outputDir = join(ctx.actualRoot, 'crawl');
          return [
            'crawl',
            '--no-llm',
            '--url',
            `${ctx.fixtureOrigin}/docs/intro.html`,
            '--output-dir',
            outputDir,
            '--link-depth',
            '1',
            '--scope',
            '0',
            '--path-depth',
            '2',
          ];
        },
        beforeRun: async (ctx) => {
          await mkdir(join(ctx.actualRoot, 'crawl'), { recursive: true });
        },
        verify: async (ctx, result, tools) => {
          const checks: HarnessCheck[] = [];
          const comparisons: HarnessComparison[] = [];

          const crawlRoot = join(ctx.actualRoot, 'crawl');
          const expectedFiles = ['docs/advanced.md', 'docs/intro.md', 'docs/spa.md'];
          const actualFiles = await tools.collectMarkdownFiles(crawlRoot);

          checks.push(
            createCheck(
              'exit code',
              result.exitCode === 0,
              '종료코드 0',
              `종료코드가 0이 아닙니다: ${String(result.exitCode)}`,
            ),
          );

          const sameFileSet = JSON.stringify(actualFiles) === JSON.stringify(expectedFiles);
          checks.push(
            createCheck(
              '생성 파일 목록 정확성',
              sameFileSet,
              `생성 파일: ${actualFiles.join(', ')}`,
              `예상: ${expectedFiles.join(', ')} / 실제: ${actualFiles.join(', ') || '(없음)'}`,
            ),
          );

          const outsideGenerated = actualFiles.includes('blog/outside.md');
          checks.push(
            createCheck(
              'outside 링크 제외',
              !outsideGenerated,
              'out-of-scope 페이지는 생성되지 않았습니다.',
              'out-of-scope 페이지가 생성되었습니다: blog/outside.md',
            ),
          );

          const pairs = [
            {
              comparisonId: 'core-crawl-intro-markdown',
              label: 'core-crawl-docs intro',
              expectedPath: join(ctx.expectedRoot, 'crawl', 'docs-intro.md'),
              actualPath: join(crawlRoot, 'docs', 'intro.md'),
              diffPath: join(ctx.diffRoot, 'core-crawl-docs-intro.diff'),
            },
            {
              comparisonId: 'core-crawl-advanced-markdown',
              label: 'core-crawl-docs advanced',
              expectedPath: join(ctx.expectedRoot, 'crawl', 'docs-advanced.md'),
              actualPath: join(crawlRoot, 'docs', 'advanced.md'),
              diffPath: join(ctx.diffRoot, 'core-crawl-docs-advanced.diff'),
            },
            {
              comparisonId: 'core-crawl-spa-markdown',
              label: 'core-crawl-docs spa',
              expectedPath: join(ctx.expectedRoot, 'crawl', 'docs-spa.md'),
              actualPath: join(crawlRoot, 'docs', 'spa.md'),
              diffPath: join(ctx.diffRoot, 'core-crawl-docs-spa.diff'),
            },
          ];

          for (const pair of pairs) {
            const compared = await tools.compareMarkdown(pair);
            checks.push(compared.check);
            comparisons.push(compared.comparison);
          }

          return { checks, comparisons };
        },
      },
      {
        id: 'core-invalid-url',
        title: 'convert invalid URL error handling',
        suite: 'core',
        args: () => ['convert', '--no-llm', 'not-a-url'],
        verify: async (_ctx, result) => {
          const checks: HarnessCheck[] = [];

          checks.push(
            createCheck(
              'exit code',
              result.exitCode === 1,
              '종료코드 1',
              `종료코드가 1이 아닙니다: ${String(result.exitCode)}`,
            ),
          );

          checks.push(
            createCheck(
              'URL 에러 메시지 포함',
              result.stderr.includes('유효하지 않은 URL입니다'),
              'stderr에 URL 유효성 에러가 포함되었습니다.',
              'stderr에 URL 유효성 에러 메시지가 없습니다.',
            ),
          );

          return { checks, comparisons: [] };
        },
      },
      {
        id: 'llm-translate-smoke',
        title: 'translate smoke with OPENAI env',
        suite: 'llm',
        args: (ctx) => {
          const outputFile = join(ctx.actualRoot, 'llm', 'translate-ko.md');
          return ['convert', '--translate', 'ko', `${ctx.fixtureOrigin}/docs/intro.html`, '-o', outputFile];
        },
        beforeRun: async (ctx) => {
          await mkdir(join(ctx.actualRoot, 'llm'), { recursive: true });
        },
        skipReason: () => {
          const required = ['OPENAI_API_BASE_URL', 'OPENAI_API_KEY', 'OPENAI_API_MODEL'];
          const missing = required.filter((key) => !process.env[key]);
          if (missing.length === 0) {
            return undefined;
          }
          return `환경변수 누락으로 스킵: ${missing.join(', ')}`;
        },
        verify: async (ctx, result, tools) => {
          const checks: HarnessCheck[] = [];
          const actualPath = join(ctx.actualRoot, 'llm', 'translate-ko.md');

          checks.push(
            createCheck(
              'exit code',
              result.exitCode === 0,
              '종료코드 0',
              `종료코드가 0이 아닙니다: ${String(result.exitCode)}`,
            ),
          );

          const actualExists = await tools.fileExists(actualPath);
          checks.push(
            createCheck(
              'output file 생성',
              actualExists,
              `파일 생성됨: ${tools.toArtifactRelative(actualPath)}`,
              `파일 생성 실패: ${tools.toArtifactRelative(actualPath)}`,
            ),
          );

          let nonEmpty = false;
          if (actualExists) {
            const text = await tools.readText(actualPath);
            nonEmpty = text.trim().length > 0;
          }

          checks.push(
            createCheck(
              '번역 결과 비어있지 않음',
              nonEmpty,
              '번역 결과가 비어있지 않습니다.',
              '번역 결과가 비어있습니다.',
            ),
          );

          return { checks, comparisons: [] };
        },
      },
    ];
  }

  /** 주어진 suite에 해당하는 케이스만 필터링해 반환한다. */
  public getCasesBySuite(suite: HarnessSuite): HarnessCaseDefinition[] {
    return this.getAllCases().filter((definition) => definition.suite === suite);
  }
}
