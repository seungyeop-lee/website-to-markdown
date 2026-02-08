import type { LogLevel, WtmOptions } from '../types.ts';

export interface CommonOptions {
  logLevel?: string;
  llmRefine?: boolean;
  llmTranslate?: string;
}

export function buildWtmOptions(options: CommonOptions): WtmOptions {
  const needsLlmConfig = options.llmRefine || options.llmTranslate;
  return {
    llmConfig: needsLlmConfig ? {
      baseUrl: process.env.OPENAI_API_BASE_URL,
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_API_MODEL,
    } : undefined,
    llmRefine: options.llmRefine ?? false,
    llmTranslate: options.llmTranslate,
    logLevel: (options.logLevel as LogLevel) ?? 'info',
  };
}

export const ENV_HELP = `
Environment:
  OPENAI_API_BASE_URL  OpenAI API 베이스 URL (--llm-refine 또는 --llm-translate 사용 시 필수)
  OPENAI_API_KEY       OpenAI API 키 (--llm-refine 또는 --llm-translate 사용 시 필수)
  OPENAI_API_MODEL     OpenAI 모델명 (--llm-refine 또는 --llm-translate 사용 시 필수)`;
