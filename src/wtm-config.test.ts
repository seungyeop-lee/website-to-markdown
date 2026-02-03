import { test, expect, describe } from 'bun:test';
import { WtmConfig } from './wtm-config.ts';
import type { WtmOptions } from './types.ts';

describe('WtmConfig', () => {
  test('debug 미지정 시 false 기본값 적용', () => {
    const options: WtmOptions = {
      llm: { enable: false, baseUrl: '', apiKey: '', model: '' },
    };

    const config = new WtmConfig(options);

    expect(config.debug).toBe(false);
  });

  test('debug 지정 시 해당 값 사용', () => {
    const options: WtmOptions = {
      llm: { enable: false, baseUrl: '', apiKey: '', model: '' },
      debug: true,
    };

    const config = new WtmConfig(options);

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
    const options: WtmOptions = {
      llm: { enable: false, baseUrl: '', apiKey: '', model: '' },
    };

    expect(() => new WtmConfig(options)).not.toThrow();
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
