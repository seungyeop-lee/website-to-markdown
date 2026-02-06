import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { startFixtureServer } from './fixture-server.ts';
import { normalizeMarkdown } from './normalize.ts';
import type {
  HarnessCaseReport,
  HarnessCheck,
  HarnessComparison,
  HarnessReport,
  HarnessSuite,
} from './report-types.ts';

interface CommandResult {
  command: string;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  durationMs: number;
}

interface HarnessContext {
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

interface VerificationResult {
  checks: HarnessCheck[];
  comparisons: HarnessComparison[];
}

interface HarnessCaseDefinition {
  id: string;
  title: string;
  suite: HarnessSuite;
  args: (ctx: HarnessContext) => string[];
  beforeRun?: (ctx: HarnessContext) => Promise<void>;
  verify: (ctx: HarnessContext, result: CommandResult) => Promise<VerificationResult>;
  skipReason?: (ctx: HarnessContext) => string | undefined;
}

const DEFAULT_SUITE: HarnessSuite = 'core';

function parseSuite(argv: string[]): HarnessSuite {
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

function formatCliCommand(args: string[]): string {
  const escaped = args.map((arg) => (/\s/.test(arg) ? JSON.stringify(arg) : arg));
  return `bun src/cli/index.ts ${escaped.join(' ')}`;
}

function toPosixPath(value: string): string {
  return value.split(sep).join('/');
}

function toArtifactRelative(artifactsRoot: string, absolutePath: string): string {
  return toPosixPath(relative(artifactsRoot, absolutePath));
}

async function ensureDir(path: string): Promise<void> {
  await mkdir(path, { recursive: true });
}

async function prepareArtifacts(artifactsRoot: string): Promise<void> {
  await rm(artifactsRoot, { recursive: true, force: true });
  await ensureDir(join(artifactsRoot, 'stdout'));
  await ensureDir(join(artifactsRoot, 'stderr'));
  await ensureDir(join(artifactsRoot, 'actual'));
  await ensureDir(join(artifactsRoot, 'diff'));
  await ensureDir(join(artifactsRoot, 'expected'));
}

async function runCliCommand(
  projectRoot: string,
  args: string[],
  envPatch?: Record<string, string>,
): Promise<CommandResult> {
  const command = formatCliCommand(args);
  const startedAt = Date.now();

  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn('bun', ['src/cli/index.ts', ...args], {
      cwd: projectRoot,
      env: {
        ...process.env,
        ...envPatch,
      },
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk: Buffer | string) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk: Buffer | string) => {
      stderr += chunk.toString();
    });

    child.on('error', (error) => {
      rejectPromise(error);
    });

    child.on('close', (exitCode) => {
      resolvePromise({
        command,
        stdout,
        stderr,
        exitCode,
        durationMs: Date.now() - startedAt,
      });
    });
  });
}

function makeCheck(name: string, passed: boolean, successDetail: string, failureDetail: string): HarnessCheck {
  return {
    name,
    passed,
    detail: passed ? successDetail : failureDetail,
  };
}

async function fileExists(path: string): Promise<boolean> {
  return existsSync(path);
}

function createSimpleDiff(expectedText: string, actualText: string): string {
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

async function collectMarkdownFiles(rootDir: string, currentDir = rootDir): Promise<string[]> {
  if (!existsSync(currentDir)) {
    return [];
  }

  const entries = await readdir(currentDir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const absolute = join(currentDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectMarkdownFiles(rootDir, absolute)));
      continue;
    }

    if (!entry.isFile() || !entry.name.endsWith('.md')) {
      continue;
    }

    files.push(toPosixPath(relative(rootDir, absolute)));
  }

  return files.sort();
}

