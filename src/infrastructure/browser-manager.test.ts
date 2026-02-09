import { beforeEach, describe, expect, mock, test } from 'bun:test';
import type { Browser, Page } from 'playwright';
import { BrowserManager } from './browser-manager.ts';

describe('BrowserManager', () => {
  let closeSpy: ReturnType<typeof mock>;
  let fakeBrowser: Browser;

  beforeEach(() => {
    closeSpy = mock(() => Promise.resolve());
    fakeBrowser = { close: closeSpy } as unknown as Browser;
  });

  test('동시 getBrowser 호출 시 브라우저를 한 번만 launch한다', async () => {
    let resolveLaunch!: (browser: Browser) => void;
    const launchSpy = mock(() => new Promise<Browser>((resolve) => {
      resolveLaunch = resolve;
    }));
    const manager = new BrowserManager(launchSpy);

    const p1 = manager.getBrowser();
    const p2 = manager.getBrowser();
    const p3 = manager.getBrowser();

    expect(launchSpy).toHaveBeenCalledTimes(1);

    resolveLaunch(fakeBrowser);
    const [b1, b2, b3] = await Promise.all([p1, p2, p3]);

    expect(b1).toBe(fakeBrowser);
    expect(b2).toBe(fakeBrowser);
    expect(b3).toBe(fakeBrowser);
  });

  test('close는 열린 브라우저를 닫는다', async () => {
    const launchSpy = mock(() => Promise.resolve(fakeBrowser));
    const manager = new BrowserManager(launchSpy);

    await manager.getBrowser();
    await manager.close();

    expect(closeSpy).toHaveBeenCalledTimes(1);
  });

  describe('create', () => {
    test('cdpUrl 없으면 기본 BrowserManager를 반환한다', () => {
      const manager = BrowserManager.create();
      expect(manager).toBeInstanceOf(BrowserManager);
    });

    test('cdpUrl 있으면 BrowserManager를 반환한다', () => {
      const manager = BrowserManager.create('http://127.0.0.1:9222');
      expect(manager).toBeInstanceOf(BrowserManager);
    });
  });

  describe('getPage', () => {
    test('컨텍스트가 있으면 기존 컨텍스트에서 페이지 생성', async () => {
      const fakePage = {} as Page;
      const fakeContext = { newPage: mock(() => Promise.resolve(fakePage)) };
      const browser = {
        close: closeSpy,
        contexts: mock(() => [fakeContext]),
        newPage: mock(() => Promise.resolve({} as Page)),
      } as unknown as Browser;
      const manager = new BrowserManager(mock(() => Promise.resolve(browser)));

      const page = await manager.getPage();

      expect(page).toBe(fakePage);
      expect(fakeContext.newPage).toHaveBeenCalledTimes(1);
      expect(browser.newPage).not.toHaveBeenCalled();
    });

    test('컨텍스트가 없으면 browser.newPage()로 생성', async () => {
      const fakePage = {} as Page;
      const browser = {
        close: closeSpy,
        contexts: mock(() => []),
        newPage: mock(() => Promise.resolve(fakePage)),
      } as unknown as Browser;
      const manager = new BrowserManager(mock(() => Promise.resolve(browser)));

      const page = await manager.getPage();

      expect(page).toBe(fakePage);
      expect(browser.newPage).toHaveBeenCalledTimes(1);
    });
  });

  test('launch 진행 중 close 호출 시 launch 완료 후 브라우저를 닫는다', async () => {
    let resolveLaunch!: (browser: Browser) => void;
    const launchSpy = mock(() => new Promise<Browser>((resolve) => {
      resolveLaunch = resolve;
    }));
    const manager = new BrowserManager(launchSpy);

    const launching = manager.getBrowser();
    const closing = manager.close();

    resolveLaunch(fakeBrowser);

    await launching;
    await closing;

    expect(launchSpy).toHaveBeenCalledTimes(1);
    expect(closeSpy).toHaveBeenCalledTimes(1);
  });
});
