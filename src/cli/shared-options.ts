import type { WtmOptions } from '../types.ts';

export interface CommonOptions {
  debug?: boolean;
  llm: boolean;
  translate?: string;
}

export function buildWtmOptions(options: CommonOptions): WtmOptions {
  const needsLlmConfig = options.llm || options.translate;
  return {
    llm: needsLlmConfig ? {
      enable: options.llm,
      baseUrl: process.env.OPENAI_API_BASE_URL,
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_API_MODEL,
    } : undefined,
    translate: options.translate,
    debug: options.debug ?? false,
  };
}

export const ENV_HELP = `
Environment:
  OPENAI_API_BASE_URL  OpenAI API 베이스 URL (--no-llm 미사용 또는 --translate 사용 시 필수)
  OPENAI_API_KEY       OpenAI API 키 (--no-llm 미사용 또는 --translate 사용 시 필수)
  OPENAI_API_MODEL     OpenAI 모델명 (--no-llm 미사용 또는 --translate 사용 시 필수)`;
