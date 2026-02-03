/**
 * HTML 전처리 유틸리티
 * - script/style/hidden 요소 제거
 * - 토큰 추정 (대략 4자 = 1토큰)
 */

const REMOVE_SELECTORS = [
  'link',
  'script',
  'style',
  'noscript',
  'iframe',
  'svg',
  '[hidden]',
  '[style*="display:none"]',
  '[style*="display: none"]',
  '[aria-hidden="true"]',
];

/**
 * 토큰 수 추정 (대략 4자 = 1토큰)
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * HTML을 청킹 (100k 토큰 기준)
 */
export function chunkHtml(html: string, maxTokens: number = 100000): string[] {
  const maxChars = maxTokens * 4;

  if (html.length <= maxChars) {
    return [html];
  }

  const chunks: string[] = [];
  let remaining = html;

  while (remaining.length > 0) {
    if (remaining.length <= maxChars) {
      chunks.push(remaining);
      break;
    }

    // 태그가 잘리지 않도록 마지막 닫는 태그 위치 찾기
    let splitPoint = maxChars;
    const lastTagEnd = remaining.lastIndexOf('>', splitPoint);
    if (lastTagEnd > maxChars * 0.8) {
      splitPoint = lastTagEnd + 1;
    }

    chunks.push(remaining.slice(0, splitPoint));
    remaining = remaining.slice(splitPoint);
  }

  return chunks;
}

export { REMOVE_SELECTORS };
