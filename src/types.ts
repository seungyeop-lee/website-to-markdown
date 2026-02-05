/**
 * 공유 타입 정의
 */
import type { LLMConfig } from "./infrastructure/llm-refiner.ts";
import type { BrowserManager } from "./infrastructure/browser-manager.ts";

export interface PageMetadata {
  url: string;
  origin: string;
  pathname: string;
  title: string;
  links: string[];
}

export interface RenderResult {
  html: string;
  metadata: PageMetadata;
}

export interface WtmResult {
  markdown: string;
  metadata: PageMetadata;
}

export interface WtmOptions {
  llm?: Partial<LLMConfig>;
  translate?: string;
  debug?: boolean;
  browserManager?: BrowserManager;
}

export interface CrawlOptions {
  outputDir: string;
  wtmOptions?: WtmOptions;
  maxDepth?: number;
  scopeLevels?: number;
  concurrency?: number;
}
