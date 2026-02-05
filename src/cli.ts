#!/usr/bin/env bun
import { Command } from 'commander';
import { wtm } from './wtm.ts';
import { WtmCrawler } from './services/wtm-crawler.ts';
import { logger } from './infrastructure/logger.ts';
import type { WtmOptions } from './types.ts';

interface CommonOptions {
  debug?: boolean;
  llm: boolean;
  translate?: string;
}

function buildWtmOptions(options: CommonOptions): WtmOptions {
  const needsLlmConfig = options.llm || options.translate;
  return {
    llm: needsLlmConfig ? {
      enable: options.llm,
      baseUrl: process.env.OPENAI_API_BASE_URL,
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_API_MODEL,
    } : undefined,
    translate: options.translate,
    debug: options.debug ?? false,
  };
}

const ENV_HELP = `
Environment:
  OPENAI_API_BASE_URL  OpenAI API 베이스 URL (--no-llm 미사용 또는 --translate 사용 시 필수)
  OPENAI_API_KEY       OpenAI API 키 (--no-llm 미사용 또는 --translate 사용 시 필수)
  OPENAI_API_MODEL     OpenAI 모델명 (--no-llm 미사용 또는 --translate 사용 시 필수)`;

const program = new Command()
  .name('wtm')
  .description('웹 사이트를 Markdown으로 변환');

// 기본 명령: 단일 URL 변환
program
  .argument('<url>', '변환할 웹 페이지 URL')
  .option('--debug', '파이프라인 각 스텝의 시작/종료 및 결과물 출력')
  .option('--no-llm', 'LLM 후처리 없이 기본 마크다운 변환만 수행')
  .option('--translate <lang>', '마크다운을 지정 언어로 번역 (예: ko, ja, en)')
  .option('-o, --output <file>', '결과를 파일로 저장')
  .showHelpAfterError()
  .addHelpText('after', ENV_HELP)
  .action(async (url: string, options: CommonOptions & { output?: string }) => {
    logger.init(options.debug ?? false);
    try {
      logger.info(`변환 중: ${url}`);
      const result = await wtm(url, buildWtmOptions(options));

      if (options.output) {
        await Bun.write(options.output, result.markdown);
        logger.info(`저장 완료: ${options.output}`);
      } else {
        console.log(result.markdown);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[ERROR] ${message}`);
      process.exit(1);
    }
  });

// crawl 서브커맨드
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
        // URL 리스트 파일 모드
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
        // 링크 추적 크롤링 모드
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

program.parse();
