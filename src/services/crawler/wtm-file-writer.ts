/**
 * WtmFileWriter
 * 책임: wtm() 호출 + markdown을 파일로 저장
 */

import { logger } from '../../infrastructure/logger.ts';
import type { WtmOptions, WtmResult } from '../../types.ts';

export type WtmFn = (url: string, options?: WtmOptions) => Promise<WtmResult>;

export class WtmFileWriter {
  constructor(
    private wtmFn: WtmFn,
    private outputDir: string,
    private wtmOptions?: WtmOptions,
  ) {}

  async write(url: string): Promise<WtmResult> {
    const result = await this.wtmFn(url, this.wtmOptions);
    const filePath = this.resolveFilePath(url);

    await Bun.write(filePath, result.markdown);
    logger.info(`저장 완료: ${filePath}`);

    return result;
  }

  resolveFilePath(url: string): string {
    const urlObj = new URL(url);
    let pathname = urlObj.pathname;

    // 트레일링 슬래시 제거
    if (pathname.endsWith('/')) {
      pathname = pathname.slice(0, -1);
    }

    // 루트 또는 빈 경로
    if (!pathname || pathname === '') {
      return `${this.outputDir}/index.md`;
    }

    // 이미 확장자가 있는 경우 .md로 대체
    const lastSegment = pathname.split('/').pop()!;
    if (lastSegment.includes('.')) {
      const withoutExt = pathname.replace(/\.[^.]+$/, '');
      return `${this.outputDir}${withoutExt}.md`;
    }

    return `${this.outputDir}${pathname}.md`;
  }
}
