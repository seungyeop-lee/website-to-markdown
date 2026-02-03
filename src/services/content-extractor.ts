/**
 * 콘텐츠 추출
 * 책임: HTML→Markdown 변환 흐름 조율 (청킹 판단, 결과 조합)
 * 협력자: LLMClient
 */

import { estimateTokens, chunkHtml } from '../utils/html-preprocessor.ts';
import type { LLMClient } from '../infrastructure/llm-client.ts';
import { formatMetadataHeader } from '../utils/markdown-formatter.ts';
import type { PageMetadata } from '../types.ts';

const MAX_TOKENS = 100000;

export class ContentExtractor {
  constructor(private llmClient: LLMClient) {}

  async extract(html: string, metadata: PageMetadata): Promise<string> {
    const header = formatMetadataHeader(metadata);
    const markdownContent = await this.extractContent(html);
    return header + markdownContent;
  }

  private async extractContent(html: string): Promise<string> {
    const tokens = estimateTokens(html);

    if (tokens > MAX_TOKENS) {
      const chunks = chunkHtml(html, MAX_TOKENS);
      console.error(`[INFO] 토큰 수 ${tokens} > ${MAX_TOKENS}, ${chunks.length}개 청크로 분할`);

      const results: string[] = [];
      for (let i = 0; i < chunks.length; i++) {
        console.error(`[INFO] 청크 ${i + 1}/${chunks.length} 처리 중...`);
        const result = await this.llmClient.call(chunks[i]!);
        results.push(result);
      }

      return results.join('\n\n');
    } else {
      return await this.llmClient.call(html);
    }
  }
}
