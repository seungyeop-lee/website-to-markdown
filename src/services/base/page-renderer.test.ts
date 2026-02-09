import { test, expect, describe, mock } from 'bun:test';
import { PageRenderer } from './page-renderer.ts';
import type { BrowserProvider } from '../../types.ts';

// --- mock 팩토리 ---

function createMockFrame(overrides: Partial<{
  bodyHtml: string;
  throwOnEvaluate: boolean;
}> = {}) {
  return {
    waitForLoadState: mock(() => Promise.resolve()),
    evaluate: overrides.throwOnEvaluate
      ? mock(() => { throw new Error('cross-origin'); })
      : mock(() => Promise.resolve(overrides.bodyHtml ?? '')),
  };
}

function createMockPage(overrides: Partial<{
  contentHtml: string;
  url: string;
  title: string;
  links: string[];
  childFrames: ReturnType<typeof createMockFrame>[];
  gotoError: Error;
}> = {}) {
  const mainFrame = createMockFrame();
  const allFrames = [mainFrame, ...(overrides.childFrames ?? [])];

  const page = {
    goto: overrides.gotoError
      ? mock(() => Promise.reject(overrides.gotoError))
      : mock(() => Promise.resolve()),
    waitForLoadState: mock(() => Promise.resolve()),
    content: mock(() => Promise.resolve(overrides.contentHtml ?? '<html><body><p>main</p></body></html>')),
    frames: mock(() => allFrames),
    url: mock(() => overrides.url ?? 'https://example.com/page'),
    title: mock(() => Promise.resolve(overrides.title ?? 'Test Page')),
    evaluate: mock(() => Promise.resolve(overrides.links ?? [])),
    close: mock(() => Promise.resolve()),
  };
  return page;
}

function createMockBrowserProvider(page: ReturnType<typeof createMockPage>): BrowserProvider {
  return {
    getPage: mock(() => Promise.resolve(page)),
    close: mock(() => Promise.resolve()),
  } as unknown as BrowserProvider;
}

// --- 테스트 ---

