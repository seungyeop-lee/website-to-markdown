/**
 * wtmUrls 라이브러리 facade
 * 책임: DI 조립 → 배치 변환 실행 → 리소스 정리
 */

import { BrowserManager } from '../../infrastructure/browser-manager.ts';
import type { BatchConvertOptions } from '../../types.ts';
import { WtmConfig } from '../wtm/wtm-config.ts';
import { DefaultWtmConverter } from '../wtm/wtm-converter.ts';
import { WtmFileWriter } from '../base/wtm-file-writer.ts';
import type { CrawlResult } from '../crawler/wtm-crawler.ts';
import { BatchConvertConfig } from './batch-convert-config.ts';
import { WtmBatchConverter } from './wtm-batch-converter.ts';

export type { CrawlResult };

/**
 * URL 목록을 받아 일괄 변환한다. 링크를 따라가지 않는다.
 */
export async function wtmUrls(urls: string[], options: BatchConvertOptions): Promise<CrawlResult> {
  const browserManager = BrowserManager.create(options.cdpUrl);
  try {
    const batchConfig = new BatchConvertConfig(options);
    const converter = new DefaultWtmConverter(browserManager, new WtmConfig(options));
    const writer = new WtmFileWriter(converter, batchConfig.outputDir);
    const batchConverter = new WtmBatchConverter(writer, batchConfig);
    return await batchConverter.convert(urls);
  } finally {
    await browserManager.close();
  }
}
