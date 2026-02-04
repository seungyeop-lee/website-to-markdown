#!/usr/bin/env bun
import { Command } from 'commander';
import { wtm } from './wtm.ts';
import { logger } from './infrastructure/logger.ts';

const program = new Command()
  .name('wtm')
  .description('웹 사이트를 Markdown으로 변환')
  .argument('<url>', '변환할 웹 페이지 URL')
  .option('--debug', '파이프라인 각 스텝의 시작/종료 및 결과물 출력') // options.debug: 미지정 시 undefined, 지정 시 true
  .option('--no-llm', 'LLM 후처리 없이 기본 마크다운 변환만 수행') // options.llm: --no- prefix에 의해 미지정 시 true, 지정 시 false
  .showHelpAfterError()
  .addHelpText('after', `
Environment:
  OPENAI_API_BASE_URL  OpenAI API 베이스 URL (--no-llm 미사용 시 필수)
  OPENAI_API_KEY       OpenAI API 키 (--no-llm 미사용 시 필수)
  OPENAI_API_MODEL     OpenAI 모델명 (--no-llm 미사용 시 필수)`)
  .action(async (url: string, options: { debug?: boolean; llm: boolean }) => {
    logger.init(options.debug ?? false);
    try {
      logger.info(`변환 중: ${url}`);
      const markdown = await wtm(url, {
        llm: options.llm ? {
          enable: true,
          baseUrl: process.env.OPENAI_API_BASE_URL,
          apiKey: process.env.OPENAI_API_KEY,
          model: process.env.OPENAI_API_MODEL,
        } : undefined,
        debug: options.debug ?? false,
      });
      console.log(markdown);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[ERROR] ${message}`);
      process.exit(1);
    }
  });

program.parse();
