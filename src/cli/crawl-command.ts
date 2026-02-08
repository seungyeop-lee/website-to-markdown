import type { Command } from 'commander';
import { wtmCrawl } from '../services/crawler/wtm-crawl.ts';
import { logger } from '../infrastructure/logger.ts';
import { ENV_HELP } from './shared-options.ts';
import { buildCrawlOptions } from './crawl-options.ts';
import type { CrawlCliOptions } from './crawl-options.ts';

export function registerCrawlCommand(program: Command): void {
  program
    .command('crawl')
    .description('시작 URL에서 링크를 따라가며 다중 페이지를 Markdown으로 변환')
    .requiredOption('--output-dir <dir>', '[필수] 결과 파일 저장 디렉토리')
    .requiredOption('--url <url>', '[필수] 크롤링 시작 URL')
    .option('--link-depth <n>', '[선택] 최대 링크 홉 깊이', '3')
    .option('--path-depth <n>', '[선택] scope 기준 하위 경로 최대 깊이', '1')
    .option('--scope <n>', '[선택] 스코프 레벨 (0: 현재 디렉토리, 1: 한 단계 위, ...)', '0')
    .option('--concurrency <n>', '[선택] 동시 처리 수', '3')
    .option('--debug', '[선택] 파이프라인 각 스텝의 시작/종료 및 결과물 출력')
    .option('--llm-refine', '[선택] LLM 후처리로 마크다운 정제')
    .option('--llm-translate <lang>', '[선택] 마크다운을 지정 언어로 번역 (예: ko, ja, en)')
    .showHelpAfterError()
    .addHelpText('after', ENV_HELP)
    .action(async (options: CrawlCliOptions) => {
      logger.init(options.debug ?? false);

      const crawlOptions = buildCrawlOptions(options);

      try {
        logger.info(`크롤링 시작: ${options.url}`);
        const result = await wtmCrawl(options.url, crawlOptions);
        printCrawlResult(result);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`[ERROR] ${message}`);
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
