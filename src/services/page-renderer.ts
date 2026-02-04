/**
 * 페이지 렌더링
 * 책임: URL → 렌더링된 HTML + 메타데이터 반환
 * 협력자: BrowserManager
 */

import type {Frame, Page} from 'playwright';
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

      const html = await this.getContentFromRichestFrame(page);

      return { html, metadata: await this.extractMetadata(url) };
    } finally {
      await page.close();
    }
  }

  private async getContentFromRichestFrame(page: Page): Promise<string> {
    const allFrames = page.frames();

    // 프레임이 메인 하나뿐이면 그대로 반환
    if (allFrames.length <= 1) return page.content();

    // 모든 프레임 로딩 대기
    await Promise.all(
      allFrames.map(async (frame) => {
        await frame.waitForLoadState('domcontentloaded', { timeout: 15000 }).catch(() => {});
        await frame.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
      }),
    );

    // 모든 프레임에서 텍스트 길이 측정하여 가장 콘텐츠가 많은 프레임 선택
    let richestFrame: Frame = page.mainFrame();
    let maxLength = 0;

    for (const frame of allFrames) {
      try {
        const textLength = await frame.evaluate(() => document.body?.innerText?.length ?? 0);
        if (textLength > maxLength) {
          maxLength = textLength;
          richestFrame = frame;
        }
      } catch {
        // 접근 불가한 프레임 무시
      }
    }

    // SPA 렌더링 대기
    await richestFrame.waitForFunction(
      () => (document.body?.innerText?.length ?? 0) > 100,
      { timeout: 15000 },
    ).catch(() => {});

    return richestFrame.content();
  }

  private async extractMetadata(url: string): Promise<PageMetadata> {
    const urlObj = new URL(url);
    const origin = `${urlObj.protocol}//${urlObj.host}`;
    return {url, origin};
  }
}
