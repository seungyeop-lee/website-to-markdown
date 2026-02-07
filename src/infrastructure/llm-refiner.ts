/**
 * LLM API 통신
 * 책임: LLM API 호출만 담당
 */

import { fetchWithRetry } from '../utils/fetch-with-retry.ts';

const SYSTEM_PROMPT = `You are a Markdown post-processor. You receive a Markdown document that was converted from a web page by an automated tool. The conversion already extracted basic structure, but noise and artifacts remain. Your job is to clean it up.

Rules:
- Preserve the YAML frontmatter block (--- ... ---) exactly as-is
- Remove navigation menus, sidebar link lists, table-of-contents sections, and breadcrumbs
- Remove UI artifacts: "Copy page", "Was this page helpful?", "Yes/No" feedback, "[Navigate to header](#)" links
- Remove standalone numbers that were step indicators in the original page layout
- Remove footer navigation links (e.g. previous/next page links at the bottom)
- Preserve the main article content: headings, paragraphs, lists, code blocks, images, and inline links
- Fix formatting artifacts from the HTML-to-Markdown conversion (e.g. broken headings, extra whitespace)
- Do not summarize or rewrite - preserve the full original content
- Output only the cleaned Markdown, no explanations`;

export interface LLMConfig {
  enable: boolean;
  baseUrl: string;
  apiKey: string;
  model: string;
}

interface LLMResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export interface MarkdownRefiner {
  call(markdown: string): Promise<string>;
}

export class NullRefiner implements MarkdownRefiner {
  async call(markdown: string): Promise<string> {
    return markdown;
  }
}

export class LLMClient implements MarkdownRefiner {
  private config: LLMConfig;

  constructor(config: LLMConfig) {
    this.config = config;
  }

  async call(markdown: string): Promise<string> {
    const response = await fetchWithRetry(`${this.config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: markdown },
        ],
        temperature: 0,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`LLM API 오류: ${response.status} - ${error}`);
    }

    const data = (await response.json()) as LLMResponse;
    return data.choices[0]?.message?.content || '';
  }
}
