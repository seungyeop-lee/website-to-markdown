/**
 * WtmFileWriter
 * 책임: wtm() 호출 + markdown을 파일로 저장
 */

import { logger } from '../../infrastructure/logger.ts';
import type { WtmOptions, WtmResult } from '../../types.ts';

export type WtmFn = (url: string, options?: WtmOptions) => Promise<WtmResult>;

export class WtmFileWriter {
  private static readonly QUERY_SLUG_MAX_LENGTH = 80;

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
    const basePath = this.resolveBasePath(urlObj.pathname);

    if (!urlObj.searchParams.size) {
      return `${this.outputDir}${basePath}.md`;
    }

    const queryEntries = this.resolveSortedQueryEntries(urlObj.searchParams);
    const querySlug = this.resolveQuerySlug(queryEntries);
    const queryHash = this.hashQueryEntries(queryEntries);

    return `${this.outputDir}${basePath}__${querySlug}__h${queryHash}.md`;
  }

  private resolveBasePath(pathname: string): string {
    let normalizedPathname = pathname;

    // 트레일링 슬래시 제거
    if (normalizedPathname.endsWith('/')) {
      normalizedPathname = normalizedPathname.slice(0, -1);
    }

    // 루트 또는 빈 경로
    if (!normalizedPathname) {
      return '/index';
    }

    // 이미 확장자가 있는 경우 .md로 대체
    const lastSegment = normalizedPathname.split('/').pop()!;
    if (lastSegment.includes('.')) {
      return normalizedPathname.replace(/\.[^.]+$/, '');
    }

    return normalizedPathname;
  }

  private resolveSortedQueryEntries(searchParams: URLSearchParams): [string, string][] {
    return Array.from(searchParams.entries()).sort(([aKey, aValue], [bKey, bValue]) => {
      if (aKey === bKey) {
        return aValue.localeCompare(bValue);
      }
      return aKey.localeCompare(bKey);
    });
  }

  private resolveQuerySlug(queryEntries: [string, string][]): string {
    const rawSlug = queryEntries
      .map(([key, value]) => {
        const keyToken = this.toFileToken(key, 'key');
        const valueToken = this.toFileToken(value, 'empty');
        return `${keyToken}-${valueToken}`;
      })
      .join('_');

    const trimmedSlug = rawSlug.length > WtmFileWriter.QUERY_SLUG_MAX_LENGTH
      ? rawSlug.slice(0, WtmFileWriter.QUERY_SLUG_MAX_LENGTH).replace(/[-_]+$/, '')
      : rawSlug;

    return trimmedSlug || 'query';
  }

  private hashQueryEntries(queryEntries: [string, string][]): string {
    const canonicalQuery = queryEntries
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join('&');

    // FNV-1a 32-bit: 짧고 재현 가능한 파일명 해시
    let hash = 0x811c9dc5;
    for (const ch of canonicalQuery) {
      hash ^= ch.charCodeAt(0);
      hash = Math.imul(hash, 0x01000193);
    }

    return (hash >>> 0).toString(16).padStart(8, '0');
  }

  private toFileToken(input: string, fallback: string): string {
    const token = encodeURIComponent(input.trim())
      .toLowerCase()
      .replace(/%/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    return token || fallback;
  }
}
