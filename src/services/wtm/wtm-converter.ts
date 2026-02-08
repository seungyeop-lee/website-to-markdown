/**
 * DefaultWtmConverter
 * 책임: 외부에서 주입받은 BrowserProvider로 URL → Markdown 변환
 */

import { LLMClient, NullRefiner } from '../../infrastructure/llm-refiner.ts';
import { LLMTranslator, NullTranslator } from '../../infrastructure/llm-translator.ts';
import { logger } from '../../infrastructure/logger.ts';
import { PageRenderer } from '../base/page-renderer.ts';
import { ContentExtractor } from '../base/content-extractor.ts';
import type { WtmConfig } from './wtm-config.ts';
import type { BrowserProvider, WtmResult } from '../../types.ts';
import type {WtmConverter} from "../base/types.ts";

export class DefaultWtmConverter implements WtmConverter {
  private readonly pageRenderer: PageRenderer;
  private readonly contentExtractor: ContentExtractor;
  private readonly translator: LLMTranslator | { call: (text: string) => Promise<string> };
  private readonly config: WtmConfig;

  constructor(browserManager: BrowserProvider, config: WtmConfig) {
    this.config = config;
    logger.init(this.config.debug);

    const refiner = this.config.llm.enable ? new LLMClient(this.config.llm) : new NullRefiner();
    this.translator = this.config.llmTranslate ? new LLMTranslator(this.config.llm, this.config.llmTranslate) : new NullTranslator();
    this.pageRenderer = new PageRenderer(browserManager);
    this.contentExtractor = new ContentExtractor(refiner);
  }

  async convert(url: string): Promise<WtmResult> {
    try {
      new URL(url);
    } catch {
      throw new Error(`유효하지 않은 URL입니다: ${url}`);
    }

    logger.debug(`PageRenderer.render 시작: ${url}`);
    const { html, metadata } = await this.pageRenderer.render(url);
    logger.debug(`PageRenderer.render 완료 (html: ${html.length}자)\n--- render 결과 ---\n${html}\n--- metadata 결과 ---\n${JSON.stringify(metadata, null, 2)}\n---`);

    const markdown = await this.contentExtractor.extract(html, metadata);

    logger.debug('번역 시작');
    const translated = await this.translator.call(markdown);
    logger.debug(`번역 완료 (markdown: ${translated.length}자)\n--- 번역 결과 ---\n${translated}\n---`);

    return { markdown: translated, metadata };
  }
}
