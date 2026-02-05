#!/usr/bin/env bun
import { Command } from 'commander';
import { registerConvertCommand } from './convert-command.ts';
import { registerCrawlCommand } from './crawl-command.ts';

const program = new Command()
  .name('wtm')
  .description('웹 사이트를 Markdown으로 변환')
  .showHelpAfterError()
  .enablePositionalOptions();

registerConvertCommand(program);
registerCrawlCommand(program);

if (process.argv.length <= 2) {
  program.help();
}

program.parse();
