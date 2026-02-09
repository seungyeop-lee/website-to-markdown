#!/usr/bin/env bun
import { Command } from 'commander';
import { registerConvertCommand } from './convert-command.ts';
import { registerCrawlCommand } from './crawl-command.ts';
import { registerBatchCommand } from './batch-command.ts';
import packageJson from '../../package.json';

const program = new Command()
  .name('wtm')
  .version(packageJson.version, '-v, --version')
  .description('웹 사이트를 Markdown으로 변환')
  .showHelpAfterError()
  .enablePositionalOptions();

registerConvertCommand(program);
registerCrawlCommand(program);
registerBatchCommand(program);

if (process.argv.length <= 2) {
  program.help();
}

program.parse();
