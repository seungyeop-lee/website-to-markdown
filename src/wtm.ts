/**
 * wtm 라이브러리 facade
 * 책임: DI 조립 → 파이프라인 실행 → 리소스 정리
 */

import type { LLMConfig } from './infrastructure/llm-client.ts';
import { BrowserManager } from './infrastructure/browser-manager.ts';
import { LLMClient } from './infrastructure/llm-client.ts';
import { PageRenderer } from './services/page-renderer.ts';
import { ContentExtractor } from './services/content-extractor.ts';

export interface WtmOptions {
  llm: LLMConfig;
}

/**
 * URL을 받아 Markdown으로 변환하여 반환한다.
 */
export async function wtm(url: string, options: WtmOptions): Promise<string> {
  try {
    new URL(url);
  } catch {
    throw new Error(`유효하지 않은 URL입니다: ${url}`);
  }

  const browserManager = new BrowserManager();
  const llmClient = new LLMClient(options.llm);
  const pageRenderer = new PageRenderer(browserManager);
  const contentExtractor = new ContentExtractor(llmClient);

  try {
    const { html, metadata } = await pageRenderer.render(url);
    return await contentExtractor.extract(html, metadata);
  } finally {
    await browserManager.close();
  }
}
