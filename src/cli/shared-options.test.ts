import { test, expect, describe, beforeEach, afterEach } from 'bun:test';
import { buildWtmOptions, formatCdpError } from './shared-options.ts';

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

  describe('cdpUrl 변환', () => {
    test('useChrome 미지정이면 cdpUrl은 undefined', () => {
      const result = buildWtmOptions({});
      expect(result.cdpUrl).toBeUndefined();
    });

    test('useChrome가 true이면 기본 포트 9222 사용', () => {
      const result = buildWtmOptions({ useChrome: true });
      expect(result.cdpUrl).toBe('http://127.0.0.1:9222');
    });

    test('useChrome가 포트 문자열이면 해당 포트 사용', () => {
      const result = buildWtmOptions({ useChrome: '9333' });
      expect(result.cdpUrl).toBe('http://127.0.0.1:9333');
    });
  });
});

describe('formatCdpError', () => {
  test('useChrome + ECONNREFUSED이면 가이드 메시지 포함', () => {
    const error = new Error('connect ECONNREFUSED 127.0.0.1:9222');
    const result = formatCdpError(error, { useChrome: true });

    expect(result).toContain('ECONNREFUSED');
    expect(result).toContain('Chrome CDP 연결 실패 (포트 9222)');
    expect(result).toContain('--remote-debugging-port=9222');
    expect(result).toContain('--user-data-dir=');
  });

  test('useChrome + 커스텀 포트 + ECONNREFUSED이면 해당 포트 표시', () => {
    const error = new Error('connect ECONNREFUSED 127.0.0.1:9333');
    const result = formatCdpError(error, { useChrome: '9333' });

    expect(result).toContain('포트 9333');
    expect(result).toContain('--remote-debugging-port=9333');
  });

  test('useChrome 없으면 원본 메시지 반환', () => {
    const error = new Error('connect ECONNREFUSED 127.0.0.1:9222');
    const result = formatCdpError(error, {});

    expect(result).toBe('connect ECONNREFUSED 127.0.0.1:9222');
  });

  test('ECONNREFUSED가 아닌 에러면 원본 메시지 반환', () => {
    const error = new Error('something else');
    const result = formatCdpError(error, { useChrome: true });

    expect(result).toBe('something else');
  });

  test('Error가 아닌 값도 처리', () => {
    const result = formatCdpError('string error', {});
    expect(result).toBe('string error');
  });
});
