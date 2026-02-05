import type { Command } from 'commander';
import { wtm } from '../services/converter/wtm.ts';
import { WtmCrawler } from '../services/crawler/wtm-crawler.ts';
import { logger } from '../infrastructure/logger.ts';
import { buildWtmOptions, ENV_HELP, type CommonOptions } from './options.ts';

export function registerCrawlCommand(program: Command): void {
  program
    .command('crawl')
    .description('웹 사이트를 크롤링하여 다중 페이지를 Markdown으로 변환')
    .argument('[url]', '크롤링 시작 URL')
    .requiredOption('--output-dir <dir>', '결과 파일 저장 디렉토리')
    .option('--depth <n>', '최대 크롤링 깊이', '3')
    .option('--scope <n>', '스코프 레벨 (0: 현재 디렉토리, 1: 한 단계 위, ...)', '0')
    .option('--concurrency <n>', '동시 처리 수', '3')
    .option('--urls <file>', 'URL 목록 파일 경로 (한 줄에 하나씩)')
    .option('--debug', '파이프라인 각 스텝의 시작/종료 및 결과물 출력')
    .option('--no-llm', 'LLM 후처리 없이 기본 마크다운 변환만 수행')
    .option('--translate <lang>', '마크다운을 지정 언어로 번역 (예: ko, ja, en)')
    .showHelpAfterError()
    .addHelpText('after', ENV_HELP)
    .action(async (url: string | undefined, options: CommonOptions & {
      outputDir: string;
      depth: string;
      scope: string;
      concurrency: string;
      urls?: string;
    }) => {
      logger.init(options.debug ?? false);

      try {
        const crawler = new WtmCrawler(wtm, {
          outputDir: options.outputDir,
          wtmOptions: buildWtmOptions(options),
          maxDepth: parseInt(options.depth, 10),
          scopeLevels: parseInt(options.scope, 10),
          concurrency: parseInt(options.concurrency, 10),
        });

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
          const result = await crawler.crawlUrls(urls);
          printCrawlResult(result);
        } else if (url) {
          logger.info(`크롤링 시작: ${url}`);
          const result = await crawler.crawl(url);
          printCrawlResult(result);
        } else {
          console.error('[ERROR] URL 또는 --urls 옵션을 지정해야 합니다.');
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
