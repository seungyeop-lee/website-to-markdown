#!/usr/bin/env bun
/**
 * wtm CLI - 웹 사이트를 Markdown으로 변환
 * Usage: wtm <URL>
 */

import { wtm } from './wtm.ts';
import { logger } from './infrastructure/logger.ts';

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(`
wtm - 웹 사이트를 Markdown으로 변환

Usage:
  bun src/cli.ts [options] <URL>

Options:
  --debug    파이프라인 각 스텝의 시작/종료 및 결과물 출력
  --no-llm   LLM 후처리 없이 기본 마크다운 변환만 수행
  --help, -h 도움말 표시

Example:
  bun src/cli.ts https://example.com/article
  bun src/cli.ts --debug https://example.com/article
  bun src/cli.ts --no-llm https://example.com/article

Environment:
  OPENAI_API_BASE_URL  OpenAI API 베이스 URL (--no-llm 미사용 시 필수)
  OPENAI_API_KEY       OpenAI API 키 (--no-llm 미사용 시 필수)
  OPENAI_API_MODEL     OpenAI 모델명 (--no-llm 미사용 시 필수)
`);
    process.exit(args.length === 0 ? 1 : 0);
  }

  const debug = args.includes('--debug');
  const noLlm = args.includes('--no-llm');
  const url = args.find((arg) => !arg.startsWith('--'))!;

  if (!url) {
    console.error('[ERROR] URL을 지정해 주세요.');
    process.exit(1);
  }

  logger.init(debug);

  try {
    logger.info(`변환 중: ${url}`);
    const markdown = await wtm(url, {
      llm: noLlm ? undefined : {
        enable: true,
        baseUrl: process.env.OPENAI_API_BASE_URL,
        apiKey: process.env.OPENAI_API_KEY,
        model: process.env.OPENAI_API_MODEL,
      },
      debug,
    });
    console.log(markdown);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[ERROR] ${message}`);
    process.exit(1);
  }
}

main();
