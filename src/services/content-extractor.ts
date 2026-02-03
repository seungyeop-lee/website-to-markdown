/**
 * 콘텐츠 추출
 * 책임: HTML→Markdown 변환 흐름 조율 (mdream 변환, LLM 정제)
 * 협력자: LLMClient
 */

import { htmlToMarkdown } from 'mdream';
import type { LLMClient } from '../infrastructure/llm-client.ts';
import { formatMetadataHeader } from '../utils/markdown-formatter.ts';
import type { PageMetadata } from '../types.ts';

export class ContentExtractor {
  constructor(private llmClient: LLMClient) {}

  async extract(html: string, metadata: PageMetadata): Promise<string> {
    const header = formatMetadataHeader(metadata);

    const rawMarkdown = htmlToMarkdown(html);
    const cleanedMarkdown = await this.llmClient.call(rawMarkdown);

    return header + cleanedMarkdown;
  }
}
