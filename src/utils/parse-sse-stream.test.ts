import { test, expect, describe } from 'bun:test';
import { collectSSEStream } from './parse-sse-stream.ts';

function createSSEBody(...chunks: string[]): Response {
  const events = [
    ...chunks.map(c => `data: ${JSON.stringify({ choices: [{ delta: { content: c } }] })}\n\n`),
    'data: [DONE]\n\n',
  ].join('');
  return new Response(events, { status: 200 });
}

describe('collectSSEStream', () => {
  test('SSE 청크를 조립하여 전체 텍스트 반환', async () => {
    const response = createSSEBody('# Hello', ' World');
    const result = await collectSSEStream(response, { label: 'test', startTime: Date.now() });
    expect(result).toBe('# Hello World');
  });

  test('content 없는 delta는 무시', async () => {
    const events = [
      `data: ${JSON.stringify({ choices: [{ delta: { role: 'assistant' } }] })}\n\n`,
      `data: ${JSON.stringify({ choices: [{ delta: { content: 'Hello' } }] })}\n\n`,
      'data: [DONE]\n\n',
    ].join('');
    const response = new Response(events, { status: 200 });

    const result = await collectSSEStream(response, { label: 'test', startTime: Date.now() });
    expect(result).toBe('Hello');
  });

  test('청크가 없으면 빈 문자열 반환', async () => {
    const response = new Response('data: [DONE]\n\n', { status: 200 });
    const result = await collectSSEStream(response, { label: 'test', startTime: Date.now() });
    expect(result).toBe('');
  });

  test('malformed JSON 라인은 무시', async () => {
    const events = [
      'data: {invalid json}\n\n',
      `data: ${JSON.stringify({ choices: [{ delta: { content: 'OK' } }] })}\n\n`,
      'data: [DONE]\n\n',
    ].join('');
    const response = new Response(events, { status: 200 });

    const result = await collectSSEStream(response, { label: 'test', startTime: Date.now() });
    expect(result).toBe('OK');
  });
});
