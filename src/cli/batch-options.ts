import type { BatchConvertOptions } from '../types.ts';
import type { CommonOptions } from './shared-options.ts';
import { buildWtmOptions } from './shared-options.ts';

export type BatchCliOptions = CommonOptions & {
  outputDir: string;
  urls: string;
  concurrency: string;
};

export function buildBatchOptions(options: BatchCliOptions): BatchConvertOptions {
  return {
    ...buildWtmOptions(options),
    outputDir: options.outputDir,
    concurrency: parseInt(options.concurrency, 10),
  };
}
