import { test, expect, describe } from 'bun:test';
import {
  REMOVE_SELECTORS,
  estimateTokens,
  chunkHtml,
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

  test('chunkHtml: 작은 HTML은 청킹 안 함', () => {
    const html = '<div>Small content</div>';
    const chunks = chunkHtml(html, 100);
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toBe(html);
  });

  test('chunkHtml: 큰 HTML 청킹', () => {
    const html = 'a'.repeat(1000);
    const chunks = chunkHtml(html, 100); // 100 토큰 = 400자
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.join('')).toBe(html);
  });
});
