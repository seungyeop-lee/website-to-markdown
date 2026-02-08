/**
 * SSE 스트림 파싱 유틸리티
 * 책임: OpenAI 호환 SSE 스트리밍 응답을 파싱하여 텍스트로 조립
 */

import { logger } from '../infrastructure/logger.ts';

export interface SSEStreamOptions {
  label: string;
  startTime: number;
}

export async function collectSSEStream(
  response: Response,
  options: SSEStreamOptions,
): Promise<string> {
  const { label, startTime } = options;
  let firstChunk = true;
  let content = '';

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6).trim();
      if (data === '[DONE]') continue;

      try {
        const parsed = JSON.parse(data);
        const delta = parsed.choices?.[0]?.delta?.content;
        if (delta) {
          if (firstChunk) {
            logger.info(`LLM ${label} 응답 수신 시작`);
            firstChunk = false;
          }
          content += delta;
        }
      } catch {
        // malformed JSON line, skip
      }
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  logger.info(`LLM ${label} 완료 (출력 ${content.length}자, ${elapsed}s 소요)`);

  return content;
}
