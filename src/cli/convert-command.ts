import type { Command } from 'commander';
import { wtm } from '../services/wtm/wtm.ts';
import { logger } from '../infrastructure/logger.ts';
import { buildWtmOptions, ENV_HELP, type CommonOptions } from './options.ts';

export function registerConvertCommand(program: Command): void {
  program
    .command('convert')
    .description('웹 페이지를 Markdown으로 변환')
    .argument('<url>', '[필수] 변환할 웹 페이지 URL')
    .option('--debug', '[선택] 파이프라인 각 스텝의 시작/종료 및 결과물 출력')
    .option('--no-llm', '[선택] LLM 후처리 없이 기본 마크다운 변환만 수행')
    .option('--translate <lang>', '[선택] 마크다운을 지정 언어로 번역 (예: ko, ja, en)')
    .option('-o, --output <file>', '[선택] 결과를 파일로 저장')
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
}
