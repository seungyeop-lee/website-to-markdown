/**
 * 책임: HarnessCaseRegistry의 suite 필터와 케이스 구성 계약을 검증한다.
 * 협력: bun test가 리팩토링 중 케이스 정의 개수 회귀를 감지한다.
 * 비책임: 실제 CLI 실행/파일 비교 동작까지는 검증하지 않는다.
 */

import { describe, expect, it } from 'bun:test';
import { HarnessCaseRegistry } from './harness-case-registry.ts';

describe('HarnessCaseRegistry', () => {
  it('core suite에 4개 케이스를 제공한다', () => {
    const registry = new HarnessCaseRegistry();

    const coreCases = registry.getCasesBySuite('core');

    expect(coreCases).toHaveLength(4);
    expect(coreCases.map((entry) => entry.id)).toEqual([
      'core-convert-intro',
      'core-convert-spa',
      'core-crawl-docs',
      'core-invalid-url',
    ]);
  });

  it('llm suite에 1개 케이스를 제공한다', () => {
    const registry = new HarnessCaseRegistry();

    const llmCases = registry.getCasesBySuite('llm');

    expect(llmCases).toHaveLength(1);
    expect(llmCases[0]?.id).toBe('llm-translate-smoke');
  });
});
