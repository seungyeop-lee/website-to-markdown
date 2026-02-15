import type { LogLevel, WtmOptions } from '../types.ts';

export interface CommonOptions {
  logLevel?: string;
  llmRefine?: boolean;
  llmTranslate?: string;
  useChrome?: string | true;
  wait?: string;
}

export function buildWtmOptions(options: CommonOptions): WtmOptions {
  const needsLlmConfig = options.llmRefine || options.llmTranslate;
  return {
    cdpUrl: buildCdpUrl(options.useChrome),
    llmConfig: needsLlmConfig ? {
      baseUrl: process.env.OPENAI_API_BASE_URL,
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_API_MODEL,
    } : undefined,
    llmRefine: options.llmRefine ?? false,
    llmTranslate: options.llmTranslate,
    hydrationWait: Math.max(0, parseInt(options.wait ?? '0', 10) || 0),
    logLevel: (options.logLevel as LogLevel) ?? 'info',
  };
}

function buildCdpUrl(useChrome?: string | true): string | undefined {
  if (!useChrome) return undefined;
  const port = useChrome === true ? '9222' : useChrome;
  return `http://127.0.0.1:${port}`;
}

export const ENV_HELP = `
Environment:
  OPENAI_API_BASE_URL  OpenAI API 베이스 URL (--llm-refine 또는 --llm-translate 사용 시 필수)
  OPENAI_API_KEY       OpenAI API 키 (--llm-refine 또는 --llm-translate 사용 시 필수)
  OPENAI_API_MODEL     OpenAI 모델명 (--llm-refine 또는 --llm-translate 사용 시 필수)`;

export function formatCdpError(error: unknown, options: CommonOptions): string {
  const message = error instanceof Error ? error.message : String(error);
  if (options.useChrome && message.includes('ECONNREFUSED')) {
    const port = options.useChrome === true ? '9222' : options.useChrome;
    return [
      message,
      '',
      `Chrome CDP 연결 실패 (포트 ${port}). Chrome을 다음과 같이 시작하세요:`,
      '',
      `  macOS:  /Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome --remote-debugging-port=${port} --user-data-dir="$HOME/chrome-debug-profile"`,
      `  Linux:  google-chrome --remote-debugging-port=${port} --user-data-dir="$HOME/chrome-debug-profile"`,
    ].join('\n');
  }
  return message;
}
