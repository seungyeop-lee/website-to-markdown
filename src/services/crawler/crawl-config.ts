/**
 * CrawlConfig
 * 책임: CrawlOptions의 기본값 적용
 */

import type { CrawlOptions } from '../../types.ts';

export class CrawlConfig {
  readonly outputDir: string;
  readonly maxLinkDepth: number;
  readonly maxPathDepth: number;
  readonly scopeLevels: number;
  readonly concurrency: number;

  private static readonly DEFAULTS = {
    maxLinkDepth: 3,
    maxPathDepth: 1,
    scopeLevels: 0,
    concurrency: 3,
  };

  constructor(options: CrawlOptions) {
    this.outputDir = options.outputDir;
    this.maxLinkDepth = options.maxLinkDepth ?? CrawlConfig.DEFAULTS.maxLinkDepth;
    this.maxPathDepth = options.maxPathDepth ?? CrawlConfig.DEFAULTS.maxPathDepth;
    this.scopeLevels = options.scopeLevels ?? CrawlConfig.DEFAULTS.scopeLevels;
    this.concurrency = options.concurrency ?? CrawlConfig.DEFAULTS.concurrency;
  }
}
