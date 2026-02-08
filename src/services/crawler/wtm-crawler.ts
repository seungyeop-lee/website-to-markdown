/**
 * WtmCrawler
 * 책임: 다중 페이지 크롤링 오케스트레이션
 */

import { logger } from '../../infrastructure/logger.ts';
import { normalizeUrl } from '../../utils/url-normalizer.ts';
import type { CrawlConfig } from './crawl-config.ts';
import { UrlScopeFilter } from './url-scope-filter.ts';
import { WtmFileWriter } from './wtm-file-writer.ts';
import type {WtmConverter} from "../base/types.ts";

export interface CrawlResult {
  succeeded: string[];
  failed: { url: string; error: string }[];
  skipped: string[];
}

export class WtmCrawler {
  private readonly config: CrawlConfig;
  private readonly converter: WtmConverter;

  constructor(converter: WtmConverter, config: CrawlConfig) {
    this.converter = converter;
    this.config = config;
  }

  async crawl(startUrl: string): Promise<CrawlResult> {
    const writer = new WtmFileWriter(this.converter, this.config.outputDir);
    const scopeFilter = new UrlScopeFilter(startUrl, this.config.scopeLevels, this.config.maxPathDepth);

    const visited = new Set<string>();
    const succeeded: string[] = [];
    const failed: { url: string; error: string }[] = [];
    const skipped: string[] = [];
    let processedCount = 0;

    let queue: { url: string; depth: number }[] = [{ url: startUrl, depth: 0 }];
    visited.add(normalizeUrl(startUrl));

    logger.debug(`크롤링 설정: maxLinkDepth=${this.config.maxLinkDepth}, maxPathDepth=${this.config.maxPathDepth}, concurrency=${this.config.concurrency}, scopeLevels=${this.config.scopeLevels}`);

    while (queue.length > 0) {
      const batch = queue.splice(0, this.config.concurrency);
      const nextQueue: { url: string; depth: number }[] = [];

      logger.debug(`배치 처리 시작: ${batch.length}개, 남은 큐: ${queue.length}개`);

      const results = await Promise.allSettled(
        batch.map(async ({ url, depth }) => {
          logger.info(`크롤링 #${++processedCount} (depth ${depth}/${this.config.maxLinkDepth}): ${url}`);
          const result = await writer.write(url);
          return { url, depth, links: result.metadata.links };
        }),
      );

      this.processBatchResults(results, batch, {
        succeeded, failed, skipped, nextQueue,
        visited, scopeFilter, processedCount,
      });

      queue = [...queue, ...nextQueue];
      logger.debug(`배치 완료: 성공 ${succeeded.length}, 실패 ${failed.length}, 대기 큐 ${queue.length}개`);
    }

    logger.info(`크롤링 완료: 성공 ${succeeded.length}, 실패 ${failed.length}, 스킵 ${skipped.length}`);
    return { succeeded, failed, skipped };
  }

  private processBatchResults(
    results: PromiseSettledResult<{ url: string; depth: number; links: string[] }>[],
    batch: { url: string; depth: number }[],
    ctx: {
      succeeded: string[];
      failed: { url: string; error: string }[];
      skipped: string[];
      nextQueue: { url: string; depth: number }[];
      visited: Set<string>;
      scopeFilter: UrlScopeFilter;
      processedCount: number;
    },
  ): void {
    for (let i = 0; i < results.length; i++) {
      const settledResult = results[i]!;
      const { url, depth } = batch[i]!;

      if (settledResult.status === 'fulfilled') {
        ctx.succeeded.push(url);
        if (depth < this.config.maxLinkDepth) {
          this.enqueueDiscoveredLinks(settledResult.value.links, depth, ctx);
        } else {
          logger.debug(`최대 link-depth 도달, 링크 수집 스킵: ${url}`);
        }
      } else {
        const error = settledResult.reason instanceof Error
          ? settledResult.reason.message
          : String(settledResult.reason);
        ctx.failed.push({ url, error });
        logger.info(`크롤링 실패 #${ctx.processedCount} : ${url} - ${error}`);
      }
    }
  }

  private enqueueDiscoveredLinks(
    links: string[],
    depth: number,
    ctx: {
      skipped: string[];
      nextQueue: { url: string; depth: number }[];
      visited: Set<string>;
      scopeFilter: UrlScopeFilter;
    },
  ): void {
    let added = 0;
    let duplicated = 0;
    let outOfScope = 0;

    for (const link of links) {
      const normalizedLink = normalizeUrl(link);
      if (ctx.visited.has(normalizedLink)) {
        duplicated++;
        continue;
      }
      ctx.visited.add(normalizedLink);

      if (!ctx.scopeFilter.isInScope(link)) {
        ctx.skipped.push(link);
        outOfScope++;
        continue;
      }

      ctx.nextQueue.push({ url: link, depth: depth + 1 });
      added++;
    }

    logger.debug(`링크 분석: 발견 ${links.length}, 추가 ${added}, 중복 ${duplicated}, scope 밖 ${outOfScope}`);
  }

}
