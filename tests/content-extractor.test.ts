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

  test('작은 HTML은 청킹 없이 단일 LLM 호출', async () => {
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
    const result = await extractor.extract('<div>Small</div>', metadata);

    expect(callCount).toBe(1);
    expect(result).toContain('# Extracted Content');
    expect(result).toContain('title: "Test Page"');
  });

  test('큰 HTML은 청킹 후 다중 LLM 호출', async () => {
    let callCount = 0;
    // @ts-expect-error: mock doesn't include preconnect
    globalThis.fetch = mock(() => {
      callCount++;
      return Promise.resolve(
        new Response(
          JSON.stringify({
            choices: [{ message: { content: `Chunk ${callCount}` } }],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      );
    });

    // 100k 토큰 초과하는 HTML (400k+ 문자)
    const largeHtml = 'a'.repeat(500000);
    const extractor = new ContentExtractor(new LLMClient(testConfig));
    const result = await extractor.extract(largeHtml, metadata);

    expect(callCount).toBeGreaterThan(1);
    expect(result).toContain('---');
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
