/**
 * 재시도 가능한 fetch 유틸리티
 * 책임: 일시적 네트워크 오류/서버 오류 시 exponential backoff 재시도
 */

import { logger } from '../infrastructure/logger.ts';

export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  timeoutMs: number;
}

const DEFAULT_CONFIG: RetryConfig = {
  maxRetries: 2,
  baseDelayMs: 1000,
  timeoutMs: 60000,
};

export async function fetchWithRetry(
  url: string,
  init: RequestInit,
  config: RetryConfig = DEFAULT_CONFIG,
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    if (attempt > 0) {
      const delay = config.baseDelayMs * 2 ** (attempt - 1);
      logger.debug(`LLM API 재시도 ${attempt}/${config.maxRetries} (${delay}ms 후)`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

    try {
      const response = await fetch(url, { ...init, signal: controller.signal });

      if (!response.ok && isRetryable(response.status) && attempt < config.maxRetries) {
        lastError = new Error(`LLM API 오류: ${response.status}`);
        continue;
      }

      return response;
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      if (attempt >= config.maxRetries) break;
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError!;
}

function isRetryable(status: number): boolean {
  return status === 429 || status >= 500;
}
