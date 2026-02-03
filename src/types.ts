/**
 * 공유 타입 정의
 */

export interface PageMetadata {
  title: string;
  description: string;
  ogImage: string;
  url: string;
}

export interface RenderResult {
  html: string;
  metadata: PageMetadata;
}