async function compareMarkdown(
  ctx: HarnessContext,
  comparisonId: string,
  label: string,
  expectedPath: string,
  actualPath: string,
  diffPath: string,
): Promise<{ check: HarnessCheck; comparison: HarnessComparison }> {
  const expectedExists = await fileExists(expectedPath);
  const actualExists = await fileExists(actualPath);
  const expectedSnapshotPath = join(ctx.artifactsRoot, 'expected', `${comparisonId}.md`);

  const comparison: HarnessComparison = {
    id: comparisonId,
    label,
    expectedPath: undefined,
    actualPath: actualExists ? toArtifactRelative(ctx.artifactsRoot, actualPath) : undefined,
    matched: false,
  };

  if (expectedExists) {
    await ensureDir(dirname(expectedSnapshotPath));
    await writeFile(expectedSnapshotPath, await readFile(expectedPath, 'utf8'), 'utf8');
    comparison.expectedPath = toArtifactRelative(ctx.artifactsRoot, expectedSnapshotPath);
  }

  if (!expectedExists || !actualExists) {
    const check = makeCheck(
      `${label} markdown 일치`,
      false,
      `${label} markdown 일치`,
      `${label}: ${!expectedExists ? 'expected 누락' : ''}${!expectedExists && !actualExists ? ', ' : ''}${!actualExists ? 'actual 누락' : ''}`,
    );
    return { check, comparison };
  }

  const expectedNormalized = normalizeMarkdown(await readFile(expectedPath, 'utf8'));
  const actualNormalized = normalizeMarkdown(await readFile(actualPath, 'utf8'));
  const matched = expectedNormalized === actualNormalized;

  comparison.matched = matched;

  if (!matched) {
    await ensureDir(dirname(diffPath));
    await writeFile(diffPath, createSimpleDiff(expectedNormalized, actualNormalized), 'utf8');
    comparison.diffPath = toArtifactRelative(ctx.artifactsRoot, diffPath);
  }

  const check = makeCheck(
    `${label} markdown 일치`,
    matched,
    `${label}: expected와 actual이 일치합니다.`,
    `${label}: markdown 내용이 다릅니다.${matched ? '' : ` diff: ${toArtifactRelative(ctx.artifactsRoot, diffPath)}`}`,
  );

  return { check, comparison };
}

