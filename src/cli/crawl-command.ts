import type { Command } from 'commander';
import { wtmCrawl, wtmCrawlUrls } from '../services/crawler/wtm-crawl.ts';
import { logger } from '../infrastructure/logger.ts';
import { ENV_HELP } from './shared-options.ts';
import { buildCrawlOptions } from './crawl-options.ts';
import type { CrawlCliOptions } from './crawl-options.ts';

export function registerCrawlCommand(program: Command): void {
  program
    .command('crawl')
    .description('웹 사이트를 크롤링하여 다중 페이지를 Markdown으로 변환')
    .requiredOption('--output-dir <dir>', '[필수] 결과 파일 저장 디렉토리')
    .option('--url <url>', '[선택] 크롤링 시작 URL (--urls 미사용 시 필요)')
    .option('--link-depth <n>', '[선택] 최대 링크 홉 깊이', '3')
    .option('--path-depth <n>', '[선택] scope 기준 하위 경로 최대 깊이', '1')
    .option('--scope <n>', '[선택] 스코프 레벨 (0: 현재 디렉토리, 1: 한 단계 위, ...)', '0')
    .option('--concurrency <n>', '[선택] 동시 처리 수', '3')
    .option('--urls <file>', '[선택] URL 목록 파일 경로 (한 줄에 하나씩)')
    .option('--debug', '[선택] 파이프라인 각 스텝의 시작/종료 및 결과물 출력')
    .option('--no-llm', '[선택] LLM 후처리 없이 기본 마크다운 변환만 수행')
    .option('--translate <lang>', '[선택] 마크다운을 지정 언어로 번역 (예: ko, ja, en)')
    .showHelpAfterError()
    .addHelpText('after', ENV_HELP)
    .action(async (options: CrawlCliOptions) => {
      logger.init(options.debug ?? false);

      const crawlOptions = buildCrawlOptions(options);

      try {
        if (options.urls) {
          const fileContent = await Bun.file(options.urls).text();
          const urls = fileContent
            .split('\n')
            .map(line => line.trim())
            .filter(line => line && !line.startsWith('#'));

          if (urls.length === 0) {
            console.error('[ERROR] URL 파일이 비어있습니다.');
            process.exit(1);
          }

          logger.info(`URL 리스트 모드: ${urls.length}개 URL`);
          const result = await wtmCrawlUrls(urls, crawlOptions);
          printCrawlResult(result);
        } else if (options.url) {
          logger.info(`크롤링 시작: ${options.url}`);
          const result = await wtmCrawl(options.url, crawlOptions);
          printCrawlResult(result);
        } else {
          console.error('[ERROR] --url 또는 --urls 옵션을 지정해야 합니다.');
          process.exit(1);
        }
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
