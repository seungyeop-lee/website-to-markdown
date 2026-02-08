import type { Command } from 'commander';
import { wtm } from '../services/wtm/wtm.ts';
import { logger } from '../infrastructure/logger.ts';
import { buildWtmOptions, ENV_HELP } from './shared-options.ts';
import type { ConvertCliOptions } from './convert-options.ts';
import type { LogLevel } from '../types.ts';

export function registerConvertCommand(program: Command): void {
  program
    .command('convert')
    .description('웹 페이지를 Markdown으로 변환')
    .argument('<url>', '[필수] 변환할 웹 페이지 URL')
    .option('-L, --log-level <level>', '[선택] 로그 레벨 (debug, info, error)', 'info')
    .option('-r, --llm-refine', '[선택] LLM 후처리로 마크다운 정제')
    .option('-t, --llm-translate <lang>', '[선택] 마크다운을 지정 언어로 번역 (예: ko, ja, en)')
    .option('-o, --output <file>', '[선택] 결과를 파일로 저장')
    .showHelpAfterError()
    .addHelpText('after', ENV_HELP)
    .action(async (url: string, options: ConvertCliOptions) => {
      logger.init((options.logLevel as LogLevel) ?? 'info');
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
        logger.error(message);
        process.exit(1);
      }
    });
}
