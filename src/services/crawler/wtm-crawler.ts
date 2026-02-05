/**
 * WtmCrawler
 * 책임: 다중 페이지 크롤링 오케스트레이션
 */

import { BrowserManager } from '../../infrastructure/browser-manager.ts';
import { logger } from '../../infrastructure/logger.ts';
import type { CrawlOptions, WtmOptions } from '../../types.ts';
import { UrlScopeFilter } from './url-scope-filter.ts';
import { WtmFileWriter, type WtmFn } from './wtm-file-writer.ts';

export interface CrawlResult {
  succeeded: string[];
  failed: { url: string; error: string }[];
  skipped: string[];
}

export class WtmCrawler {
  private maxLinkDepth: number;
  private maxPathDepth?: number;
  private scopeLevels: number;
  private concurrency: number;
  private outputDir: string;
  private wtmOptions: WtmOptions;
  private wtmFn: WtmFn;

  constructor(wtmFn: WtmFn, options: CrawlOptions) {
    this.wtmFn = wtmFn;
    this.outputDir = options.outputDir;
    this.maxLinkDepth = options.maxLinkDepth ?? 3;
    this.maxPathDepth = options.maxPathDepth ?? 1;
    this.scopeLevels = options.scopeLevels ?? 0;
    this.concurrency = options.concurrency ?? 3;
    this.wtmOptions = { ...options.wtmOptions };
  }

  async crawl(startUrl: string): Promise<CrawlResult> {
    const browserManager = new BrowserManager();
    const wtmOptions: WtmOptions = { ...this.wtmOptions, browserManager };
    const writer = new WtmFileWriter(this.wtmFn, this.outputDir, wtmOptions);
    const scopeFilter = new UrlScopeFilter(startUrl, this.scopeLevels, this.maxPathDepth);

    const visited = new Set<string>();
    const succeeded: string[] = [];
    const failed: { url: string; error: string }[] = [];
    const skipped: string[] = [];
    let processedCount = 0;

    // BFS 큐: { url, depth }
    let queue: { url: string; depth: number }[] = [{ url: startUrl, depth: 0 }];
    visited.add(startUrl);

    logger.debug(`크롤링 설정: maxLinkDepth=${this.maxLinkDepth}, maxPathDepth=${this.maxPathDepth}, concurrency=${this.concurrency}, scopeLevels=${this.scopeLevels}`);

    try {
      while (queue.length > 0) {
        // 현재 배치에서 concurrency만큼 처리
        const batch = queue.splice(0, this.concurrency);
        const nextQueue: { url: string; depth: number }[] = [];

        logger.debug(`배치 처리 시작: ${batch.length}개, 남은 큐: ${queue.length}개`);

        const results = await Promise.allSettled(
          batch.map(async ({ url, depth }) => {
            logger.info(`크롤링 #${++processedCount} (depth ${depth}/${this.maxLinkDepth}): ${url}`);
            const result = await writer.write(url);
            return { url, depth, links: result.metadata.links };
          }),
        );

        for (let i = 0; i < results.length; i++) {
          const settledResult = results[i]!;
          const { url, depth } = batch[i]!;

          if (settledResult.status === 'fulfilled') {
            succeeded.push(url);
            const { links } = settledResult.value;

            if (depth < this.maxLinkDepth) {
              let added = 0;
              let duplicated = 0;
              let outOfScope = 0;

              for (const link of links) {
                if (visited.has(link)) {
                  duplicated++;
                  continue;
                }
                visited.add(link);

                if (!scopeFilter.isInScope(link)) {
                  skipped.push(link);
                  outOfScope++;
                  continue;
                }

                nextQueue.push({ url: link, depth: depth + 1 });
                added++;
              }

              logger.debug(`링크 분석 (${url}): 발견 ${links.length}, 추가 ${added}, 중복 ${duplicated}, scope 밖 ${outOfScope}`);
            } else {
              logger.debug(`최대 link-depth 도달, 링크 수집 스킵: ${url}`);
            }
          } else {
            const error = settledResult.reason instanceof Error
              ? settledResult.reason.message
              : String(settledResult.reason);
            failed.push({ url, error });
            logger.info(`크롤링 실패 #${processedCount} : ${url} - ${error}`);
          }
        }

        queue = [...queue, ...nextQueue];
        logger.debug(`배치 완료: 성공 ${succeeded.length}, 실패 ${failed.length}, 대기 큐 ${queue.length}개`);
      }
    } finally {
      await browserManager.close();
    }

    logger.info(`크롤링 완료: 성공 ${succeeded.length}, 실패 ${failed.length}, 스킵 ${skipped.length}`);
    return { succeeded, failed, skipped };
  }

  async crawlUrls(urls: string[]): Promise<CrawlResult> {
    const browserManager = new BrowserManager();
    const wtmOptions: WtmOptions = { ...this.wtmOptions, browserManager };
    const writer = new WtmFileWriter(this.wtmFn, this.outputDir, wtmOptions);

    const succeeded: string[] = [];
    const failed: { url: string; error: string }[] = [];

    try {
      // concurrency만큼 배치 처리
      let processedCount = 0;
      for (let i = 0; i < urls.length; i += this.concurrency) {
        const batch = urls.slice(i, i + this.concurrency);

        const results = await Promise.allSettled(
          batch.map(async (url) => {
            logger.info(`변환 #${++processedCount}/${urls.length}: ${url}`);
            await writer.write(url);
            return url;
          }),
        );

        for (const result of results) {
          if (result.status === 'fulfilled') {
            succeeded.push(result.value);
          } else {
            const url = batch[results.indexOf(result)]!;
            const error = result.reason instanceof Error
              ? result.reason.message
              : String(result.reason);
            failed.push({ url, error });
            logger.info(`변환 실패: ${url} - ${error}`);
          }
        }
      }
    } finally {
      await browserManager.close();
    }

    logger.info(`변환 완료: 성공 ${succeeded.length}, 실패 ${failed.length}`);
    return { succeeded, failed, skipped: [] };
  }
}
