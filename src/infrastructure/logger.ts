/**
 * 싱글톤 Logger
 * 책임: debug 플래그에 따라 로그 출력 여부 결정
 */

class Logger {
  private debugMode = false;

  init(debug: boolean): void {
    this.debugMode = debug;
  }

  info(message: string): void {
    console.error(`[INFO] ${message}`);
  }

  debug(message: string): void {
    if (!this.debugMode) return;
    console.error(`[DEBUG] ${message}`);
  }
}

export const logger = new Logger();
