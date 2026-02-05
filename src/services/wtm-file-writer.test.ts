import { test, expect, describe, mock, beforeEach } from 'bun:test';
import { WtmFileWriter } from './wtm-file-writer.ts';
import type { WtmResult } from '../types.ts';

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
  });

  describe('write', () => {
    test('wtmFn 호출 후 파일 저장', async () => {
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
        expect(mockWtmFn).toHaveBeenCalledWith('https://example.com/docs/api', undefined);
        expect(written).toHaveLength(1);
        expect(written[0]!.path).toBe('/output/docs/api.md');
        expect(written[0]!.content).toBe('# Test');
        expect(result).toEqual(mockResult);
      } finally {
        Bun.write = originalWrite;
      }
    });

    test('wtmOptions를 wtmFn에 전달', async () => {
      const originalWrite = Bun.write;
      Bun.write = mock(() => Promise.resolve(0)) as typeof Bun.write;

      try {
        const opts = { debug: true };
        const writer = new WtmFileWriter(mockWtmFn, '/output', opts);
        await writer.write('https://example.com/page');

        expect(mockWtmFn).toHaveBeenCalledWith('https://example.com/page', opts);
      } finally {
        Bun.write = originalWrite;
      }
    });
  });
});
