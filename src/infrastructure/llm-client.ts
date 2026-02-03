/**
 * LLM API 통신
 * 책임: LLM API 호출만 담당
 */

const SYSTEM_PROMPT = `You are a content extractor. Extract the main content from the given HTML and convert it to clean Markdown format.

Rules:
- Extract only the main article/content, not navigation, ads, or sidebars
- Preserve the document structure (headings, lists, paragraphs)
- Keep all images with their original URLs in Markdown format: ![alt](url)
- Remove any remaining HTML tags
- Do not summarize - preserve the full content
- Output only the Markdown content, no explanations`;

export interface LLMConfig {
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

export class LLMClient {
  private config: LLMConfig;

  constructor(config: LLMConfig) {
    this.config = config;
  }

  async call(html: string): Promise<string> {
    if (!this.config.apiKey) {
      throw new Error('OPENAI_API_KEY 환경변수가 설정되지 않았습니다.');
    }

    const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: html },
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
