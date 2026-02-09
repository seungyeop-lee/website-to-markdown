/**
 * 페이지 렌더링
 * 책임: URL → 렌더링된 HTML + 메타데이터 반환
 * 협력자: BrowserProvider
 */

import type {Page} from 'playwright';
import type {PageMetadata, RenderResult, BrowserProvider} from '../../types.ts';
import {logger} from '../../infrastructure/logger.ts';

export class PageRenderer {
  constructor(private browserProvider: BrowserProvider) {}

  async render(url: string): Promise<RenderResult> {
    const page = await this.browserProvider.getPage();

    try {
      await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });

      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {
        logger.debug(`networkidle timeout: ${url}`);
      });

      const html = await this.getMergedFramesContent(page);

      return { html, metadata: await this.extractMetadata(page) };
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
      } catch (e) {
        logger.debug(`프레임 접근 불가 (무시됨): ${e instanceof Error ? e.message : e}`);
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

  private async extractMetadata(page: Page): Promise<PageMetadata> {
    const finalUrl = page.url();
    const urlObj = new URL(finalUrl);
    const origin = `${urlObj.protocol}//${urlObj.host}`;
    const pathname = urlObj.pathname;
    const title = await page.title();
    const links = await this.extractLinks(page);
    return { url: finalUrl, origin, pathname, title, links };
  }

  private async extractLinks(page: Page): Promise<string[]> {
    const rawLinks: string[] = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a[href]'))
        .map(a => (a as HTMLAnchorElement).href)
        .filter(href => href.startsWith('http'));
    });

    const unique = new Set<string>();
    for (const link of rawLinks) {
      try {
        const urlObj = new URL(link);
        urlObj.hash = '';
        unique.add(urlObj.href);
      } catch {
        // 무효한 URL 무시
      }
    }
    return Array.from(unique);
  }
}
