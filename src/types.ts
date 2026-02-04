/**
 * 공유 타입 정의
 */
import type { LLMConfig } from "./infrastructure/llm-refiner.ts";

export interface PageMetadata {
  url: string;
  origin: string;
}

export interface RenderResult {
  html: string;
  metadata: PageMetadata;
}

export interface WtmOptions {
  llm?: Partial<LLMConfig>;
  translate?: string;
  debug?: boolean;
}
