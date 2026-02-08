import { test, expect, describe, mock } from 'bun:test';
import { LLMTranslator, NullTranslator } from './llm-translator.ts';

function createSSEResponse(...chunks: string[]): Response {
  const events = [
    ...chunks.map(c => `data: ${JSON.stringify({ choices: [{ delta: { content: c } }] })}\n\n`),
    'data: [DONE]\n\n',
  ].join('');
  return new Response(events, { status: 200 });
}

describe('NullTranslator', () => {
  test('마크다운을 그대로 반환', async () => {
    const translator = new NullTranslator();
    const markdown = '# Hello\n\nWorld';

    const result = await translator.call(markdown);

    expect(result).toBe(markdown);
  });
});

describe('LLMTranslator', () => {
  const testConfig = { baseUrl: 'https://api.test.com', apiKey: 'test-key', model: 'test-model' };

  test('API 오류 시 에러 메시지 포함', async () => {
    const originalFetch = globalThis.fetch;
    // @ts-expect-error: mock doesn't include preconnect
    globalThis.fetch = mock(() =>
      Promise.resolve(new Response('Internal Server Error', { status: 500 }))
    );

    try {
      const translator = new LLMTranslator(testConfig, 'ko');
      await expect(translator.call('# test')).rejects.toThrow('LLM API 오류: 500');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('성공 시 스트리밍 번역된 content 반환', async () => {
    const originalFetch = globalThis.fetch;
    // @ts-expect-error: mock doesn't include preconnect
    globalThis.fetch = mock(() =>
      Promise.resolve(createSSEResponse('# 안녕하세요', '\n\n세계'))
    );

    try {
      const translator = new LLMTranslator(testConfig, 'ko');
      const result = await translator.call('# Hello\n\nWorld');
      expect(result).toBe('# 안녕하세요\n\n세계');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('시스템 프롬프트에 target language가 포함됨', async () => {
    const originalFetch = globalThis.fetch;
    let receivedBody: any;
    // @ts-expect-error: mock doesn't include preconnect
    globalThis.fetch = mock((_url: string, options: any) => {
      receivedBody = JSON.parse(options.body);
      return Promise.resolve(createSSEResponse('translated'));
    });

    try {
      const translator = new LLMTranslator(testConfig, 'ko');
      await translator.call('# Hello');

      const systemMessage = receivedBody.messages[0].content;
      expect(systemMessage).toContain('ko');
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
      const translator = new LLMTranslator(testConfig, 'ko');
      await translator.call('# Hello');
      expect(receivedBody.stream).toBe(true);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
