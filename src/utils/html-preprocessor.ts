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

export { REMOVE_SELECTORS };
