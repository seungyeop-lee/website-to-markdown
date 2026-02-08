import { test, expect, describe, beforeEach, afterEach, spyOn } from 'bun:test';
import { logger } from './logger.ts';
import type { LogLevel } from '../types.ts';

describe('Logger', () => {
  let errorSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    errorSpy = spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
    logger.init('info');
  });

  describe('level=debug', () => {
    beforeEach(() => logger.init('debug'));

    test('debug 메시지 출력', () => {
      logger.debug('test');
      expect(errorSpy).toHaveBeenCalledWith('[DEBUG] test');
    });

    test('info 메시지 출력', () => {
      logger.info('test');
      expect(errorSpy).toHaveBeenCalledWith('[INFO] test');
    });

    test('error 메시지 출력', () => {
      logger.error('test');
      expect(errorSpy).toHaveBeenCalledWith('[ERROR] test');
    });
  });

  describe('level=info', () => {
    beforeEach(() => logger.init('info'));

    test('debug 메시지 억제', () => {
      logger.debug('test');
      expect(errorSpy).not.toHaveBeenCalled();
    });

    test('info 메시지 출력', () => {
      logger.info('test');
      expect(errorSpy).toHaveBeenCalledWith('[INFO] test');
    });

    test('error 메시지 출력', () => {
      logger.error('test');
      expect(errorSpy).toHaveBeenCalledWith('[ERROR] test');
    });
  });

  describe('level=error', () => {
    beforeEach(() => logger.init('error'));

    test('debug 메시지 억제', () => {
      logger.debug('test');
      expect(errorSpy).not.toHaveBeenCalled();
    });

    test('info 메시지 억제', () => {
      logger.info('test');
      expect(errorSpy).not.toHaveBeenCalled();
    });

    test('error 메시지 출력', () => {
      logger.error('test');
      expect(errorSpy).toHaveBeenCalledWith('[ERROR] test');
    });
  });

  test('init 미호출 시 기본 레벨은 info', () => {
    logger.debug('test');
    expect(errorSpy).not.toHaveBeenCalled();

    logger.info('test');
    expect(errorSpy).toHaveBeenCalledWith('[INFO] test');
  });
});
