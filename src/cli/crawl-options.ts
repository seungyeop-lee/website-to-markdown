import type { CrawlOptions } from '../types.ts';
import type { CommonOptions } from './shared-options.ts';
import { buildWtmOptions } from './shared-options.ts';

export type CrawlCliOptions = CommonOptions & {
  outputDir: string;
  url?: string;
  linkDepth: string;
  pathDepth: string;
  scope: string;
  concurrency: string;
  urls?: string;
};

export function buildCrawlOptions(options: CrawlCliOptions): CrawlOptions {
  return {
    ...buildWtmOptions(options),
    outputDir: options.outputDir,
    maxLinkDepth: parseInt(options.linkDepth, 10),
    maxPathDepth: parseInt(options.pathDepth, 10),
    scopeLevels: parseInt(options.scope, 10),
    concurrency: parseInt(options.concurrency, 10),
  };
}

