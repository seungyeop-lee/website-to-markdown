import { test, expect, describe, beforeEach, afterEach } from 'bun:test';
import { buildWtmOptions } from './shared-options.ts';

describe('buildWtmOptions', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.OPENAI_API_BASE_URL = 'https://api.test.com';
    process.env.OPENAI_API_KEY = 'test-key';
    process.env.OPENAI_API_MODEL = 'gpt-4';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  test('llmRefine 활성화 시 환경변수에서 LLM 설정을 읽음', () => {
    const result = buildWtmOptions({ llmRefine: true });

    expect(result.llmConfig).toEqual({
      baseUrl: 'https://api.test.com',
      apiKey: 'test-key',
      model: 'gpt-4',
    });
    expect(result.llmRefine).toBe(true);
  });

  test('llmRefine 미지정 시 llm 설정을 포함하지 않음', () => {
    const result = buildWtmOptions({});

    expect(result.llmConfig).toBeUndefined();
  });

  test('llmTranslate 옵션이 있으면 llmRefine 미지정이어도 LLM 설정 포함', () => {
    const result = buildWtmOptions({ llmTranslate: 'ko' });

    expect(result.llmConfig).toBeDefined();
    expect(result.llmTranslate).toBe('ko');
  });

  test('logLevel 옵션 전달', () => {
    const result = buildWtmOptions({ logLevel: 'debug' });

    expect(result.logLevel).toBe('debug');
  });

  test('logLevel 미지정 시 info', () => {
    const result = buildWtmOptions({});

    expect(result.logLevel).toBe('info');
  });
});
