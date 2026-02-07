import { test, expect, describe, beforeEach, afterEach } from 'bun:test';
import { buildWtmOptions } from './options.ts';

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

  test('llm 활성화 시 환경변수에서 LLM 설정을 읽음', () => {
    const result = buildWtmOptions({ llm: true });

    expect(result.llm).toEqual({
      enable: true,
      baseUrl: 'https://api.test.com',
      apiKey: 'test-key',
      model: 'gpt-4',
    });
  });

  test('llm 비활성화 시 llm 설정을 포함하지 않음', () => {
    const result = buildWtmOptions({ llm: false });

    expect(result.llm).toBeUndefined();
  });

  test('translate 옵션이 있으면 llm 비활성화여도 LLM 설정 포함', () => {
    const result = buildWtmOptions({ llm: false, translate: 'ko' });

    expect(result.llm).toBeDefined();
    expect(result.translate).toBe('ko');
  });

  test('debug 옵션 전달', () => {
    const result = buildWtmOptions({ llm: false, debug: true });

    expect(result.debug).toBe(true);
  });

  test('debug 미지정 시 false', () => {
    const result = buildWtmOptions({ llm: false });

    expect(result.debug).toBe(false);
  });
});