describe('PageRenderer', () => {

  describe('render', () => {
    test('단일 프레임 페이지를 렌더링하고 html + metadata를 반환', async () => {
      const page = createMockPage({
        contentHtml: '<html><body><h1>Hello</h1></body></html>',
        url: 'https://example.com/test',
        title: 'Hello Page',
        links: ['https://example.com/a'],
      });
      const renderer = new PageRenderer(createMockBrowserProvider(page));

      const result = await renderer.render('https://example.com/test');

      expect(result.html).toBe('<html><body><h1>Hello</h1></body></html>');
      expect(result.metadata.url).toBe('https://example.com/test');
      expect(result.metadata.title).toBe('Hello Page');
      expect(result.metadata.origin).toBe('https://example.com');
      expect(result.metadata.pathname).toBe('/test');
    });

    test('networkidle 타임아웃이 발생해도 렌더링 계속 진행', async () => {
      const page = createMockPage();
      page.waitForLoadState = mock(() => Promise.reject(new Error('timeout')));
      const renderer = new PageRenderer(createMockBrowserProvider(page));

      const result = await renderer.render('https://example.com');

      expect(result.html).toBeDefined();
    });

    test('goto 실패 시 에러를 전파하고 page.close()는 호출', async () => {
      const page = createMockPage({ gotoError: new Error('Navigation failed') });
      const renderer = new PageRenderer(createMockBrowserProvider(page));

      await expect(renderer.render('https://invalid.example')).rejects.toThrow('Navigation failed');
      expect(page.close).toHaveBeenCalledTimes(1);
    });

    test('정상 렌더링 후에도 page.close() 호출', async () => {
      const page = createMockPage();
      const renderer = new PageRenderer(createMockBrowserProvider(page));

      await renderer.render('https://example.com');

      expect(page.close).toHaveBeenCalledTimes(1);
    });
  });

  describe('getMergedFramesContent (프레임 병합)', () => {
    test('프레임이 메인 하나뿐이면 page.content() 그대로 반환', async () => {
      const html = '<html><body><p>only main</p></body></html>';
      const page = createMockPage({ contentHtml: html });
      const renderer = new PageRenderer(createMockBrowserProvider(page));

      const result = await renderer.render('https://example.com');

      expect(result.html).toBe(html);
    });

    test('자식 프레임 콘텐츠를 </body> 앞에 삽입', async () => {
      const child1 = createMockFrame({ bodyHtml: '<div>child1</div>' });
      const child2 = createMockFrame({ bodyHtml: '<div>child2</div>' });
      const page = createMockPage({
        contentHtml: '<html><body><p>main</p></body></html>',
        childFrames: [child1, child2],
      });
      const renderer = new PageRenderer(createMockBrowserProvider(page));

      const result = await renderer.render('https://example.com');

      expect(result.html).toBe(
        '<html><body><p>main</p><div>child1</div>\n<div>child2</div></body></html>'
      );
    });

    test('</body> 태그가 없으면 뒤에 연결', async () => {
      const child = createMockFrame({ bodyHtml: '<p>child</p>' });
      const page = createMockPage({
        contentHtml: '<html><p>no body tag</p></html>',
        childFrames: [child],
      });
      const renderer = new PageRenderer(createMockBrowserProvider(page));

      const result = await renderer.render('https://example.com');

      expect(result.html).toBe('<html><p>no body tag</p></html><p>child</p>');
    });

    test('접근 불가한 프레임은 무시', async () => {
      const inaccessible = createMockFrame({ throwOnEvaluate: true });
      const page = createMockPage({
        contentHtml: '<html><body><p>main</p></body></html>',
        childFrames: [inaccessible],
      });
      const renderer = new PageRenderer(createMockBrowserProvider(page));

      const result = await renderer.render('https://example.com');

      expect(result.html).toBe('<html><body><p>main</p></body></html>');
    });

    test('자식 프레임 body가 빈 문자열이면 무시', async () => {
      const emptyChild = createMockFrame({ bodyHtml: '' });
      const page = createMockPage({
        contentHtml: '<html><body><p>main</p></body></html>',
        childFrames: [emptyChild],
      });
      const renderer = new PageRenderer(createMockBrowserProvider(page));

      const result = await renderer.render('https://example.com');

      expect(result.html).toBe('<html><body><p>main</p></body></html>');
    });
  });

  describe('extractMetadata', () => {
    test('URL에서 origin과 pathname을 정확히 분리', async () => {
      const page = createMockPage({
        url: 'https://docs.example.com/ko/guide?q=1#top',
      });
      const renderer = new PageRenderer(createMockBrowserProvider(page));

      const result = await renderer.render('https://docs.example.com/ko/guide?q=1#top');

      expect(result.metadata.origin).toBe('https://docs.example.com');
      expect(result.metadata.pathname).toBe('/ko/guide');
    });

    test('title을 메타데이터에 포함', async () => {
      const page = createMockPage({ title: 'My Document' });
      const renderer = new PageRenderer(createMockBrowserProvider(page));

      const result = await renderer.render('https://example.com');

      expect(result.metadata.title).toBe('My Document');
    });
  });

  describe('extractLinks', () => {
    test('페이지에서 http 링크 목록 추출', async () => {
      const page = createMockPage({
        links: ['https://example.com/a', 'https://example.com/b'],
      });
      const renderer = new PageRenderer(createMockBrowserProvider(page));

      const result = await renderer.render('https://example.com');

      expect(result.metadata.links).toEqual(['https://example.com/a', 'https://example.com/b']);
    });

    test('hash fragment를 제거하여 중복 링크 통합', async () => {
      const page = createMockPage({
        links: [
          'https://example.com/page#section1',
          'https://example.com/page#section2',
          'https://example.com/page',
        ],
      });
      const renderer = new PageRenderer(createMockBrowserProvider(page));

      const result = await renderer.render('https://example.com');

      expect(result.metadata.links).toEqual(['https://example.com/page']);
    });

    test('무효한 URL은 무시', async () => {
      const page = createMockPage({
        links: ['https://example.com/valid', 'http://[invalid'],
      });
      const renderer = new PageRenderer(createMockBrowserProvider(page));

      const result = await renderer.render('https://example.com');

      expect(result.metadata.links).toEqual(['https://example.com/valid']);
    });
  });
});
