/**
 * 싱글톤 Logger
 * 책임: LogLevel에 따라 로그 출력 여부 결정
 */

import type { LogLevel } from '../types.ts';

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  error: 2,
};

class Logger {
  private level: LogLevel = 'info';

  init(level: LogLevel): void {
    this.level = level;
  }

  debug(message: string): void {
    if (LEVEL_PRIORITY[this.level] > LEVEL_PRIORITY.debug) return;
    console.error(`[DEBUG] ${message}`);
  }

  info(message: string): void {
    if (LEVEL_PRIORITY[this.level] > LEVEL_PRIORITY.info) return;
    console.error(`[INFO] ${message}`);
  }

  error(message: string): void {
    console.error(`[ERROR] ${message}`);
  }
}

export const logger = new Logger();
