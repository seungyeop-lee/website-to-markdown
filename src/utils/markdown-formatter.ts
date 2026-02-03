/**
 * 마크다운 포매팅 모듈
 * 책임: 메타데이터 헤더(YAML front matter) 생성
 */

import type { PageMetadata } from '../types.ts';

export function formatMetadataHeader(metadata: PageMetadata): string {
  const entries: [string, string | undefined][] = [
    ['title', metadata.title],
    ['description', metadata.description],
    ['og_image', metadata.ogImage],
    ['source', metadata.url],
  ];

  const fields = entries
    .filter(([, value]) => value)
    .map(([key, value]) => `${key}: "${value!.replace(/"/g, '\\"')}"`)
    .join('\n');

  return `---\n${fields}\n---\n\n`;
}
