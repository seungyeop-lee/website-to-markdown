/**
 * 콘텐츠 추출
 * 책임: HTML→Markdown 변환 흐름 조율 (mdream 변환, LLM 정제)
 * 협력자: MarkdownRefiner
 */

import {htmlToMarkdown, TagIdMap} from 'mdream';
import type {MarkdownRefiner} from '../../infrastructure/llm-refiner.ts';
import {logger} from '../../infrastructure/logger.ts';
import type {PageMetadata} from '../../types.ts';
import {filterPlugin, frontmatterPlugin, isolateMainPlugin, tailwindPlugin} from "mdream/plugins";

export class ContentExtractor {
  constructor(private refiner: MarkdownRefiner) {}

  async extract(html: string, metadata: PageMetadata): Promise<string> {
    logger.debug('mdream 변환 시작');
    const sanitizedHtml = this.stripScriptTags(html);
    const rawMarkdown = htmlToMarkdown(sanitizedHtml, {
      origin: metadata.origin,
      plugins: [
        frontmatterPlugin({
          additionalFields: {
            url: metadata.url,
            createdAt: new Date().toISOString(),
          }
        }),
        isolateMainPlugin(),
        tailwindPlugin(),
        filterPlugin({
          exclude: [
            TagIdMap.form,
            TagIdMap.fieldset,
            TagIdMap.object,
            TagIdMap.embed,
            TagIdMap.figure,
            TagIdMap.footer,
            TagIdMap.aside,
            TagIdMap.input,
            TagIdMap.textarea,
            TagIdMap.select,
            TagIdMap.button,
            TagIdMap.nav,
          ],
        })
      ]
    });
    logger.debug(`mdream 변환 완료 (markdown: ${rawMarkdown.length}자)\n--- mdream 결과 ---\n${rawMarkdown}\n---`);

    logger.debug('정제 시작');
    const cleanedMarkdown = await this.refiner.call(rawMarkdown);
    logger.debug(`정제 완료 (markdown: ${cleanedMarkdown.length}자)\n--- 정제 결과 ---\n${cleanedMarkdown}\n---`);

    return cleanedMarkdown;
  }

  private stripScriptTags(html: string): string {
    // mdream 파싱 과정에서 inline script 문자열(예: "<option>...</option>")이
    // 본문 변환을 조기 종료시키는 케이스를 방지한다.
    return html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
  }
}
