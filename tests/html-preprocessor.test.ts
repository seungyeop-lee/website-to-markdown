import { test, expect, describe } from 'bun:test';
import {
  REMOVE_SELECTORS,
  estimateTokens,
} from '../src/utils/html-preprocessor.ts';

describe('html-preprocessor', () => {
  test('REMOVE_SELECTORS: 필수 셀렉터 포함', () => {
    expect(REMOVE_SELECTORS).toContain('script');
    expect(REMOVE_SELECTORS).toContain('style');
    expect(REMOVE_SELECTORS).toContain('noscript');
    expect(REMOVE_SELECTORS).toContain('[hidden]');
    expect(REMOVE_SELECTORS).toContain('[aria-hidden="true"]');
  });

  test('estimateTokens: 토큰 수 추정', () => {
    const text = 'Hello World'; // 11자
    const tokens = estimateTokens(text);
    expect(tokens).toBe(3); // ceil(11/4) = 3
  });
});
