import { test, expect, describe } from 'bun:test';
import { WtmConfig } from './wtm-config.ts';
import type { WtmOptions } from './types.ts';

describe('WtmConfig', () => {
  test('빈 옵션 시 기본값 적용', () => {
    const config = new WtmConfig({});

    expect(config.debug).toBe(false);
    expect(config.llm.enable).toBe(false);
  });

  test('debug 지정 시 해당 값 사용', () => {
    const config = new WtmConfig({ debug: true });

    expect(config.debug).toBe(true);
  });

  test('LLM enable 시 baseUrl 누락하면 Error throw', () => {
    const options: WtmOptions = {
      llm: { enable: true, baseUrl: '', apiKey: 'key', model: 'gpt-4' },
    };

    expect(() => new WtmConfig(options)).toThrow('baseUrl');
  });

  test('LLM enable 시 apiKey 누락하면 Error throw', () => {
    const options: WtmOptions = {
      llm: { enable: true, baseUrl: 'http://localhost', apiKey: '', model: 'gpt-4' },
    };

    expect(() => new WtmConfig(options)).toThrow('apiKey');
  });

  test('LLM enable 시 model 누락하면 Error throw', () => {
    const options: WtmOptions = {
      llm: { enable: true, baseUrl: 'http://localhost', apiKey: 'key', model: '' },
    };

    expect(() => new WtmConfig(options)).toThrow('model');
  });

  test('LLM enable 시 복수 필드 누락하면 모두 에러 메시지에 포함', () => {
    const options: WtmOptions = {
      llm: { enable: true, baseUrl: '', apiKey: '', model: '' },
    };

    expect(() => new WtmConfig(options)).toThrow('baseUrl, apiKey, model');
  });

  test('LLM disable 시 필수 필드 없어도 통과', () => {
    expect(() => new WtmConfig({ llm: { enable: false } })).not.toThrow();
  });

  test('llm 미지정 시 LLM 비활성 기본값 적용', () => {
    const config = new WtmConfig({});

    expect(config.llm.enable).toBe(false);
    expect(config.llm.baseUrl).toBe('');
    expect(config.llm.apiKey).toBe('');
    expect(config.llm.model).toBe('');
  });

  test('정상 입력 시 프로퍼티 접근 가능', () => {
    const options: WtmOptions = {
      llm: { enable: true, baseUrl: 'http://localhost', apiKey: 'key', model: 'gpt-4' },
      debug: true,
    };

    const config = new WtmConfig(options);

    expect(config.debug).toBe(true);
    expect(config.llm.enable).toBe(true);
    expect(config.llm.baseUrl).toBe('http://localhost');
    expect(config.llm.apiKey).toBe('key');
    expect(config.llm.model).toBe('gpt-4');
  });
});
