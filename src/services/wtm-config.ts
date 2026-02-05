/**
 * WtmConfig
 * 책임: WtmOptions의 validation + 기본값 적용
 */

import type { LLMConfig } from '../infrastructure/llm-refiner.ts';
import type { WtmOptions } from '../types.ts';

export class WtmConfig {
  readonly debug: boolean;
  readonly llm: LLMConfig;
  readonly translate?: string;

  private static readonly LLM_DEFAULTS: LLMConfig = {
    enable: false,
    baseUrl: '',
    apiKey: '',
    model: '',
  };

  constructor(options?: WtmOptions) {
    this.debug = options?.debug ?? false;
    this.translate = options?.translate;
    this.llm = { ...WtmConfig.LLM_DEFAULTS, ...options?.llm };

    if (this.llm.enable || this.translate) {
      this.validateLLMConfig(this.llm);
    }
  }

  private validateLLMConfig(llm: LLMConfig): void {
    const missing: string[] = [];

    if (!llm.baseUrl) missing.push('baseUrl');
    if (!llm.apiKey) missing.push('apiKey');
    if (!llm.model) missing.push('model');

    if (missing.length > 0) {
      throw new Error(
        `LLM이 활성화되었지만 필수 필드가 누락되었습니다: ${missing.join(', ')}`,
      );
    }
  }
}
