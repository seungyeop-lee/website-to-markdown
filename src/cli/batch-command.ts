import type { Command } from 'commander';
import { wtmUrls } from '../services/batch/wtm-batch.ts';
import { logger } from '../infrastructure/logger.ts';
import { ENV_HELP } from './shared-options.ts';
import { buildBatchOptions } from './batch-options.ts';
import type { BatchCliOptions } from './batch-options.ts';

export function registerBatchCommand(program: Command): void {
  program
    .command('batch')
    .description('URL 목록 파일을 읽어 일괄 Markdown 변환 (링크 추적 없음)')
    .requiredOption('--output-dir <dir>', '[필수] 결과 파일 저장 디렉토리')
    .requiredOption('--urls <file>', '[필수] URL 목록 파일 경로 (한 줄에 하나씩)')
    .option('--concurrency <n>', '[선택] 동시 처리 수', '3')
    .option('--debug', '[선택] 파이프라인 각 스텝의 시작/종료 및 결과물 출력')
    .option('--no-llm', '[선택] LLM 후처리 없이 기본 마크다운 변환만 수행')
    .option('--translate <lang>', '[선택] 마크다운을 지정 언어로 번역 (예: ko, ja, en)')
    .showHelpAfterError()
    .addHelpText('after', ENV_HELP)
    .action(async (options: BatchCliOptions) => {
      logger.init(options.debug ?? false);

      const batchOptions = buildBatchOptions(options);

      try {
        const fileContent = await Bun.file(options.urls).text();
        const urls = fileContent
          .split('\n')
          .map(line => line.trim())
          .filter(line => line && !line.startsWith('#'));

        if (urls.length === 0) {
          console.error('[ERROR] URL 파일이 비어있습니다.');
          process.exit(1);
        }

        logger.info(`배치 변환 시작: ${urls.length}개 URL`);
        const result = await wtmUrls(urls, batchOptions);
        printBatchResult(result);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`[ERROR] ${message}`);
        process.exit(1);
      }
    });
}

function printBatchResult(result: { succeeded: string[]; failed: { url: string; error: string }[] }): void {
  console.error(`\n성공: ${result.succeeded.length}개`);
  if (result.failed.length > 0) {
    console.error(`실패: ${result.failed.length}개`);
    for (const { url, error } of result.failed) {
      console.error(`  - ${url}: ${error}`);
    }
  }
}
