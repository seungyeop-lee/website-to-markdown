/**
 * 브라우저 생명주기 관리
 * 책임: 브라우저 인스턴스 생성/종료
 */

import { chromium } from 'playwright-extra';
import { chromium as playwrightChromium } from 'playwright';
import type { Browser, Page } from 'playwright';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

chromium.use(StealthPlugin());

export class BrowserManager {
  private browser: Browser | null = null;
  private launchPromise: Promise<Browser> | null = null;

  constructor(
    private launchBrowser: () => Promise<Browser> = () => chromium.launch({ headless: true }),
  ) {}

  static create(cdpUrl?: string): BrowserManager {
    if (cdpUrl) {
      return new BrowserManager(() => playwrightChromium.connectOverCDP(cdpUrl));
    }
    return new BrowserManager();
  }

  /**
   * CDP 연결 시 기존 브라우저 컨텍스트(쿠키/세션 포함)에서 페이지를 생성한다.
   * 로컬 launch 시에는 컨텍스트가 없으므로 browser.newPage()로 새 컨텍스트를 만든다.
   */
  async getPage(): Promise<Page> {
    const browser = await this.getBrowser();
    const contexts = browser.contexts();
    if (contexts.length > 0 && contexts[0]) {
      return contexts[0].newPage();
    }
    return browser.newPage();
  }

  async getBrowser(): Promise<Browser> {
    if (this.browser) {
      return this.browser;
    }

    if (!this.launchPromise) {
      this.launchPromise = this.launchBrowser()
        .then((browser) => {
          this.browser = browser;
          return browser;
        })
        .finally(() => {
          this.launchPromise = null;
        });
    }

    return await this.launchPromise;
  }

  async close(): Promise<void> {
    const browser = this.browser ?? (this.launchPromise ? await this.launchPromise : null);
    this.browser = null;

    if (browser) {
      await browser.close();
    }
  }
}
