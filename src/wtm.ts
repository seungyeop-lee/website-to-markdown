/**
 * wtm 라이브러리 facade
 * 책임: DI 조립 → 파이프라인 실행 → 리소스 정리
 */

import { BrowserManager } from './infrastructure/browser-manager.ts';
import { LLMClient, NullRefiner } from './infrastructure/llm-client.ts';
import { logger } from './infrastructure/logger.ts';
import { PageRenderer } from './services/page-renderer.ts';
import { ContentExtractor } from './services/content-extractor.ts';
import type { WtmOptions } from './types.ts';

export type { WtmOptions };

/**
 * URL을 받아 Markdown으로 변환하여 반환한다.
 */
export async function wtm(url: string, options: WtmOptions): Promise<string> {
  try {
    new URL(url);
  } catch {
    throw new Error(`유효하지 않은 URL입니다: ${url}`);
  }

  logger.init(options.debug ?? false);

  const browserManager = new BrowserManager();
  const refiner = options.llm.enable ? new LLMClient(options.llm) : new NullRefiner();
  const pageRenderer = new PageRenderer(browserManager);
  const contentExtractor = new ContentExtractor(refiner);

  try {
    logger.debug(`PageRenderer.render 시작: ${url}`);
    const { html, metadata } = await pageRenderer.render(url);
    logger.debug(`PageRenderer.render 완료 (html: ${html.length}자")`);

    return await contentExtractor.extract(html, metadata);
  } finally {
    await browserManager.close();
  }
}
