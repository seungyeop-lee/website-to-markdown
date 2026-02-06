/**
 * 책임: expected/actual 비교 전에 비결정적 값을 마스킹한다.
 * 협력: markdown-comparison-service가 정규화 함수를 호출해 결정적 비교를 보장한다.
 * 비책임: diff 생성이나 파일 입출력은 담당하지 않는다.
 */

/** createdAt/포트 등 실행 환경 의존 값을 제거해 비교 가능 문자열로 만든다. */
export function normalizeMarkdown(markdown: string): string {
  const withLf = markdown.replace(/\r\n/g, '\n');
  const withMaskedCreatedAt = withLf.replace(/^createdAt:\s.*$/m, 'createdAt: __WTM_CREATED_AT__');
  const withMaskedFixturePort = withMaskedCreatedAt.replace(
    /http:\/\/127\.0\.0\.1:\d+/g,
    'http://127.0.0.1:__WTM_PORT__',
  );
  return `${withMaskedFixturePort.trimEnd()}\n`;
}
