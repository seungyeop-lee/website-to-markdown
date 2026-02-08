/**
 * wtm 라이브러리 facade
 * 책임: DI 조립 → 파이프라인 실행 → 리소스 정리
 */

import { BrowserManager } from '../../infrastructure/browser-manager.ts';
import { WtmConverter } from './wtm-converter.ts';
import type { WtmOptions, WtmResult } from '../../types.ts';

/**
 * URL을 받아 Markdown으로 변환하여 반환한다.
 */
export async function wtm(url: string, options?: WtmOptions): Promise<WtmResult> {
  const browserManager = new BrowserManager();
  try {
    const converter = new WtmConverter(browserManager, options);
    return await converter.convert(url);
  } finally {
    await browserManager.close();
  }
}
