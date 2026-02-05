/**
 * URL 정규화 유틸리티
 * 책임: 동일한 페이지를 가리키는 다양 URL 형태를 통일된 형태로 변환
 */

/**
 * URL을 정규화하여 중복을 방지
 *
 * 정규화 규칙:
 * 1. index.html/index.htm 제거
 * 2. 트레일링 슬래시 제거 (루트 / 제외)
 * 3. 프로토콜/호스트 소문자화
 * 4. 기본 포트 제거 (HTTP 80, HTTPS 443)
 *
 * @example
 * normalizeUrl("https://example.com/path/") // "https://example.com/path"
 * normalizeUrl("https://example.com/path/index.html") // "https://example.com/path"
 * normalizeUrl("https://EXAMPLE.COM/path") // "https://example.com/path"
 */
export function normalizeUrl(url: string): string {
  try {
    const urlObj = new URL(url);

    // 프로토콜 소문자화 (URL 생성자가 자동 처리)
    // 호스트 소문자화
    urlObj.hostname = urlObj.hostname.toLowerCase();

    // 기본 포트 제거
    if ((urlObj.protocol === 'http:' && urlObj.port === '80') ||
        (urlObj.protocol === 'https:' && urlObj.port === '443')) {
      urlObj.port = '';
    }

    // pathname 정규화
    let pathname = urlObj.pathname;

    // index.html/index.htm 제거
    if (pathname.endsWith('/index.html')) {
      pathname = pathname.slice(0, -10); // '/index.html' 길이
    } else if (pathname.endsWith('/index.htm')) {
      pathname = pathname.slice(0, -9); // '/index.htm' 길이
    }

    // 트레일링 슬래시 제거 (루트 제외)
    if (pathname.endsWith('/') && pathname !== '/') {
      pathname = pathname.slice(0, -1);
    }

    // 루트 경로 보장
    if (pathname === '' || pathname === '.') {
      pathname = '/';
    }

    urlObj.pathname = pathname;

    // hash, search는 유지 (다른 페이지/상태일 수 있음)
    return urlObj.href;
  } catch {
    // URL 파싱 실패 시 원본 반환
    return url;
  }
}
