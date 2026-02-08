/**
 * 공유 타입 정의
 */
import type { Browser } from 'playwright';

export interface LLMConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

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
  llmConfig?: Partial<LLMConfig>;
  llmRefine?: boolean;
  llmTranslate?: string;
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
