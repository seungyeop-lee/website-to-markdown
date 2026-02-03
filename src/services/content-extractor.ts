/**
 * 콘텐츠 추출
 * 책임: HTML→Markdown 변환 흐름 조율 (mdream 변환, LLM 정제)
 * 협력자: LLMClient
 */

import {htmlToMarkdown} from 'mdream';
import type {LLMClient} from '../infrastructure/llm-client.ts';
import {logger} from '../infrastructure/logger.ts';
import type {PageMetadata} from '../types.ts';
import {filterPlugin, frontmatterPlugin, isolateMainPlugin, tailwindPlugin} from "mdream/plugins";

export class ContentExtractor {
  constructor(private llmClient: LLMClient) {}

  async extract(html: string, metadata: PageMetadata): Promise<string> {
    logger.debug('mdream 변환 시작');
    const rawMarkdown = htmlToMarkdown(html, {
      origin: metadata.origin,
      plugins: [
        frontmatterPlugin({
          additionalFields: {
            url: metadata.url,
            createdAt: new Date().toISOString(),
          }
        }),
        isolateMainPlugin(),
        tailwindPlugin(),
        filterPlugin()
      ]
    });
    logger.debug(`mdream 변환 완료 (markdown: ${rawMarkdown.length}자)\n--- mdream 결과 ---\n${rawMarkdown}\n---`);

    logger.debug('LLM 정제 시작');
    const cleanedMarkdown = await this.llmClient.call(rawMarkdown);
    logger.debug(`LLM 정제 완료 (markdown: ${cleanedMarkdown.length}자)\n--- LLM 결과 ---\n${cleanedMarkdown}\n---`);

    return cleanedMarkdown;
  }
}
