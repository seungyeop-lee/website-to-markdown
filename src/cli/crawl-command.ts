import type { Command } from 'commander';
import { wtmCrawl } from '../services/crawler/wtm-crawl.ts';
import { logger } from '../infrastructure/logger.ts';
import { ENV_HELP, formatCdpError } from './shared-options.ts';
import { buildCrawlOptions } from './crawl-options.ts';
import type { CrawlCliOptions } from './crawl-options.ts';
import type { LogLevel } from '../types.ts';

export function registerCrawlCommand(program: Command): void {
  program
    .command('crawl')
    .description('시작 URL에서 링크를 따라가며 다중 페이지를 Markdown으로 변환')
    .requiredOption('-D, --output-dir <dir>', '[필수] 결과 파일 저장 디렉토리')
    .requiredOption('-u, --url <url>', '[필수] 크롤링 시작 URL')
    .option('-l, --link-depth <n>', '[선택] 최대 링크 홉 깊이', '3')
    .option('-p, --path-depth <n>', '[선택] scope 기준 하위 경로 최대 깊이', '1')
    .option('-s, --scope <n>', '[선택] 스코프 레벨 (0: 현재 디렉토리, 1: 한 단계 위, ...)', '0')
    .option('-c, --concurrency <n>', '[선택] 동시 처리 수', '3')
    .option('-L, --log-level <level>', '[선택] 로그 레벨 (debug, info, error)', 'info')
    .option('-r, --llm-refine', '[선택] LLM 후처리로 마크다운 정제')
    .option('-t, --llm-translate <lang>', '[선택] 마크다운을 지정 언어로 번역 (예: ko, ja, en)')
    .option('-C, --use-chrome [port]', '[선택] 실행 중인 Chrome에 CDP 연결 (기본 포트: 9222)')
    .showHelpAfterError()
    .addHelpText('after', ENV_HELP)
    .action(async (options: CrawlCliOptions) => {
      logger.init((options.logLevel as LogLevel) ?? 'info');

      const crawlOptions = buildCrawlOptions(options);

      try {
        logger.info(`크롤링 시작: ${options.url}`);
        const result = await wtmCrawl(options.url, crawlOptions);
        printCrawlResult(result);
      } catch (error) {
        logger.error(formatCdpError(error, options));
        process.exit(1);
      }
    });
}

function printCrawlResult(result: { succeeded: string[]; failed: { url: string; error: string }[]; skipped: string[] }): void {
  console.error(`\n성공: ${result.succeeded.length}개`);
  if (result.failed.length > 0) {
    console.error(`실패: ${result.failed.length}개`);
    for (const { url, error } of result.failed) {
      console.error(`  - ${url}: ${error}`);
    }
  }
  if (result.skipped.length > 0) {
    console.error(`스킵: ${result.skipped.length}개`);
  }
}
