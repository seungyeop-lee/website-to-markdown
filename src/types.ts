/**
 * 공유 타입 정의
 */
import type { Browser } from 'playwright';
import type { LLMConfig } from "./infrastructure/llm-refiner.ts";

export interface BrowserProvider {
  getBrowser(): Promise<Browser>;
  close(): Promise<void>;
}

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
}

export interface BatchConvertOptions extends WtmOptions {
  outputDir: string;
  concurrency?: number;
}

export interface CrawlOptions extends WtmOptions {
  outputDir: string;
  maxLinkDepth?: number;
  maxPathDepth?: number;
  scopeLevels?: number;
  concurrency?: number;
}
