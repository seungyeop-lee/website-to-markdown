/**
 * BatchConvertConfig
 * 책임: BatchConvertOptions의 기본값 적용
 */

import type { BatchConvertOptions } from '../../types.ts';

export class BatchConvertConfig {
  readonly outputDir: string;
  readonly concurrency: number;

  private static readonly DEFAULTS = {
    concurrency: 3,
  };

  constructor(options: BatchConvertOptions) {
    this.outputDir = options.outputDir;
    this.concurrency = options.concurrency ?? BatchConvertConfig.DEFAULTS.concurrency;
  }
}
