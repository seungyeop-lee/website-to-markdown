import { test, expect, describe, mock } from 'bun:test';
import {LLMClient, type LLMConfig} from './llm-refiner.ts';

describe('LLMClient', () => {
  const testConfig: LLMConfig = { baseUrl: 'https://api.test.com', apiKey: 'test-key', model: 'test-model', enable: true };

  test('API 오류 시 에러 메시지 포함', async () => {
    const originalFetch = globalThis.fetch;
    // @ts-expect-error: mock doesn't include preconnect
    globalThis.fetch = mock(() =>
      Promise.resolve(new Response('Internal Server Error', { status: 500 }))
    );

    try {
      const client = new LLMClient(testConfig);
      await expect(client.call('# test')).rejects.toThrow('LLM API 오류: 500');
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
      const result = await client.call('# Hello');
      expect(result).toBe('# Hello World');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
