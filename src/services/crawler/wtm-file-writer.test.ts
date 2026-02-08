import { test, expect, describe, mock, beforeEach } from 'bun:test';
import { WtmFileWriter } from './wtm-file-writer.ts';
import type { WtmResult } from '../../types.ts';

describe('WtmFileWriter', () => {
  const mockResult: WtmResult = {
    markdown: '# Test',
    metadata: {
      url: 'https://example.com/docs/api',
      origin: 'https://example.com',
      pathname: '/docs/api',
      title: 'API Docs',
      links: [],
    },
  };

  const mockWtmFn = mock(() => Promise.resolve(mockResult));

  beforeEach(() => {
    mockWtmFn.mockClear();
  });

  describe('resolveFilePath', () => {
    const writer = new WtmFileWriter(mockWtmFn, '/output');

    test('루트 URL → index.md', () => {
      expect(writer.resolveFilePath('https://example.com/')).toBe('/output/index.md');
    });

    test('루트 URL (슬래시 없음) → index.md', () => {
      expect(writer.resolveFilePath('https://example.com')).toBe('/output/index.md');
    });

    test('경로 → 경로.md', () => {
      expect(writer.resolveFilePath('https://example.com/docs/api/auth')).toBe('/output/docs/api/auth.md');
    });

    test('트레일링 슬래시 있는 경로 → 경로.md', () => {
      expect(writer.resolveFilePath('https://example.com/docs/')).toBe('/output/docs.md');
    });

    test('확장자 있는 경로 → .md로 대체', () => {
      expect(writer.resolveFilePath('https://example.com/page.html')).toBe('/output/page.md');
    });

    test('깊은 경로', () => {
      expect(writer.resolveFilePath('https://example.com/a/b/c/d')).toBe('/output/a/b/c/d.md');
    });

    test('쿼리 파라미터를 파일명에 반영', () => {
      expect(writer.resolveFilePath('https://example.com/docs/api?lang=ko&page=2'))
        .toMatch(/^\/output\/docs\/api__lang-ko_page-2__h[a-f0-9]{8}\.md$/);
    });

    test('쿼리 파라미터 순서가 달라도 동일 파일명', () => {
      const a = writer.resolveFilePath('https://example.com/docs/api?lang=ko&page=2');
      const b = writer.resolveFilePath('https://example.com/docs/api?page=2&lang=ko');
      expect(a).toBe(b);
    });

    test('쿼리 파라미터 값이 다르면 파일명이 달라짐', () => {
      const a = writer.resolveFilePath('https://example.com/docs/api?lang=ko&page=2');
      const b = writer.resolveFilePath('https://example.com/docs/api?lang=en&page=2');
      expect(a).not.toBe(b);
    });

    test('루트 URL + 쿼리 파라미터', () => {
      expect(writer.resolveFilePath('https://example.com/?lang=ko'))
        .toMatch(/^\/output\/index__lang-ko__h[a-f0-9]{8}\.md$/);
    });
  });

  describe('write', () => {
    test('convertFn 호출 후 파일 저장', async () => {
      const written: { path: string; content: string }[] = [];
      const originalWrite = Bun.write;
      // @ts-expect-error: mock Bun.write
      Bun.write = mock((path: string, content: string) => {
        written.push({ path, content });
        return Promise.resolve(content.length);
      });

      try {
        const writer = new WtmFileWriter(mockWtmFn, '/output');
        const result = await writer.write('https://example.com/docs/api');

        expect(mockWtmFn).toHaveBeenCalledTimes(1);
        expect(mockWtmFn).toHaveBeenCalledWith('https://example.com/docs/api');
        expect(written).toHaveLength(1);
        expect(written[0]!.path).toBe('/output/docs/api.md');
        expect(written[0]!.content).toBe('# Test');
        expect(result).toEqual(mockResult);
      } finally {
        Bun.write = originalWrite;
      }
    });

    test('write 시 쿼리 파라미터를 포함한 파일명으로 저장', async () => {
      const written: { path: string; content: string }[] = [];
      const originalWrite = Bun.write;
      // @ts-expect-error: mock Bun.write
      Bun.write = mock((path: string, content: string) => {
        written.push({ path, content });
        return Promise.resolve(content.length);
      });

      try {
        const writer = new WtmFileWriter(mockWtmFn, '/output');
        await writer.write('https://example.com/docs/api?lang=ko&page=2');

        expect(written).toHaveLength(1);
        expect(written[0]!.path).toMatch(/^\/output\/docs\/api__lang-ko_page-2__h[a-f0-9]{8}\.md$/);
      } finally {
        Bun.write = originalWrite;
      }
    });
  });
});
