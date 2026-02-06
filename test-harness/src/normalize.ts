export function normalizeMarkdown(markdown: string): string {
  const withLf = markdown.replace(/\r\n/g, '\n');
  const withMaskedCreatedAt = withLf.replace(/^createdAt:\s.*$/m, 'createdAt: __WTM_CREATED_AT__');
  const withMaskedFixturePort = withMaskedCreatedAt.replace(
    /http:\/\/127\.0\.0\.1:\d+/g,
    'http://127.0.0.1:__WTM_PORT__',
  );
  return `${withMaskedFixturePort.trimEnd()}\n`;
}