async function executeCase(definition: HarnessCaseDefinition, ctx: HarnessContext): Promise<HarnessCaseReport> {
  const stdoutFile = join(ctx.stdoutRoot, `${definition.id}.log`);
  const stderrFile = join(ctx.stderrRoot, `${definition.id}.log`);
  await ensureDir(dirname(stdoutFile));
  await ensureDir(dirname(stderrFile));

  const args = definition.args(ctx);
  const commandPreview = formatCliCommand(args);

  const skippedReason = definition.skipReason?.(ctx);
  if (skippedReason) {
    await writeFile(stdoutFile, `SKIPPED: ${skippedReason}\n`, 'utf8');
    await writeFile(stderrFile, '', 'utf8');

    return {
      id: definition.id,
      title: definition.title,
      suite: definition.suite,
      status: 'SKIPPED',
      command: commandPreview,
      durationMs: 0,
      exitCode: null,
      skippedReason,
      stdoutPath: toArtifactRelative(ctx.artifactsRoot, stdoutFile),
      stderrPath: toArtifactRelative(ctx.artifactsRoot, stderrFile),
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

  let commandResult: CommandResult;
  try {
    if (definition.beforeRun) {
      await definition.beforeRun(ctx);
    }

    commandResult = await runCliCommand(ctx.projectRoot, args);
  } catch (error) {
    const message = error instanceof Error ? error.stack ?? error.message : String(error);
    await writeFile(stdoutFile, '', 'utf8');
    await writeFile(stderrFile, `${message}\n`, 'utf8');

    return {
      id: definition.id,
      title: definition.title,
      suite: definition.suite,
      status: 'FAILED',
      command: commandPreview,
      durationMs: 0,
      exitCode: null,
      stdoutPath: toArtifactRelative(ctx.artifactsRoot, stdoutFile),
      stderrPath: toArtifactRelative(ctx.artifactsRoot, stderrFile),
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

  await writeFile(stdoutFile, commandResult.stdout, 'utf8');
  await writeFile(stderrFile, commandResult.stderr, 'utf8');

  const verification = await definition.verify(ctx, commandResult);
  const status = verification.checks.every((check) => check.passed) ? 'PASSED' : 'FAILED';

  return {
    id: definition.id,
    title: definition.title,
    suite: definition.suite,
    status,
    command: commandResult.command,
    durationMs: commandResult.durationMs,
    exitCode: commandResult.exitCode,
    stdoutPath: toArtifactRelative(ctx.artifactsRoot, stdoutFile),
    stderrPath: toArtifactRelative(ctx.artifactsRoot, stderrFile),
    checks: verification.checks,
    comparisons: verification.comparisons,
  };
}

function getCaseDefinitions(): HarnessCaseDefinition[] {
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
        await ensureDir(join(ctx.actualRoot, 'convert'));
      },
      verify: async (ctx, result) => {
        const checks: HarnessCheck[] = [];
        const comparisons: HarnessComparison[] = [];

        const actualPath = join(ctx.actualRoot, 'convert', 'intro.md');
        const expectedPath = join(ctx.expectedRoot, 'convert', 'intro.md');
        const diffPath = join(ctx.diffRoot, 'core-convert-intro.diff');

        checks.push(
          makeCheck(
            'exit code',
            result.exitCode === 0,
            '종료코드 0',
            `종료코드가 0이 아닙니다: ${String(result.exitCode)}`,
          ),
        );

        const actualExists = await fileExists(actualPath);
        checks.push(
          makeCheck(
            'output file 생성',
            actualExists,
            `파일 생성됨: ${toArtifactRelative(ctx.artifactsRoot, actualPath)}`,
            `파일 생성 실패: ${toArtifactRelative(ctx.artifactsRoot, actualPath)}`,
          ),
        );

        const compared = await compareMarkdown(
          ctx,
          'core-convert-intro-markdown',
          'core-convert-intro',
          expectedPath,
          actualPath,
          diffPath,
        );
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
        await ensureDir(join(ctx.actualRoot, 'convert'));
      },
      verify: async (ctx, result) => {
        const checks: HarnessCheck[] = [];
        const comparisons: HarnessComparison[] = [];

        const actualPath = join(ctx.actualRoot, 'convert', 'spa.md');
        const expectedPath = join(ctx.expectedRoot, 'convert', 'spa.md');
        const diffPath = join(ctx.diffRoot, 'core-convert-spa.diff');

        checks.push(
          makeCheck(
            'exit code',
            result.exitCode === 0,
            '종료코드 0',
            `종료코드가 0이 아닙니다: ${String(result.exitCode)}`,
          ),
        );

        const actualExists = await fileExists(actualPath);
        checks.push(
          makeCheck(
            'output file 생성',
            actualExists,
            `파일 생성됨: ${toArtifactRelative(ctx.artifactsRoot, actualPath)}`,
            `파일 생성 실패: ${toArtifactRelative(ctx.artifactsRoot, actualPath)}`,
          ),
        );

        let hasDynamicHeading = false;
        if (actualExists) {
          const text = await readFile(actualPath, 'utf8');
          hasDynamicHeading = text.includes('SPA Dynamic Heading');
        }

        checks.push(
          makeCheck(
            '동적 렌더링 텍스트 포함',
            hasDynamicHeading,
            'Playwright 렌더링 결과가 포함되었습니다.',
            '동적 렌더링 텍스트(SPA Dynamic Heading)를 찾지 못했습니다.',
          ),
        );

        const compared = await compareMarkdown(
          ctx,
          'core-convert-spa-markdown',
          'core-convert-spa',
          expectedPath,
          actualPath,
          diffPath,
        );
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
        await ensureDir(join(ctx.actualRoot, 'crawl'));
      },
      verify: async (ctx, result) => {
        const checks: HarnessCheck[] = [];
        const comparisons: HarnessComparison[] = [];

        const crawlRoot = join(ctx.actualRoot, 'crawl');
        const expectedFiles = ['docs/advanced.md', 'docs/intro.md', 'docs/spa.md'];
        const actualFiles = await collectMarkdownFiles(crawlRoot);

        checks.push(
          makeCheck(
            'exit code',
            result.exitCode === 0,
            '종료코드 0',
            `종료코드가 0이 아닙니다: ${String(result.exitCode)}`,
          ),
        );

        const sameFileSet = JSON.stringify(actualFiles) === JSON.stringify(expectedFiles);
        checks.push(
          makeCheck(
            '생성 파일 목록 정확성',
            sameFileSet,
            `생성 파일: ${actualFiles.join(', ')}`,
            `예상: ${expectedFiles.join(', ')} / 실제: ${actualFiles.join(', ') || '(없음)'}`,
          ),
        );

        const outsideGenerated = actualFiles.includes('blog/outside.md');
        checks.push(
          makeCheck(
            'outside 링크 제외',
            !outsideGenerated,
            'out-of-scope 페이지는 생성되지 않았습니다.',
            'out-of-scope 페이지가 생성되었습니다: blog/outside.md',
          ),
        );

        const pairs: Array<{ id: string; label: string; expected: string; actual: string; diff: string }> = [
          {
            id: 'core-crawl-intro-markdown',
            label: 'core-crawl-docs intro',
            expected: join(ctx.expectedRoot, 'crawl', 'docs-intro.md'),
            actual: join(crawlRoot, 'docs', 'intro.md'),
            diff: join(ctx.diffRoot, 'core-crawl-docs-intro.diff'),
          },
          {
            id: 'core-crawl-advanced-markdown',
            label: 'core-crawl-docs advanced',
            expected: join(ctx.expectedRoot, 'crawl', 'docs-advanced.md'),
            actual: join(crawlRoot, 'docs', 'advanced.md'),
            diff: join(ctx.diffRoot, 'core-crawl-docs-advanced.diff'),
          },
          {
            id: 'core-crawl-spa-markdown',
            label: 'core-crawl-docs spa',
            expected: join(ctx.expectedRoot, 'crawl', 'docs-spa.md'),
            actual: join(crawlRoot, 'docs', 'spa.md'),
            diff: join(ctx.diffRoot, 'core-crawl-docs-spa.diff'),
          },
        ];

        for (const pair of pairs) {
          const compared = await compareMarkdown(ctx, pair.id, pair.label, pair.expected, pair.actual, pair.diff);
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
          makeCheck(
            'exit code',
            result.exitCode === 1,
            '종료코드 1',
            `종료코드가 1이 아닙니다: ${String(result.exitCode)}`,
          ),
        );

        checks.push(
          makeCheck(
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
        await ensureDir(join(ctx.actualRoot, 'llm'));
      },
      skipReason: () => {
        const required = ['OPENAI_API_BASE_URL', 'OPENAI_API_KEY', 'OPENAI_API_MODEL'];
        const missing = required.filter((key) => !process.env[key]);
        if (missing.length === 0) {
          return undefined;
        }
        return `환경변수 누락으로 스킵: ${missing.join(', ')}`;
      },
      verify: async (ctx, result) => {
        const checks: HarnessCheck[] = [];
        const actualPath = join(ctx.actualRoot, 'llm', 'translate-ko.md');

        checks.push(
          makeCheck(
            'exit code',
            result.exitCode === 0,
            '종료코드 0',
            `종료코드가 0이 아닙니다: ${String(result.exitCode)}`,
          ),
        );

        const actualExists = await fileExists(actualPath);
        checks.push(
          makeCheck(
            'output file 생성',
            actualExists,
            `파일 생성됨: ${toArtifactRelative(ctx.artifactsRoot, actualPath)}`,
            `파일 생성 실패: ${toArtifactRelative(ctx.artifactsRoot, actualPath)}`,
          ),
        );

        let nonEmpty = false;
        if (actualExists) {
          const text = await readFile(actualPath, 'utf8');
          nonEmpty = text.trim().length > 0;
        }

        checks.push(
          makeCheck(
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

function summarize(cases: HarnessCaseReport[]): HarnessReport['summary'] {
  return {
    total: cases.length,
    passed: cases.filter((entry) => entry.status === 'PASSED').length,
    failed: cases.filter((entry) => entry.status === 'FAILED').length,
    skipped: cases.filter((entry) => entry.status === 'SKIPPED').length,
  };
}

async function writeSummaryMarkdown(report: HarnessReport, targetPath: string): Promise<void> {
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
  await writeFile(targetPath, `${lines.join('\n')}\n`, 'utf8');
}

async function main(): Promise<void> {
  const suite = parseSuite(process.argv.slice(2));

  const projectRoot = resolve(import.meta.dir, '..', '..');
  const harnessRoot = resolve(projectRoot, 'test-harness');
  const artifactsRoot = resolve(harnessRoot, 'artifacts', 'latest');

  await prepareArtifacts(artifactsRoot);

  const fixtureServer = startFixtureServer(41730);

  const context: HarnessContext = {
    suite,
    projectRoot,
    expectedRoot: resolve(harnessRoot, 'expected'),
    artifactsRoot,
    stdoutRoot: join(artifactsRoot, 'stdout'),
    stderrRoot: join(artifactsRoot, 'stderr'),
    actualRoot: join(artifactsRoot, 'actual'),
    diffRoot: join(artifactsRoot, 'diff'),
    fixtureOrigin: fixtureServer.origin,
  };

  const cases = getCaseDefinitions().filter((definition) => definition.suite === suite);
  const results: HarnessCaseReport[] = [];

  try {
    for (const definition of cases) {
      const report = await executeCase(definition, context);
      results.push(report);
      console.error(
        `[HARNESS] ${report.id}: ${report.status} (exit=${report.exitCode ?? 'n/a'}, duration=${report.durationMs}ms)`,
      );
    }
  } finally {
    fixtureServer.stop();
  }

  const report: HarnessReport = {
    generatedAt: new Date().toISOString(),
    suite,
    fixtureOrigin: context.fixtureOrigin,
    artifactsRoot: toPosixPath(artifactsRoot),
    summary: summarize(results),
    cases: results,
  };

  const reportPath = join(artifactsRoot, 'report.json');
  const summaryPath = join(artifactsRoot, 'summary.md');
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeSummaryMarkdown(report, summaryPath);

  console.error(`[HARNESS] report: ${reportPath}`);
  console.error(`[HARNESS] summary: ${summaryPath}`);

  if (report.summary.failed > 0) {
    process.exit(1);
  }
}

main().catch(async (error) => {
  const projectRoot = resolve(import.meta.dir, '..', '..');
  const artifactsRoot = resolve(projectRoot, 'test-harness', 'artifacts', 'latest');
  await ensureDir(artifactsRoot);

  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  await writeFile(join(artifactsRoot, 'fatal.log'), `${message}\n`, 'utf8');
  console.error('[HARNESS] fatal error');
  console.error(message);
  process.exit(1);
});
