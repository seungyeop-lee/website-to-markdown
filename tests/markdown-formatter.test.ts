import { test, expect, describe } from 'bun:test';
import { formatMetadataHeader } from '../src/utils/markdown-formatter.ts';

describe('markdown-formatter', () => {
  test('모든 필드가 있는 메타데이터 헤더 생성', () => {
    const metadata = {
      title: 'Test Title',
      description: 'Test Description',
      ogImage: 'https://example.com/image.png',
      url: 'https://example.com',
    };

    const header = formatMetadataHeader(metadata);

    expect(header).toContain('---');
    expect(header).toContain('title: "Test Title"');
    expect(header).toContain('description: "Test Description"');
    expect(header).toContain('og_image: "https://example.com/image.png"');
    expect(header).toContain('source: "https://example.com"');
  });

  test('빈 필드는 제외', () => {
    const metadata = {
      title: 'Test Title',
      description: '',
      ogImage: '',
      url: 'https://example.com',
    };

    const header = formatMetadataHeader(metadata);

    expect(header).toContain('title: "Test Title"');
    expect(header).toContain('source: "https://example.com"');
    expect(header).not.toContain('description');
    expect(header).not.toContain('og_image');
  });

  test('따옴표 이스케이프 처리', () => {
    const metadata = {
      title: 'Title with "quotes"',
      description: '',
      ogImage: '',
      url: 'https://example.com',
    };

    const header = formatMetadataHeader(metadata);

    expect(header).toContain('title: "Title with \\"quotes\\""');
  });

  test('YAML front matter 형식 준수', () => {
    const metadata = {
      title: 'Test',
      description: '',
      ogImage: '',
      url: 'https://example.com',
    };

    const header = formatMetadataHeader(metadata);

    expect(header).toStartWith('---\n');
    expect(header).toEndWith('---\n\n');
  });
});
