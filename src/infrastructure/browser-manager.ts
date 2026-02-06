/**
 * 브라우저 생명주기 관리
 * 책임: 브라우저 인스턴스 생성/종료
 */

import { chromium } from 'playwright-extra';
import type { Browser } from 'playwright';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

chromium.use(StealthPlugin());

export class BrowserManager {
  private browser: Browser | null = null;
  private launchPromise: Promise<Browser> | null = null;

  constructor(
    private launchBrowser: () => Promise<Browser> = () => chromium.launch({ headless: true }),
  ) {}

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
