/**
 * 공유 타입 정의
 */
import type { Page } from 'playwright';

export interface LLMConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

export interface BrowserProvider {
  getPage(): Promise<Page>;
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

export type LogLevel = 'debug' | 'info' | 'error';

export interface WtmOptions {
  cdpUrl?: string;
  llmConfig?: Partial<LLMConfig>;
  llmRefine?: boolean;
  llmTranslate?: string;
  logLevel?: LogLevel;
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
