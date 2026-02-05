import { test, expect, describe, mock, beforeEach } from 'bun:test';
import { WtmCrawler } from './wtm-crawler.ts';
import type { WtmResult, WtmOptions } from '../../types.ts';

// BrowserManager mock: BrowserManager import 시 close가 호출되므로 mock 필요
const mockClose = mock(() => Promise.resolve());
const mockGetBrowser = mock(() => Promise.resolve({}));

mock.module('../../infrastructure/browser-manager.ts', () => ({
  BrowserManager: class {
    close = mockClose;
    getBrowser = mockGetBrowser;
  },
}));

// Bun.write mock
const writtenFiles: { path: string; content: string }[] = [];
// @ts-expect-error: mock Bun.write
Bun.write = mock((path: string, content: string) => {
  writtenFiles.push({ path, content });
  return Promise.resolve(content.length);
});

function makeResult(url: string, links: string[] = []): WtmResult {
  const urlObj = new URL(url);
  return {
    markdown: `# Page: ${url}`,
    metadata: {
      url,
      origin: urlObj.origin,
      pathname: urlObj.pathname,
      title: `Title: ${url}`,
      links,
    },
  };
}

describe('WtmCrawler', () => {
  beforeEach(() => {
    mockClose.mockClear();
    writtenFiles.length = 0;
  });

  describe('crawl', () => {
    test('시작 URL만 크롤링 (링크 없음)', async () => {
      const wtmFn = mock((_url: string, _opts?: WtmOptions) =>
        Promise.resolve(makeResult('https://example.com/docs/page')),
      );

      const crawler = new WtmCrawler(wtmFn, {
        outputDir: '/out',
        maxLinkDepth: 3,
      });

      const result = await crawler.crawl('https://example.com/docs/page');

      expect(result.succeeded).toEqual(['https://example.com/docs/page']);
      expect(result.failed).toHaveLength(0);
      expect(wtmFn).toHaveBeenCalledTimes(1);
    });

    test('링크를 따라 크롤링', async () => {
      const pages: Record<string, WtmResult> = {
        'https://example.com/docs/a': makeResult('https://example.com/docs/a', [
          'https://example.com/docs/b',
          'https://example.com/docs/c',
        ]),
        'https://example.com/docs/b': makeResult('https://example.com/docs/b'),
        'https://example.com/docs/c': makeResult('https://example.com/docs/c'),
      };

      const wtmFn = mock((url: string, _opts?: WtmOptions) =>
        Promise.resolve(pages[url]!),
      );

      const crawler = new WtmCrawler(wtmFn, {
        outputDir: '/out',
        maxLinkDepth: 3,
        scopeLevels: 0,
      });

      const result = await crawler.crawl('https://example.com/docs/a');

      expect(result.succeeded).toContain('https://example.com/docs/a');
      expect(result.succeeded).toContain('https://example.com/docs/b');
      expect(result.succeeded).toContain('https://example.com/docs/c');
      expect(result.succeeded).toHaveLength(3);
    });

    test('중복 URL 방지', async () => {
      const wtmFn = mock((url: string, _opts?: WtmOptions) =>
        Promise.resolve(
          makeResult(url, ['https://example.com/docs/a']), // 자기 자신을 다시 참조
        ),
      );

      const crawler = new WtmCrawler(wtmFn, {
        outputDir: '/out',
        maxLinkDepth: 1,
      });

      const result = await crawler.crawl('https://example.com/docs/a');

      expect(wtmFn).toHaveBeenCalledTimes(1);
      expect(result.succeeded).toHaveLength(1);
    });

    test('maxLinkDepth 제한', async () => {
      const pages: Record<string, WtmResult> = {
        'https://example.com/docs/a': makeResult('https://example.com/docs/a', [
          'https://example.com/docs/b',
        ]),
        'https://example.com/docs/b': makeResult('https://example.com/docs/b', [
          'https://example.com/docs/c',
        ]),
        'https://example.com/docs/c': makeResult('https://example.com/docs/c'),
      };

      const wtmFn = mock((url: string, _opts?: WtmOptions) =>
        Promise.resolve(pages[url]!),
      );

      const crawler = new WtmCrawler(wtmFn, {
        outputDir: '/out',
        maxLinkDepth: 1, // a(0) → b(1)까지만
      });

      const result = await crawler.crawl('https://example.com/docs/a');

      expect(result.succeeded).toContain('https://example.com/docs/a');
      expect(result.succeeded).toContain('https://example.com/docs/b');
      expect(result.succeeded).not.toContain('https://example.com/docs/c');
    });

    test('스코프 밖 URL 스킵', async () => {
      const wtmFn = mock((url: string, _opts?: WtmOptions) =>
        Promise.resolve(
          makeResult(url, [
            'https://example.com/docs/child',
            'https://example.com/other/page', // 스코프 밖
            'https://other.com/page', // 다른 origin
          ]),
        ),
      );

      const crawler = new WtmCrawler(wtmFn, {
        outputDir: '/out',
        maxLinkDepth: 1,
        scopeLevels: 0,
      });

      const result = await crawler.crawl('https://example.com/docs/start');

      expect(result.skipped).toContain('https://example.com/other/page');
      expect(result.skipped).toContain('https://other.com/page');
      expect(result.succeeded).toContain('https://example.com/docs/child');
    });

    test('개별 URL 실패 시 나머지는 계속 진행', async () => {
      let callCount = 0;
      const wtmFn = mock((url: string, _opts?: WtmOptions) => {
        callCount++;
        if (url.includes('fail')) {
          return Promise.reject(new Error('fetch failed'));
        }
        return Promise.resolve(
          makeResult(url, [
            'https://example.com/docs/fail',
            'https://example.com/docs/ok',
          ]),
        );
      });

      const crawler = new WtmCrawler(wtmFn, {
        outputDir: '/out',
        maxLinkDepth: 1,
        concurrency: 10,
      });

      const result = await crawler.crawl('https://example.com/docs/start');

      expect(result.succeeded).toContain('https://example.com/docs/start');
      expect(result.succeeded).toContain('https://example.com/docs/ok');
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0]!.url).toBe('https://example.com/docs/fail');
    });

    test('browserManager를 wtmFn에 주입', async () => {
      let receivedOpts: WtmOptions | undefined;
      const wtmFn = mock((url: string, opts?: WtmOptions) => {
        receivedOpts = opts;
        return Promise.resolve(makeResult(url));
      });

      const crawler = new WtmCrawler(wtmFn, {
        outputDir: '/out',
      });

      await crawler.crawl('https://example.com/page');

      expect(receivedOpts?.browserManager).toBeDefined();
    });

    test('maxPathDepth로 경로 깊이 초과 URL 스킵', async () => {
      const wtmFn = mock((url: string, _opts?: WtmOptions) =>
        Promise.resolve(
          makeResult(url, [
            'https://example.com/docs/page',         // 1 segment → 허용
            'https://example.com/docs/tutorial/page', // 2 segments → 거부
          ]),
        ),
      );

      const crawler = new WtmCrawler(wtmFn, {
        outputDir: '/out',
        maxLinkDepth: 2,
        scopeLevels: 0,
        maxPathDepth: 1,
      });

      const result = await crawler.crawl('https://example.com/docs/start');

      expect(result.succeeded).toContain('https://example.com/docs/page');
      expect(result.skipped).toContain('https://example.com/docs/tutorial/page');
    });
  });

  describe('crawlUrls', () => {
    test('URL 리스트를 일괄 처리', async () => {
      const wtmFn = mock((url: string, _opts?: WtmOptions) =>
        Promise.resolve(makeResult(url)),
      );

      const crawler = new WtmCrawler(wtmFn, {
        outputDir: '/out',
      });

      const urls = [
        'https://example.com/a',
        'https://example.com/b',
        'https://example.com/c',
      ];

      const result = await crawler.crawlUrls(urls);

      expect(result.succeeded).toHaveLength(3);
      expect(result.failed).toHaveLength(0);
      expect(result.skipped).toHaveLength(0);
      expect(wtmFn).toHaveBeenCalledTimes(3);
    });

    test('링크를 따라가지 않음', async () => {
      const wtmFn = mock((url: string, _opts?: WtmOptions) =>
        Promise.resolve(makeResult(url, ['https://example.com/should-not-follow'])),
      );

      const crawler = new WtmCrawler(wtmFn, {
        outputDir: '/out',
      });

      const result = await crawler.crawlUrls(['https://example.com/a']);

      expect(wtmFn).toHaveBeenCalledTimes(1);
      expect(result.succeeded).toEqual(['https://example.com/a']);
    });
  });
});
