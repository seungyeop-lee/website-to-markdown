/**
 * 페이지 렌더링
 * 책임: URL → 렌더링된 HTML + 메타데이터 반환
 * 협력자: BrowserManager
 */

import type {PageMetadata, RenderResult} from '../types.ts';
import type {BrowserManager} from '../infrastructure/browser-manager.ts';

export class PageRenderer {
  constructor(private browserManager: BrowserManager) {}

  async render(url: string): Promise<RenderResult> {
    const browser = await this.browserManager.getBrowser();
    const page = await browser.newPage();

    try {
      await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });

      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {
        console.warn(`[warn] networkidle timeout: ${url}`);
      });

      return { html: await page.content(), metadata: await this.extractMetadata(url) };
    } finally {
      await page.close();
    }
  }

  private async extractMetadata(url: string): Promise<PageMetadata> {
    const urlObj = new URL(url);
    const origin = `${urlObj.protocol}//${urlObj.host}`;
    return {url, origin};
  }
}
