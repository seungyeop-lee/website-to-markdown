/**
 * WtmBatchConverter
 * 책임: URL 목록을 받아 배치 변환
 */

import { logger } from '../../infrastructure/logger.ts';
import type { WtmConverter } from '../base/types.ts';
import { WtmFileWriter } from '../crawler/wtm-file-writer.ts';
import type { CrawlResult } from '../crawler/wtm-crawler.ts';
import type { BatchConvertConfig } from './batch-convert-config.ts';

export class WtmBatchConverter {
  private readonly converter: WtmConverter;
  private readonly config: BatchConvertConfig;

  constructor(converter: WtmConverter, config: BatchConvertConfig) {
    this.converter = converter;
    this.config = config;
  }

  async convert(urls: string[]): Promise<CrawlResult> {
    const writer = new WtmFileWriter(this.converter, this.config.outputDir);

    const succeeded: string[] = [];
    const failed: { url: string; error: string }[] = [];

    let processedCount = 0;
    for (let i = 0; i < urls.length; i += this.config.concurrency) {
      const batch = urls.slice(i, i + this.config.concurrency);

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

    logger.info(`변환 완료: 성공 ${succeeded.length}, 실패 ${failed.length}`);
    return { succeeded, failed, skipped: [] };
  }
}
