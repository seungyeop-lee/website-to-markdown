/**
 * 페이지 렌더링
 * 책임: URL → 렌더링된 HTML + 메타데이터 반환
 * 협력자: BrowserManager
 */

import type {Page} from 'playwright';
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

      const html = await this.getMergedFramesContent(page);

      return { html, metadata: await this.extractMetadata(url) };
    } finally {
      await page.close();
    }
  }

  private async getMergedFramesContent(page: Page): Promise<string> {
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

    // 메인 프레임의 HTML을 베이스로 사용
    const mainContent = await page.content();

    // 자식 프레임들의 body innerHTML 수집
    const childContents: string[] = [];
    const childFrames = allFrames.slice(1); // 메인 프레임 제외

    for (const frame of childFrames) {
      try {
        const bodyHtml = await frame.evaluate(() => document.body?.innerHTML ?? '');
        if (bodyHtml) {
          childContents.push(bodyHtml);
        }
      } catch {
        // 접근 불가한 프레임 무시
      }
    }

    if (childContents.length === 0) return mainContent;

    // 메인 HTML의 </body> 앞에 자식 프레임 콘텐츠 삽입
    const insertionPoint = mainContent.lastIndexOf('</body>');
    if (insertionPoint === -1) {
      return mainContent + childContents.join('\n');
    }

    return (
      mainContent.slice(0, insertionPoint) +
      childContents.join('\n') +
      mainContent.slice(insertionPoint)
    );
  }

  private async extractMetadata(url: string): Promise<PageMetadata> {
    const urlObj = new URL(url);
    const origin = `${urlObj.protocol}//${urlObj.host}`;
    return {url, origin};
  }
}
