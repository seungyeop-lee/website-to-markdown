import { test, expect, describe } from 'bun:test';
import { UrlScopeFilter } from './url-scope-filter.ts';

describe('UrlScopeFilter', () => {
  describe('scopeLevels = 0 (기본: 시작 URL의 부모 디렉토리)', () => {
    const filter = new UrlScopeFilter('https://example.com/a/b/c/page');

    test('같은 디렉토리 내 URL 허용', () => {
      expect(filter.isInScope('https://example.com/a/b/c/other')).toBe(true);
    });

    test('같은 디렉토리 하위 URL 허용', () => {
      expect(filter.isInScope('https://example.com/a/b/c/sub/deep')).toBe(true);
    });

    test('상위 디렉토리 URL 거부', () => {
      expect(filter.isInScope('https://example.com/a/b/other')).toBe(false);
    });

    test('다른 origin 거부', () => {
      expect(filter.isInScope('https://other.com/a/b/c/page')).toBe(false);
    });
  });

  describe('scopeLevels = 1 (한 단계 위)', () => {
    const filter = new UrlScopeFilter('https://example.com/a/b/c/page', 1);

    test('부모의 부모 디렉토리 내 URL 허용', () => {
      expect(filter.isInScope('https://example.com/a/b/other')).toBe(true);
    });

    test('더 상위 디렉토리 거부', () => {
      expect(filter.isInScope('https://example.com/a/other')).toBe(false);
    });
  });

  describe('scopeLevels = 2 (두 단계 위)', () => {
    const filter = new UrlScopeFilter('https://example.com/a/b/c/page', 2);

    test('두 단계 상위 디렉토리 내 URL 허용', () => {
      expect(filter.isInScope('https://example.com/a/other')).toBe(true);
    });

    test('최상위 경로 거부', () => {
      expect(filter.isInScope('https://example.com/other')).toBe(false);
    });
  });

  describe('scopeLevels가 경로 깊이보다 큰 경우', () => {
    const filter = new UrlScopeFilter('https://example.com/a/page', 10);

    test('전체 사이트 범위로 확장', () => {
      expect(filter.isInScope('https://example.com/anything')).toBe(true);
    });

    test('다른 origin은 여전히 거부', () => {
      expect(filter.isInScope('https://other.com/anything')).toBe(false);
    });
  });

  describe('루트 URL', () => {
    const filter = new UrlScopeFilter('https://example.com/');

    test('같은 origin의 모든 경로 허용', () => {
      expect(filter.isInScope('https://example.com/any/path')).toBe(true);
    });
  });

  test('무효한 후보 URL은 거부', () => {
    const filter = new UrlScopeFilter('https://example.com/a/b');
    expect(filter.isInScope('not-a-url')).toBe(false);
  });
});
