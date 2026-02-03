/**
 * 페이지 렌더링
 * 책임: URL → 렌더링된 HTML + 메타데이터 반환
 * 협력자: BrowserManager
 */

import type { Page } from 'playwright';
import type { PageMetadata, RenderResult } from '../types.ts';
import type { BrowserManager } from '../infrastructure/browser-manager.ts';
import { REMOVE_SELECTORS } from '../utils/html-preprocessor.ts';

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

      const metadata = await this.extractMetadata(page, url);

      await page.evaluate((selectors: string[]) => {
        for (const selector of selectors) {
          document.querySelectorAll(selector).forEach((el) => el.remove());
        }
      }, REMOVE_SELECTORS);

      const html = await page.content();

      return { html, metadata };
    } finally {
      await page.close();
    }
  }

  private async extractMetadata(page: Page, url: string): Promise<PageMetadata> {
    const title = await page.title();

    const description = await page.evaluate(() => {
      const meta =
        document.querySelector('meta[name="description"]') ||
        document.querySelector('meta[property="og:description"]');
      return meta?.getAttribute('content') || '';
    });

    const ogImage = await page.evaluate(() => {
      const meta = document.querySelector('meta[property="og:image"]');
      return meta?.getAttribute('content') || '';
    });

    return { title, description, ogImage, url };
  }
}
