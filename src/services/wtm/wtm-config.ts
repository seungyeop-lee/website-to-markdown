/**
 * WtmConfig
 * 책임: WtmOptions의 validation + 기본값 적용
 */

import type { LLMConfig, WtmOptions } from '../../types.ts';

export class WtmConfig {
  readonly debug: boolean;
  readonly llm: LLMConfig;
  readonly llmRefine: boolean;
  readonly llmTranslate?: string;

  private static readonly LLM_DEFAULTS: LLMConfig = {
    baseUrl: '',
    apiKey: '',
    model: '',
  };

  constructor(options?: WtmOptions) {
    this.debug = options?.debug ?? false;
    this.llmRefine = options?.llmRefine ?? false;
    this.llmTranslate = options?.llmTranslate;
    this.llm = { ...WtmConfig.LLM_DEFAULTS, ...options?.llmConfig };

    if (this.llmRefine || this.llmTranslate) {
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
