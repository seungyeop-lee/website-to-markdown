/**
 * wtmCrawl 라이브러리 facade
 * 책임: DI 조립 → 크롤링 실행 → 리소스 정리
 */

import { BrowserManager } from '../../infrastructure/browser-manager.ts';
import { WtmConverter } from '../wtm/wtm-converter.ts';
import { WtmCrawler, type CrawlResult } from './wtm-crawler.ts';
import type { CrawlOptions } from '../../types.ts';

export type { CrawlResult };

/**
 * 시작 URL에서 링크를 따라가며 크롤링하여 Markdown으로 변환한다.
 */
export async function wtmCrawl(startUrl: string, options: CrawlOptions): Promise<CrawlResult> {
  const browserManager = new BrowserManager();
  try {
    const converter = new WtmConverter(browserManager, options.wtmOptions);
    const crawler = new WtmCrawler((url) => converter.convert(url), options);
    return await crawler.crawl(startUrl);
  } finally {
    await browserManager.close();
  }
}

/**
 * URL 목록을 받아 일괄 변환한다. 링크를 따라가지 않는다.
 */
export async function wtmCrawlUrls(urls: string[], options: CrawlOptions): Promise<CrawlResult> {
  const browserManager = new BrowserManager();
  try {
    const converter = new WtmConverter(browserManager, options.wtmOptions);
    const crawler = new WtmCrawler((url) => converter.convert(url), options);
    return await crawler.crawlUrls(urls);
  } finally {
    await browserManager.close();
  }
}
