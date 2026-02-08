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

export type { CrawlResult };

/**
 * 시작 URL에서 링크를 따라가며 크롤링하여 Markdown으로 변환한다.
 */
export async function wtmCrawl(startUrl: string, options: CrawlOptions): Promise<CrawlResult> {
  const browserManager = new BrowserManager();
  try {
    const converter = new DefaultWtmConverter(browserManager, new WtmConfig(options));
    const crawler = new WtmCrawler(converter, new CrawlConfig(options));
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
    const wtmConfig = new WtmConfig(options);
    const converter = new DefaultWtmConverter(browserManager, wtmConfig);
    const crawlConfig = new CrawlConfig(options);
    const crawler = new WtmCrawler(converter, crawlConfig);
    return await crawler.crawlUrls(urls);
  } finally {
    await browserManager.close();
  }
}
