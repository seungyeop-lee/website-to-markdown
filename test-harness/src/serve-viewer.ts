/**
 * 책임: 하니스 결과 아티팩트와 정적 viewer 페이지를 HTTP로 제공한다.
 * 협력: `bun run ui` 명령이 이 파일을 실행해 대시보드를 띄운다.
 * 비책임: 하니스 케이스 실행/검증/리포트 생성은 담당하지 않는다.
 */

import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';

const HOST = '127.0.0.1';
const DEFAULT_PORT = 41731;
const MAX_PORT_ATTEMPTS = 30;
const VIEWER_ROOT = resolve(import.meta.dir, '..', 'viewer');
const ARTIFACTS_ROOT = resolve(import.meta.dir, '..', 'artifacts');

const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.diff': 'text/plain; charset=utf-8',
  '.log': 'text/plain; charset=utf-8',
};

function isAddressInUse(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }
  const maybeCode = (error as { code?: unknown }).code;
  return maybeCode === 'EADDRINUSE';
}

function resolvePath(root: string, pathname: string): string | null {
  const absolute = resolve(root, `.${pathname}`);
  if (!absolute.startsWith(root)) {
    return null;
  }
  return absolute;
}

async function fetchViewer(request: Request): Promise<Response> {
  const url = new URL(request.url);

  if (url.pathname.startsWith('/artifacts/')) {
    const artifactPath = url.pathname.replace('/artifacts', '');
    const absolute = resolvePath(ARTIFACTS_ROOT, artifactPath);
    if (!absolute || !existsSync(absolute)) {
      return new Response('Not Found', { status: 404 });
    }

    const ext = extname(absolute).toLowerCase();
    const contentType = CONTENT_TYPES[ext] ?? 'application/octet-stream';
    const body = await readFile(absolute);

    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'no-store',
      },
    });
  }

  const pagePath = url.pathname === '/' ? '/index.html' : url.pathname;
  const absolute = resolvePath(VIEWER_ROOT, pagePath);
  if (!absolute || !existsSync(absolute)) {
    return new Response('Not Found', { status: 404 });
  }

  const ext = extname(absolute).toLowerCase();
  const contentType = CONTENT_TYPES[ext] ?? 'application/octet-stream';
  const body = await readFile(absolute);

  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'no-store',
    },
  });
}

/** 충돌 시 포트를 증가시키며 viewer 서버를 시작한다. */
function startViewer(startPort = DEFAULT_PORT): { host: string; port: number; stop: () => void } {
  let lastError: unknown;

  for (let offset = 0; offset < MAX_PORT_ATTEMPTS; offset++) {
    const port = startPort + offset;

    try {
      const server = Bun.serve({
        hostname: HOST,
        port,
        fetch: fetchViewer,
      });

      return {
        host: HOST,
        port,
        stop: () => server.stop(true),
      };
    } catch (error) {
      if (isAddressInUse(error)) {
        lastError = error;
        continue;
      }
      throw error;
    }
  }

  throw new Error(`Failed to start viewer near port ${startPort}: ${String(lastError)}`);
}

const viewer = startViewer(41731);
console.log(`CLI Harness Viewer: http://${viewer.host}:${viewer.port}`);
console.log('Press Ctrl+C to stop.');
