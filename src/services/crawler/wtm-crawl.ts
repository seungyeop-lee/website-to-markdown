/**
 * wtmCrawl 라이브러리 facade
 * 책임: DI 조립 → 크롤링 실행 → 리소스 정리
 */

import {BrowserManager} from '../../infrastructure/browser-manager.ts';
import type {CrawlOptions} from '../../types.ts';
import {WtmConfig} from '../wtm/wtm-config.ts';
import {DefaultWtmConverter} from '../wtm/wtm-converter.ts';
import {CrawlConfig} from './crawl-config.ts';
import {type CrawlResult, WtmCrawler} from './wtm-crawler.ts';
import {WtmFileWriter} from '../base/wtm-file-writer.ts';

export type { CrawlResult };

/**
 * 시작 URL에서 링크를 따라가며 크롤링하여 Markdown으로 변환한다.
 */
export async function wtmCrawl(startUrl: string, options: CrawlOptions): Promise<CrawlResult> {
  const browserManager = new BrowserManager();
  try {
    const crawlConfig = new CrawlConfig(options);
    const converter = new DefaultWtmConverter(browserManager, new WtmConfig(options));
    const writer = new WtmFileWriter(converter, crawlConfig.outputDir);
    const crawler = new WtmCrawler(writer, crawlConfig);
    return await crawler.crawl(startUrl);
  } finally {
    await browserManager.close();
  }
}
