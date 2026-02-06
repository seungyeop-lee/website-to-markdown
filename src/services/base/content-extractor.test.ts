import { test, expect, describe, mock, beforeEach, afterEach } from 'bun:test';
import { ContentExtractor } from './content-extractor.ts';
import { LLMClient, NullRefiner } from '../../infrastructure/llm-refiner.ts';

describe('ContentExtractor', () => {
  const testConfig = { enable: true, baseUrl: 'https://api.test.com', apiKey: 'test-key', model: 'test-model' };
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  const metadata = {
    url: 'https://example.com',
    origin: 'https://example.com',
    pathname: '/',
    title: 'Test Page',
    links: [],
  };

  const sampleHtml = '<html><head><title>Test Page</title></head><body><main><h1>Hello</h1><p>World</p></main></body></html>';

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
    const result = await extractor.extract(sampleHtml, metadata);

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
    await extractor.extract(sampleHtml, metadata);

    expect(callCount).toBe(1);
  });

  test('mdream이 생성한 front matter가 LLM에 전달됨', async () => {
    let receivedBody: any;
    // @ts-expect-error: mock doesn't include preconnect
    globalThis.fetch = mock((_url: string, options: any) => {
      receivedBody = JSON.parse(options.body);
      return Promise.resolve(
        new Response(
          JSON.stringify({
            choices: [{ message: { content: 'Content' } }],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      );
    });

    const extractor = new ContentExtractor(new LLMClient(testConfig));
    await extractor.extract(sampleHtml, metadata);

    const userMessage = receivedBody.messages[1].content;
    expect(userMessage).toContain('---');
    expect(userMessage).toContain('url:');
  });

  test('inline script가 많아도 본문 테이블은 유지된다', async () => {
    const fixturePath = new URL('./fixtures/script-heavy-main-with-table.html', import.meta.url);
    const fixtureHtml = await Bun.file(fixturePath).text();
    const extractor = new ContentExtractor(new NullRefiner());

    const markdown = await extractor.extract(fixtureHtml, metadata);

    expect(markdown).toContain('| 번호 | 신청자수 |');
    expect(markdown).toContain('| 700 | 35 |');
  });
});
