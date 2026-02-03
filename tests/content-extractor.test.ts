import { test, expect, describe, mock, beforeEach, afterEach } from 'bun:test';
import { ContentExtractor } from '../src/services/content-extractor.ts';
import { LLMClient } from '../src/infrastructure/llm-client.ts';

describe('ContentExtractor', () => {
  const testConfig = { baseUrl: 'https://api.test.com', apiKey: 'test-key', model: 'test-model' };
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  const metadata = {
    title: 'Test Page',
    description: 'Test Description',
    ogImage: '',
    url: 'https://example.com',
  };

  test('HTML을 mdream으로 변환 후 LLM에 전달', async () => {
    let receivedBody: any;
    // @ts-expect-error: mock doesn't include preconnect
    globalThis.fetch = mock((_url: string, options: any) => {
      receivedBody = JSON.parse(options.body);
      return Promise.resolve(
        new Response(
          JSON.stringify({
            choices: [{ message: { content: '# Clean Content' } }],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      );
    });

    const extractor = new ContentExtractor(new LLMClient(testConfig));
    const result = await extractor.extract('<h1>Hello</h1><p>World</p>', metadata);

    // LLM에 전달된 content는 HTML이 아닌 markdown이어야 함
    const userMessage = receivedBody.messages[1].content;
    expect(userMessage).not.toContain('<h1>');
    expect(userMessage).not.toContain('<p>');
    expect(userMessage).toContain('Hello');
    expect(result).toContain('# Clean Content');
  });

  test('LLM 호출은 정확히 1회만 수행', async () => {
    let callCount = 0;
    // @ts-expect-error: mock doesn't include preconnect
    globalThis.fetch = mock(() => {
      callCount++;
      return Promise.resolve(
        new Response(
          JSON.stringify({
            choices: [{ message: { content: '# Extracted Content' } }],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      );
    });

    const extractor = new ContentExtractor(new LLMClient(testConfig));
    await extractor.extract('<div>Content</div>', metadata);

    expect(callCount).toBe(1);
  });

  test('메타데이터 헤더가 결과에 포함', async () => {
    // @ts-expect-error: mock doesn't include preconnect
    globalThis.fetch = mock(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            choices: [{ message: { content: 'Content' } }],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      )
    );

    const extractor = new ContentExtractor(new LLMClient(testConfig));
    const result = await extractor.extract('<div>Test</div>', metadata);

    expect(result).toStartWith('---\n');
    expect(result).toContain('title: "Test Page"');
    expect(result).toContain('source: "https://example.com"');
  });
});
