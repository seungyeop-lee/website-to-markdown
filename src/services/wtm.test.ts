import { test, expect } from 'bun:test';
import { wtm } from './wtm.ts';

test('유효하지 않은 URL이면 에러를 throw한다', async () => {
  expect(wtm('not-a-url')).rejects.toThrow('유효하지 않은 URL입니다: not-a-url');
});

test('빈 문자열이면 에러를 throw한다', async () => {
  expect(wtm('')).rejects.toThrow('유효하지 않은 URL입니다: ');
});
