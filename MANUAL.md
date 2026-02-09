# wtm 사용 매뉴얼

## CLI 상세 옵션

### convert — 단일 페이지 변환

```bash
wtm convert [options] <url>
```

| 옵션 | 단축 | 설명 | 기본값 |
|------|------|------|:----:|
| `--llm-refine` | `-r` | LLM 후처리로 마크다운 정제 | false |
| `--llm-translate <lang>` | `-t` | LLM 기반 번역 대상 언어 | — |
| `--output <file>` | `-o` | 결과를 파일로 저장 | stdout |
| `--use-chrome [port]` | `-C` | Chrome CDP 연결 (기본 포트 9222) | — |
| `--log-level <level>` | `-L` | 로그 레벨 (`debug`, `info`, `error`) | info |

```bash
wtm convert https://example.com/article
wtm convert --llm-refine https://example.com/article
wtm convert --llm-translate ko https://example.com/article
wtm convert --llm-refine --llm-translate ko https://example.com/article
wtm convert --log-level debug https://example.com/article
wtm convert -o output.md https://example.com/article
wtm convert https://example.com/article > output.md
```

### crawl — 링크 추적 크롤링

시작 URL에서 링크를 따라가며 여러 페이지를 Markdown으로 변환합니다.

```bash
wtm crawl [options]
```

| 옵션 | 단축 | 설명 | 기본값 |
|------|------|------|:----:|
| `--url <url>` | `-u` | 크롤링 시작 URL | (필수) |
| `--output-dir <dir>` | `-D` | 결과 파일 저장 디렉토리 | (필수) |
| `--link-depth <n>` | `-l` | 최대 링크 홉 깊이 | 3 |
| `--path-depth <n>` | `-p` | scope 기준 하위 경로 최대 깊이 | 1 |
| `--scope <n>` | `-s` | 스코프 레벨 (0: 현재 디렉토리, 1: 한 단계 위, ...) | 0 |
| `--concurrency <n>` | `-c` | 동시 처리 수 | 3 |
| `--llm-refine` | `-r` | LLM 후처리로 마크다운 정제 | false |
| `--llm-translate <lang>` | `-t` | LLM 기반 번역 대상 언어 | — |
| `--use-chrome [port]` | `-C` | Chrome CDP 연결 (기본 포트 9222) | — |
| `--log-level <level>` | `-L` | 로그 레벨 (`debug`, `info`, `error`) | info |

```bash
wtm crawl --url https://example.com/docs/intro --output-dir ./docs
wtm crawl --url https://example.com/docs/api/auth --output-dir ./docs --link-depth 2 --scope 1
wtm crawl --url https://example.com/docs/intro --output-dir ./docs --path-depth 1
wtm crawl --url https://example.com/docs/intro --output-dir ./docs --concurrency 5
wtm crawl --url https://example.com/docs/intro --output-dir ./docs --llm-refine
```

#### 스코프 레벨

시작 URL이 `example.com/a/b/c/page`일 때:

- `--scope 0` → `/a/b/c/*` 범위 (기본값)
- `--scope 1` → `/a/b/*` 범위
- `--scope 2` → `/a/*` 범위

#### 링크 깊이

시작 URL로부터 링크를 몇 홉까지 따라갈지 제한합니다.

```
depth 0: 시작 URL (https://example.com/docs/intro)
depth 1: 시작 페이지에서 발견된 링크들
depth 2: depth 1 페이지들에서 발견된 링크들
depth 3: depth 2 페이지들에서 발견된 링크들 (기본 최대)
```

#### 경로 깊이

스코프 루트 기준으로 하위 경로 세그먼트 수를 제한합니다.

시작 URL이 `example.com/docs/intro`이고 스코프 루트가 `/docs/`일 때:

- `--path-depth 1` → `/docs/page` ✅, `/docs/tutorial/page` ❌
- `--path-depth 2` → `/docs/tutorial/page` ✅, `/docs/a/b/page` ❌

### batch — URL 목록 배치 변환

URL 목록 파일을 읽어 링크 추적 없이 지정된 URL만 일괄 변환합니다.

```bash
wtm batch [options]
```

