/**
 * wtm 라이브러리 facade
 * 책임: DI 조립 → 파이프라인 실행 → 리소스 정리
 */

import { BrowserManager } from '../../infrastructure/browser-manager.ts';
import { LLMClient, NullRefiner } from '../../infrastructure/llm-refiner.ts';
import { LLMTranslator, NullTranslator } from '../../infrastructure/llm-translator.ts';
import { logger } from '../../infrastructure/logger.ts';
import { PageRenderer } from '../base/page-renderer.ts';
import { ContentExtractor } from '../base/content-extractor.ts';
import { WtmConfig } from './wtm-config.ts';
import type { WtmOptions, WtmResult } from '../../types.ts';

export type { WtmOptions, WtmResult };

/**
 * URL을 받아 Markdown으로 변환하여 반환한다.
 */
export async function wtm(url: string, options?: WtmOptions): Promise<WtmResult> {
  try {
    new URL(url);
  } catch {
    throw new Error(`유효하지 않은 URL입니다: ${url}`);
  }

  const config = new WtmConfig(options);
  logger.init(config.debug);

  const ownsBrowser = !options?.browserManager;
  const browserManager = options?.browserManager ?? new BrowserManager();
  const refiner = config.llm.enable ? new LLMClient(config.llm) : new NullRefiner();
  const translator = config.translate ? new LLMTranslator(config.llm, config.translate) : new NullTranslator();
  const pageRenderer = new PageRenderer(browserManager);
  const contentExtractor = new ContentExtractor(refiner);

  try {
    logger.debug(`PageRenderer.render 시작: ${url}`);
    const { html, metadata } = await pageRenderer.render(url);
    logger.debug(`PageRenderer.render 완료 (html: ${html.length}자)\n--- render 결과 ---\n${html}\n--- metadata 결과 ---\n${JSON.stringify(metadata, null, 2)}\n---`);

    const markdown = await contentExtractor.extract(html, metadata);

    logger.debug('번역 시작');
    const translated = await translator.call(markdown);
    logger.debug(`번역 완료 (markdown: ${translated.length}자)\n--- 번역 결과 ---\n${translated}\n---`);

    return { markdown: translated, metadata };
  } finally {
    if (ownsBrowser) {
      await browserManager.close();
    }
  }
}
