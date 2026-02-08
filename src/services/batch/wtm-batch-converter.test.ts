import { test, expect, describe, mock, beforeEach } from 'bun:test';
import { BatchConvertConfig } from './batch-convert-config.ts';
import { WtmBatchConverter } from './wtm-batch-converter.ts';
import type { WtmResult } from '../../types.ts';

// Bun.write mock
const writtenFiles: { path: string; content: string }[] = [];
// @ts-expect-error: mock Bun.write
Bun.write = mock((path: string, content: string) => {
  writtenFiles.push({ path, content });
  return Promise.resolve(content.length);
});

function makeResult(url: string, links: string[] = []): WtmResult {
  const urlObj = new URL(url);
  return {
    markdown: `# Page: ${url}`,
    metadata: {
      url,
      origin: urlObj.origin,
      pathname: urlObj.pathname,
      title: `Title: ${url}`,
      links,
    },
  };
}

describe('WtmBatchConverter', () => {
  beforeEach(() => {
    writtenFiles.length = 0;
  });

  test('URL 리스트를 일괄 처리', async () => {
    const convertMock = mock((url: string) =>
      Promise.resolve(makeResult(url)),
    );
    const converter = { convert: convertMock };

    const batchConverter = new WtmBatchConverter(converter, new BatchConvertConfig({
      outputDir: '/out',
    }));

    const urls = [
      'https://example.com/a',
      'https://example.com/b',
      'https://example.com/c',
    ];

    const result = await batchConverter.convert(urls);

    expect(result.succeeded).toHaveLength(3);
    expect(result.failed).toHaveLength(0);
    expect(result.skipped).toHaveLength(0);
    expect(convertMock).toHaveBeenCalledTimes(3);
  });

  test('링크를 따라가지 않음', async () => {
    const convertMock = mock((url: string) =>
      Promise.resolve(makeResult(url, ['https://example.com/should-not-follow'])),
    );
    const converter = { convert: convertMock };

    const batchConverter = new WtmBatchConverter(converter, new BatchConvertConfig({
      outputDir: '/out',
    }));

    const result = await batchConverter.convert(['https://example.com/a']);

    expect(convertMock).toHaveBeenCalledTimes(1);
    expect(result.succeeded).toEqual(['https://example.com/a']);
  });
});
