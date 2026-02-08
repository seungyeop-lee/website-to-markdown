import { test, expect, describe } from 'bun:test';
import { CrawlConfig } from './crawl-config.ts';

describe('CrawlConfig', () => {
  test('기본값 적용', () => {
    const config = new CrawlConfig({ outputDir: '/out' });

    expect(config.outputDir).toBe('/out');
    expect(config.maxLinkDepth).toBe(3);
    expect(config.maxPathDepth).toBe(1);
    expect(config.scopeLevels).toBe(0);
    expect(config.concurrency).toBe(3);
  });

  test('maxLinkDepth override', () => {
    const config = new CrawlConfig({ outputDir: '/out', maxLinkDepth: 5 });

    expect(config.maxLinkDepth).toBe(5);
  });

  test('maxPathDepth override', () => {
    const config = new CrawlConfig({ outputDir: '/out', maxPathDepth: 10 });

    expect(config.maxPathDepth).toBe(10);
  });

  test('scopeLevels override', () => {
    const config = new CrawlConfig({ outputDir: '/out', scopeLevels: 2 });

    expect(config.scopeLevels).toBe(2);
  });

  test('concurrency override', () => {
    const config = new CrawlConfig({ outputDir: '/out', concurrency: 8 });

    expect(config.concurrency).toBe(8);
  });

  test('모든 필드 override', () => {
    const config = new CrawlConfig({
      outputDir: '/custom',
      maxLinkDepth: 5,
      maxPathDepth: 10,
      scopeLevels: 2,
      concurrency: 8,
    });

    expect(config.outputDir).toBe('/custom');
    expect(config.maxLinkDepth).toBe(5);
    expect(config.maxPathDepth).toBe(10);
    expect(config.scopeLevels).toBe(2);
    expect(config.concurrency).toBe(8);
  });
});
