/**
 * UrlScopeFilter
 * 책임: 후보 URL이 크롤링 범위 내인지 판단
 */

export class UrlScopeFilter {
  private origin: string;
  private scopePrefix: string;
  private maxPathDepth?: number;

  constructor(startUrl: string, scopeLevels: number = 0, maxPathDepth?: number) {
    const urlObj = new URL(startUrl);
    this.origin = urlObj.origin;
    this.scopePrefix = this.computeScopePrefix(urlObj.pathname, scopeLevels);
    this.maxPathDepth = maxPathDepth;
  }

  isInScope(candidateUrl: string): boolean {
    try {
      const urlObj = new URL(candidateUrl);
      if (urlObj.origin !== this.origin) return false;
      if (!urlObj.pathname.startsWith(this.scopePrefix)) return false;

      if (this.maxPathDepth != null) {
        const relativePath = urlObj.pathname.slice(this.scopePrefix.length);
        const segments = relativePath.split('/').filter(s => s !== '');
        if (segments.length > this.maxPathDepth) return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  private computeScopePrefix(pathname: string, scopeLevels: number): string {
    // /a/b/c/page → segments = ['', 'a', 'b', 'c', 'page']
    const segments = pathname.split('/');
    // 마지막 세그먼트 제거 (현재 페이지) → ['', 'a', 'b', 'c']
    const parentSegments = segments.slice(0, -1);

    // scopeLevels만큼 추가 제거
    const remaining = Math.max(1, parentSegments.length - scopeLevels);
    const scopeSegments = parentSegments.slice(0, remaining);

    const prefix = scopeSegments.join('/');
    return prefix === '' ? '/' : prefix + '/';
  }
}
