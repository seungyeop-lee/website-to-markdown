import { test, expect, describe, mock } from 'bun:test';
import { LLMClient } from './llm-refiner.ts';
import type { LLMConfig } from '../types.ts';

function createSSEResponse(...chunks: string[]): Response {
  const events = [
    ...chunks.map(c => `data: ${JSON.stringify({ choices: [{ delta: { content: c } }] })}\n\n`),
    'data: [DONE]\n\n',
  ].join('');
  return new Response(events, { status: 200 });
}

describe('LLMClient', () => {
  const testConfig: LLMConfig = { baseUrl: 'https://api.test.com', apiKey: 'test-key', model: 'test-model' };

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

  test('성공 시 스트리밍 content 반환', async () => {
    const originalFetch = globalThis.fetch;
    // @ts-expect-error: mock doesn't include preconnect
    globalThis.fetch = mock(() => Promise.resolve(createSSEResponse('# Hello', ' World')));

    try {
      const client = new LLMClient(testConfig);
      const result = await client.call('# Hello');
      expect(result).toBe('# Hello World');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('요청 body에 stream: true 포함', async () => {
    const originalFetch = globalThis.fetch;
    let receivedBody: any;
    // @ts-expect-error: mock doesn't include preconnect
    globalThis.fetch = mock((_url: string, options: any) => {
      receivedBody = JSON.parse(options.body);
      return Promise.resolve(createSSEResponse('ok'));
    });

    try {
      const client = new LLMClient(testConfig);
      await client.call('# Hello');
      expect(receivedBody.stream).toBe(true);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
