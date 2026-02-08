/**
 * LLM 기반 마크다운 번역
 * 책임: LLM API를 통한 마크다운 번역만 담당
 */

import type { LLMConfig } from '../types.ts';
import { fetchWithRetry } from '../utils/fetch-with-retry.ts';
import { collectSSEStream } from '../utils/parse-sse-stream.ts';
import { logger } from './logger.ts';

function buildSystemPrompt(targetLang: string): string {
  return `You are a Markdown translator. Translate the following Markdown document into ${targetLang}.

Rules:
- Preserve the YAML frontmatter block (--- ... ---) exactly as-is, do not translate it
- Preserve all Markdown formatting: headings, lists, code blocks, images, links
- Do NOT translate code blocks (content inside \`\`\` or inline \`)
- Keep technical terms in their original form when appropriate
- Translate all other text naturally and fluently
- Output only the translated Markdown, no explanations`;
}

export interface MarkdownTranslator {
  call(markdown: string): Promise<string>;
}

export class NullTranslator implements MarkdownTranslator {
  async call(markdown: string): Promise<string> {
    return markdown;
  }
}

export class LLMTranslator implements MarkdownTranslator {
  private config: LLMConfig;
  private targetLang: string;

  constructor(config: LLMConfig, targetLang: string) {
    this.config = config;
    this.targetLang = targetLang;
  }

  async call(markdown: string): Promise<string> {
    const startTime = Date.now();
    logger.info(`LLM translate 요청 시작 (입력 ${markdown.length}자)`);

    const response = await fetchWithRetry(`${this.config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: [
          { role: 'system', content: buildSystemPrompt(this.targetLang) },
          { role: 'user', content: markdown },
        ],
        temperature: 0,
        stream: true,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`LLM API 오류: ${response.status} - ${error}`);
    }

    return collectSSEStream(response, { label: 'translate', startTime });
  }
}
