/**
 * 공유 타입 정의
 */

export interface PageMetadata {
  url: string;
  origin: string;
}

export interface RenderResult {
  html: string;
  metadata: PageMetadata;
}

export interface WtmOptions {
  llm: import('./infrastructure/llm-client.ts').LLMConfig;
  debug?: boolean;
}
