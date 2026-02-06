import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';

const HOST = '127.0.0.1';
const DEFAULT_PORT = 41730;
const MAX_PORT_ATTEMPTS = 30;
const SITE_ROOT = resolve(import.meta.dir, '..', 'fixtures', 'site');

export interface StartedFixtureServer {
  host: string;
  port: number;
  origin: string;
  stop: () => void;
}

function isAddressInUse(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }
  const maybeCode = (error as { code?: unknown }).code;
  return maybeCode === 'EADDRINUSE';
}

const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
};

function resolveFixtureFile(pathname: string): string | null {
  const decoded = decodeURIComponent(pathname);
  const requestedPath = decoded === '/' ? '/index.html' : decoded;
  const absolute = resolve(SITE_ROOT, `.${requestedPath}`);

  if (!absolute.startsWith(SITE_ROOT)) {
    return null;
  }

  if (existsSync(absolute)) {
    return absolute;
  }

  if (!extname(absolute)) {
    const htmlPath = `${absolute}.html`;
    if (existsSync(htmlPath)) {
      return htmlPath;
    }
  }

  return null;
}

async function serveFixture(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const filePath = resolveFixtureFile(url.pathname);
  if (!filePath) {
    return new Response('Not Found', { status: 404 });
  }

  const ext = extname(filePath).toLowerCase();
  const contentType = CONTENT_TYPES[ext] ?? 'application/octet-stream';
  const body = await readFile(filePath);

  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'no-store',
    },
  });
}

export function startFixtureServer(startPort = DEFAULT_PORT): StartedFixtureServer {
  let lastError: unknown;

  for (let offset = 0; offset < MAX_PORT_ATTEMPTS; offset++) {
    const port = startPort + offset;

    try {
      const server = Bun.serve({
        hostname: HOST,
        port,
        fetch: serveFixture,
      });

      return {
        host: HOST,
        port,
        origin: `http://${HOST}:${port}`,
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

  throw new Error(`Failed to start fixture server near port ${startPort}: ${String(lastError)}`);
}
