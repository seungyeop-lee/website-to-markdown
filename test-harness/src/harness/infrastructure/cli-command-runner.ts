/**
 * 책임: wtm CLI 프로세스를 실행하고 stdout/stderr/종료코드를 수집한다.
 * 협력: case-executor가 케이스별 인자를 전달해 명령 실행을 위임한다.
 * 비책임: 케이스 검증 판단이나 리포트 저장은 담당하지 않는다.
 */

import { spawn } from 'node:child_process';
import type { CommandResult } from '../domain/harness-types.ts';

/** 프로젝트 루트 기준으로 CLI 실행을 담당한다. */
export class CliCommandRunner {
  public constructor(private readonly projectRoot: string) {}

  /** 케이스 인자로 실행될 CLI 명령 문자열을 생성한다. */
  public previewCommand(args: string[]): string {
    const escaped = args.map((arg) => (/\s/.test(arg) ? JSON.stringify(arg) : arg));
    return `bun src/cli/index.ts ${escaped.join(' ')}`;
  }

  /** CLI를 실행하고 실행 결과를 반환한다. */
  public async run(args: string[], envPatch?: Record<string, string>): Promise<CommandResult> {
    const command = this.previewCommand(args);
    const startedAt = Date.now();

    return await new Promise((resolvePromise, rejectPromise) => {
      const child = spawn('bun', ['src/cli/index.ts', ...args], {
        cwd: this.projectRoot,
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
}