| 옵션 | 단축 | 설명 | 기본값 |
|------|------|------|:----:|
| `--urls <file>` | `-f` | URL 목록 파일 경로 (한 줄에 하나씩) | (필수) |
| `--output-dir <dir>` | `-D` | 결과 파일 저장 디렉토리 | (필수) |
| `--concurrency <n>` | `-c` | 동시 처리 수 | 3 |
| `--llm-refine` | `-r` | LLM 후처리로 마크다운 정제 | false |
| `--llm-translate <lang>` | `-t` | LLM 기반 번역 대상 언어 | — |
| `--use-chrome [port]` | `-C` | Chrome CDP 연결 (기본 포트 9222) | — |
| `--log-level <level>` | `-L` | 로그 레벨 (`debug`, `info`, `error`) | info |

```bash
wtm batch --urls urls.txt --output-dir ./docs
wtm batch --urls urls.txt --output-dir ./docs --llm-refine
wtm batch --urls urls.txt --output-dir ./docs --concurrency 5
```

### 파일명 규칙 (crawl / batch 공통)

- 기본: `/docs/api` → `docs/api.md`
- 쿼리 포함: `/docs/api?lang=ko&page=2` → `docs/api__lang-ko_page-2__hxxxxxxxx.md`
- 쿼리 키 순서는 자동 정렬되어 동일 쿼리는 같은 파일명으로 저장됩니다.

---

## Chrome CDP 연결 (인증 필요 사이트)

로그인이 필요한 사이트를 변환할 때, 실행 중인 Chrome 브라우저에 CDP(Chrome DevTools Protocol)로 연결하여 기존 세션(쿠키/인증)을 활용할 수 있습니다.

```bash
# 1. Chrome을 디버깅 포트와 함께 시작
#   macOS:
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222 --user-data-dir="$HOME/chrome-debug-profile"

#   Linux:
google-chrome --remote-debugging-port=9222 --user-data-dir="$HOME/chrome-debug-profile"

# 2. Chrome에서 대상 사이트에 로그인한 후 변환 실행
wtm convert --use-chrome https://example.com/protected-page

# 커스텀 포트 사용
wtm convert --use-chrome 9333 https://example.com/protected-page
```

`--use-chrome`은 `convert`, `crawl`, `batch` 모든 서브커맨드에서 사용 가능합니다.

---

## 라이브러리 API 상세

### wtm(url, options?)

`WtmResult` 객체를 반환합니다: `{ markdown, metadata }`.

```ts
import { wtm } from '@seungyeop-lee/website-to-markdown';

// 기본 변환 (LLM 불필요)
const result = await wtm('https://example.com/article');
console.log(result.markdown);    // Markdown 문자열
console.log(result.metadata);    // { url, origin, pathname, title, links }

// LLM 후처리
const result = await wtm('https://example.com/article', {
  llmRefine: true,
  llmConfig: {
    baseUrl: 'https://api.openai.com/v1',
    apiKey: 'your-api-key',
    model: 'gpt-4o-mini',
  },
});

// 번역
const result = await wtm('https://example.com/article', {
  llmTranslate: 'ko',
  llmConfig: {
    baseUrl: 'https://api.openai.com/v1',
    apiKey: 'your-api-key',
    model: 'gpt-4o-mini',
  },
});

// LLM 정제 + 번역
const result = await wtm('https://example.com/article', {
  llmRefine: true,
  llmTranslate: 'ko',
  llmConfig: {
    baseUrl: 'https://api.openai.com/v1',
    apiKey: 'your-api-key',
    model: 'gpt-4o-mini',
  },
});

// 디버그 모드
const result = await wtm('https://example.com/article', {
  logLevel: 'debug',
});

// Chrome CDP 연결
const result = await wtm('https://example.com/protected-page', {
  cdpUrl: 'http://127.0.0.1:9222',
});
```

### wtmCrawl(url, options)

시작 URL에서 링크를 따라가며 크롤링하여 Markdown 파일로 저장합니다.

```ts
import { wtmCrawl } from '@seungyeop-lee/website-to-markdown';

const result = await wtmCrawl('https://example.com/docs/intro', {
  outputDir: './docs',
  maxLinkDepth: 3,
  maxPathDepth: 1,
  scopeLevels: 0,
  concurrency: 3,
});
```

### wtmUrls(urls, options)

URL 목록을 받아 링크 추적 없이 일괄 변환합니다.

```ts
import { wtmUrls } from '@seungyeop-lee/website-to-markdown';

const result = await wtmUrls(
  ['https://example.com/page1', 'https://example.com/page2'],
  { outputDir: './docs', concurrency: 3 },
);
```

---

## 개발

```bash
bun install          # 의존성 설치
bun test             # 테스트 실행
bun run build        # JS 번들 생성
bun run build:types  # .d.ts 타입 선언 생성
```
