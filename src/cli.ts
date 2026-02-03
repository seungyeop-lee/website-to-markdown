#!/usr/bin/env bun
/**
 * wtm CLI - 웹 사이트를 Markdown으로 변환
 * Usage: wtm <URL>
 */

import { wtm } from './wtm.ts';

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(`
wtm - 웹 사이트를 Markdown으로 변환

Usage:
  bun src/cli.ts <URL>

Example:
  bun src/cli.ts https://example.com/article

Environment:
  OPENAI_API_BASE_URL  OpenAI API 베이스 URL (필수)
  OPENAI_API_KEY       OpenAI API 키 (필수)
  OPENAI_API_MODEL     OpenAI 모델명 (필수)
`);
    process.exit(args.length === 0 ? 1 : 0);
  }

  const url = args[0]!;

  try {
    console.error(`[INFO] 변환 중: ${url}`);
    const markdown = await wtm(url, {
      llm: {
        baseUrl: process.env.OPENAI_API_BASE_URL || '',
        apiKey: process.env.OPENAI_API_KEY || '',
        model: process.env.OPENAI_API_MODEL || '',
      },
    });
    console.log(markdown);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[ERROR] ${message}`);
    process.exit(1);
  }
}

main();
