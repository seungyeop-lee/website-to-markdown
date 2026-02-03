import { test, expect, describe, mock } from 'bun:test';
import { LLMClient } from '../src/infrastructure/llm-client.ts';

describe('LLMClient', () => {
  const testConfig = { baseUrl: 'https://api.test.com', apiKey: 'test-key', model: 'test-model' };

  test('API 키 없으면 에러', async () => {
    const client = new LLMClient({ baseUrl: '', apiKey: '', model: '' });

    expect(client.call('<div>test</div>')).rejects.toThrow(
      'OPENAI_API_KEY 환경변수가 설정되지 않았습니다.'
    );
  });

  test('API 오류 시 에러 메시지 포함', async () => {
    const originalFetch = globalThis.fetch;
    // @ts-expect-error: mock doesn't include preconnect
    globalThis.fetch = mock(() =>
      Promise.resolve(new Response('Internal Server Error', { status: 500 }))
    );

    try {
      const client = new LLMClient(testConfig);
      await expect(client.call('<div>test</div>')).rejects.toThrow('LLM API 오류: 500');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('성공 시 content 반환', async () => {
    const originalFetch = globalThis.fetch;
    // @ts-expect-error: mock doesn't include preconnect
    globalThis.fetch = mock(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            choices: [{ message: { content: '# Hello World' } }],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      )
    );

    try {
      const client = new LLMClient(testConfig);
      const result = await client.call('<div>Hello</div>');
      expect(result).toBe('# Hello World');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
