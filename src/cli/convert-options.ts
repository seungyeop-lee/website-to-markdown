import type { CommonOptions } from './shared-options.ts';

export type ConvertCliOptions = CommonOptions & {
  output?: string;
};
