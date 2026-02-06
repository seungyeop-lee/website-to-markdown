/**
 * 책임: 하니스 아티팩트 경로 계산과 파일 I/O를 일관된 방식으로 제공한다.
 * 협력: case-executor/comparison/report-writer/runner가 공통 저장소로 사용한다.
 * 비책임: 테스트 케이스 판단 로직이나 CLI 실행은 담당하지 않는다.
 */

import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';
import type { HarnessContext, HarnessSuite } from '../domain/harness-types.ts';

/** 아티팩트 루트/서브 디렉토리 정보를 캡슐화한다. */
export class ArtifactStore {
  public readonly harnessRoot: string;
  public readonly artifactsRoot: string;
  public readonly expectedRoot: string;
  public readonly stdoutRoot: string;
  public readonly stderrRoot: string;
  public readonly actualRoot: string;
  public readonly diffRoot: string;

  public constructor(
    private readonly projectRoot: string,
    harnessRoot = resolve(projectRoot, 'test-harness'),
  ) {
    this.harnessRoot = harnessRoot;
    this.artifactsRoot = resolve(this.harnessRoot, 'artifacts', 'latest');
    this.expectedRoot = resolve(this.harnessRoot, 'expected');
    this.stdoutRoot = join(this.artifactsRoot, 'stdout');
    this.stderrRoot = join(this.artifactsRoot, 'stderr');
    this.actualRoot = join(this.artifactsRoot, 'actual');
    this.diffRoot = join(this.artifactsRoot, 'diff');
  }

  /** 프로젝트 루트 기준 기본 하니스 경로를 사용하는 저장소를 생성한다. */
  public static fromProjectRoot(projectRoot: string): ArtifactStore {
    return new ArtifactStore(projectRoot);
  }

  /** 하니스 실행 컨텍스트를 생성한다. */
  public createContext(suite: HarnessSuite, fixtureOrigin: string): HarnessContext {
    return {
      suite,
      projectRoot: this.projectRoot,
      expectedRoot: this.expectedRoot,
      artifactsRoot: this.artifactsRoot,
      stdoutRoot: this.stdoutRoot,
      stderrRoot: this.stderrRoot,
      actualRoot: this.actualRoot,
      diffRoot: this.diffRoot,
      fixtureOrigin,
    };
  }

  /** 케이스 로그 파일(stdout) 절대 경로를 반환한다. */
  public getStdoutPath(caseId: string): string {
    return join(this.stdoutRoot, `${caseId}.log`);
  }

  /** 케이스 로그 파일(stderr) 절대 경로를 반환한다. */
  public getStderrPath(caseId: string): string {
    return join(this.stderrRoot, `${caseId}.log`);
  }

  /** 파일/디렉토리 존재 여부를 반환한다. */
  public async fileExists(path: string): Promise<boolean> {
    return existsSync(path);
  }

  /** UTF-8 텍스트 파일을 읽는다. */
  public async readText(path: string): Promise<string> {
    return await readFile(path, 'utf8');
  }

  /** 부모 디렉토리를 만든 뒤 UTF-8 텍스트를 기록한다. */
  public async writeText(path: string, content: string): Promise<void> {
    await this.ensureDir(dirname(path));
    await writeFile(path, content, 'utf8');
  }

  /** 디렉토리를 재귀적으로 생성한다. */
  public async ensureDir(path: string): Promise<void> {
    await mkdir(path, { recursive: true });
  }

  /** 하니스 아티팩트 디렉토리를 초기화한다. */
  public async prepareArtifacts(): Promise<void> {
    await rm(this.artifactsRoot, { recursive: true, force: true });
    await this.ensureDir(this.stdoutRoot);
    await this.ensureDir(this.stderrRoot);
    await this.ensureDir(this.actualRoot);
    await this.ensureDir(this.diffRoot);
    await this.ensureDir(join(this.artifactsRoot, 'expected'));
  }

  /** 아티팩트 루트 기준 상대 경로를 POSIX 형식으로 반환한다. */
  public toArtifactRelative(absolutePath: string): string {
    return this.toPosixPath(relative(this.artifactsRoot, absolutePath));
  }

  /** JSON 리포트 절대 경로를 반환한다. */
  public getReportPath(): string {
    return join(this.artifactsRoot, 'report.json');
  }

  /** 마크다운 요약 파일 절대 경로를 반환한다. */
  public getSummaryPath(): string {
    return join(this.artifactsRoot, 'summary.md');
  }

  /** 치명 오류 로그 절대 경로를 반환한다. */
  public getFatalLogPath(): string {
    return join(this.artifactsRoot, 'fatal.log');
  }

  /** 아티팩트 루트를 POSIX 경로로 반환한다. */
  public getArtifactsRootPosix(): string {
    return this.toPosixPath(this.artifactsRoot);
  }

  /** 하위 폴더의 마크다운 파일 목록을 상대 경로 배열로 수집한다. */
  public async collectMarkdownFiles(rootDir: string, currentDir = rootDir): Promise<string[]> {
    if (!existsSync(currentDir)) {
      return [];
    }

    const entries = await readdir(currentDir, { withFileTypes: true });
    const files: string[] = [];

    for (const entry of entries) {
      const absolute = join(currentDir, entry.name);
      if (entry.isDirectory()) {
        files.push(...(await this.collectMarkdownFiles(rootDir, absolute)));
        continue;
      }

      if (!entry.isFile() || !entry.name.endsWith('.md')) {
        continue;
      }

      files.push(this.toPosixPath(relative(rootDir, absolute)));
    }

    return files.sort();
  }

  private toPosixPath(value: string): string {
    return value.split(sep).join('/');
  }
}
