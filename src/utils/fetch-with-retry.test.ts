import { test, expect, describe, mock, beforeEach, afterEach } from 'bun:test';
import { fetchWithRetry, type RetryConfig } from './fetch-with-retry.ts';

const FAST_CONFIG: RetryConfig = { maxRetries: 2, baseDelayMs: 0, timeoutMs: 5000 };

describe('fetchWithRetry', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test('성공 응답을 그대로 반환', async () => {
    // @ts-expect-error: mock doesn't include preconnect
    globalThis.fetch = mock(() =>
      Promise.resolve(new Response('ok', { status: 200 }))
    );

    const res = await fetchWithRetry('https://api.test.com', { method: 'POST' }, FAST_CONFIG);

    expect(res.status).toBe(200);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  test('4xx 클라이언트 에러는 재시도 없이 반환', async () => {
    // @ts-expect-error: mock doesn't include preconnect
    globalThis.fetch = mock(() =>
      Promise.resolve(new Response('bad request', { status: 400 }))
    );

    const res = await fetchWithRetry('https://api.test.com', { method: 'POST' }, FAST_CONFIG);

    expect(res.status).toBe(400);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  test('5xx 에러 시 재시도 후 성공', async () => {
    let callCount = 0;
    // @ts-expect-error: mock doesn't include preconnect
    globalThis.fetch = mock(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve(new Response('error', { status: 500 }));
      }
      return Promise.resolve(new Response('ok', { status: 200 }));
    });

    const res = await fetchWithRetry('https://api.test.com', { method: 'POST' }, FAST_CONFIG);

    expect(res.status).toBe(200);
    expect(callCount).toBe(2);
  });

  test('429 Too Many Requests 시 재시도', async () => {
    let callCount = 0;
    // @ts-expect-error: mock doesn't include preconnect
    globalThis.fetch = mock(() => {
      callCount++;
      if (callCount <= 2) {
        return Promise.resolve(new Response('rate limited', { status: 429 }));
      }
      return Promise.resolve(new Response('ok', { status: 200 }));
    });

    const res = await fetchWithRetry('https://api.test.com', { method: 'POST' }, FAST_CONFIG);

    expect(res.status).toBe(200);
    expect(callCount).toBe(3);
  });

  test('최대 재시도 초과 시 마지막 응답 반환', async () => {
    // @ts-expect-error: mock doesn't include preconnect
    globalThis.fetch = mock(() =>
      Promise.resolve(new Response('server error', { status: 500 }))
    );

    const res = await fetchWithRetry('https://api.test.com', { method: 'POST' }, FAST_CONFIG);

    expect(res.status).toBe(500);
    expect(globalThis.fetch).toHaveBeenCalledTimes(3);
  });

  test('네트워크 에러 시 재시도 후 성공', async () => {
    let callCount = 0;
    // @ts-expect-error: mock doesn't include preconnect
    globalThis.fetch = mock(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.reject(new Error('network error'));
      }
      return Promise.resolve(new Response('ok', { status: 200 }));
    });

    const res = await fetchWithRetry('https://api.test.com', { method: 'POST' }, FAST_CONFIG);

    expect(res.status).toBe(200);
    expect(callCount).toBe(2);
  });

  test('모든 시도가 네트워크 에러면 마지막 에러 전파', async () => {
    // @ts-expect-error: mock doesn't include preconnect
    globalThis.fetch = mock(() =>
      Promise.reject(new Error('persistent network error'))
    );

    await expect(
      fetchWithRetry('https://api.test.com', { method: 'POST' }, FAST_CONFIG)
    ).rejects.toThrow('persistent network error');

    expect(globalThis.fetch).toHaveBeenCalledTimes(3);
  });
});
