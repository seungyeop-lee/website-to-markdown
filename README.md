# wtm - Website to Markdown

웹 사이트 URL을 입력받아 핵심 본문을 추출하고 Markdown으로 변환하는 CLI 도구 및 라이브러리.

> **요구사항:** [Bun](https://bun.sh) 런타임 필수

### 주요 기능

- SPA/JavaScript 렌더링 사이트 지원 (Playwright + Stealth 플러그인)
- [mdream](https://github.com/nichochar/mdream) 기반 HTML → Markdown 변환 (본문 추출, 노이즈 필터링, Tailwind 처리)
- LLM 후처리를 통한 마크다운 정제 (`--llm-refine`, 선택 사항)
- LLM 기반 다국어 번역 (`--llm-translate <lang>`, 선택 사항)
- YAML frontmatter 자동 생성 (url, createdAt)
- `--debug` 모드로 파이프라인 각 스텝 로깅
- 다중 페이지 크롤링 (`wtm crawl`) — 링크 추적, 스코프 필터링, 병렬 처리
- URL 목록 배치 변환 (`wtm batch`) — 지정된 URL만 일괄 변환

---

## Quick Start

```bash
# 기본 변환 (LLM 불필요, 환경변수 없이 바로 사용 가능)
bunx @seungyeop-lee/website-to-markdown convert https://example.com/article

# LLM 정제를 함께 사용하려면 환경변수 설정 후 --llm-refine 추가
OPENAI_API_BASE_URL=https://api.openai.com/v1 \
OPENAI_API_KEY=your-api-key \
OPENAI_API_MODEL=gpt-4o-mini \
bunx @seungyeop-lee/website-to-markdown convert --llm-refine https://example.com/article
```

## 설치

```bash
bun add @seungyeop-lee/website-to-markdown
```

## CLI 사용법

LLM 기능(`--llm-refine`, `--llm-translate`)을 사용할 경우 환경변수 설정이 필요합니다.
실행 디렉토리에 `.env` 파일을 생성하면 Bun이 자동으로 로드합니다.

```sh
OPENAI_API_BASE_URL=https://api.openai.com/v1
OPENAI_API_KEY=your-api-key
OPENAI_API_MODEL=gpt-4o-mini
```

```bash
# 기본 변환 (LLM 없이)
bunx @seungyeop-lee/website-to-markdown convert https://example.com/article

# LLM 후처리로 마크다운 정제
bunx @seungyeop-lee/website-to-markdown convert --llm-refine https://example.com/article

# 마크다운을 한국어로 번역
bunx @seungyeop-lee/website-to-markdown convert --llm-translate ko https://example.com/article

# LLM 정제 + 번역
bunx @seungyeop-lee/website-to-markdown convert --llm-refine --llm-translate ko https://example.com/article

# 디버그 모드 (파이프라인 각 스텝 로깅)
bunx @seungyeop-lee/website-to-markdown convert --debug https://example.com/article

# 파일로 저장 (stdout 리다이렉션)
bunx @seungyeop-lee/website-to-markdown convert https://example.com/article > output.md

# 파일로 저장 (-o 옵션)
bunx @seungyeop-lee/website-to-markdown convert -o output.md https://example.com/article
```

### 글로벌 설치

```bash
bun install -g @seungyeop-lee/website-to-markdown
```

```bash
wtm convert https://example.com/article
wtm convert --llm-refine https://example.com/article
wtm convert --llm-translate ko https://example.com/article
wtm convert --llm-refine --llm-translate ko https://example.com/article
wtm convert --debug https://example.com/article
wtm convert https://example.com/article > output.md
wtm convert -o output.md https://example.com/article
```

### 크롤링

시작 URL에서 링크를 따라가며 여러 페이지를 Markdown으로 변환합니다.

```bash
# 기본 크롤링 (시작 URL의 같은 디렉토리 범위, 링크 3홉)
wtm crawl --url https://example.com/docs/intro --output-dir ./docs

# 링크 깊이 제한 및 스코프 확장
wtm crawl --url https://example.com/docs/api/auth --output-dir ./docs --link-depth 2 --scope 1

# 경로 깊이 제한 (scope root 아래 1 segment까지만 허용)
wtm crawl --url https://example.com/docs/intro --output-dir ./docs --path-depth 1

# 동시 처리 수 조절
wtm crawl --url https://example.com/docs/intro --output-dir ./docs --concurrency 5

# LLM 정제와 함께 크롤링
wtm crawl --url https://example.com/docs/intro --output-dir ./docs --llm-refine
```

**옵션:**

| 옵션 | 단축 | 설명 | 기본값  |
|------|------|------|:----:|
| `--url <url>` | `-u` | 크롤링 시작 URL | (필수) |
| `--output-dir <dir>` | `-D` | 결과 파일 저장 디렉토리 | (필수) |
| `--link-depth <n>` | `-l` | 최대 링크 홉 깊이 |  3   |
| `--path-depth <n>` | `-p` | scope 기준 하위 경로 최대 깊이 |  1   |
| `--scope <n>` | `-s` | 스코프 레벨 (0: 현재 디렉토리, 1: 한 단계 위, ...) |  0   |
| `--concurrency <n>` | `-c` | 동시 처리 수 |  3   |

**스코프 레벨 설명:**

시작 URL이 `example.com/a/b/c/page`일 때:
- `--scope 0` → `/a/b/c/*` 범위 (기본값)
- `--scope 1` → `/a/b/*` 범위
- `--scope 2` → `/a/*` 범위

**링크 깊이 설명:**

시작 URL로부터 링크를 몇 홉까지 따라갈지 제한합니다.

```
depth 0: 시작 URL (https://example.com/docs/intro)
depth 1: 시작 페이지에서 발견된 링크들
depth 2: depth 1 페이지들에서 발견된 링크들
depth 3: depth 2 페이지들에서 발견된 링크들 (기본 최대)
```

- `--link-depth 1` → 시작 페이지 + 직접 링크된 페이지만 크롤링
- `--link-depth 3` → 3홉까지 크롤링 (기본값)

**경로 깊이 설명:**

스코프 루트 기준으로 하위 경로 세그먼트 수를 제한합니다.

시작 URL이 `example.com/docs/intro`이고 스코프 루트가 `/docs/`일 때:
- `--path-depth 1` → `/docs/page` ✅, `/docs/tutorial/page` ❌
- `--path-depth 2` → `/docs/tutorial/page` ✅, `/docs/a/b/page` ❌

### 배치 변환

URL 목록 파일을 읽어 링크 추적 없이 지정된 URL만 일괄 변환합니다.

```bash
# URL 목록 파일로 배치 변환
wtm batch --urls urls.txt --output-dir ./docs

# LLM 정제와 함께 배치 변환
wtm batch --urls urls.txt --output-dir ./docs --llm-refine

# 동시 처리 수 조절
wtm batch --urls urls.txt --output-dir ./docs --concurrency 5
```

**옵션:**

| 옵션 | 단축 | 설명 | 기본값  |
|------|------|------|:----:|
| `--urls <file>` | `-f` | URL 목록 파일 경로 (한 줄에 하나씩) | (필수) |
| `--output-dir <dir>` | `-D` | 결과 파일 저장 디렉토리 | (필수) |
| `--concurrency <n>` | `-c` | 동시 처리 수 |  3   |

### 파일명 규칙 (crawl / batch 공통)

`crawl`과 `batch` 모두 동일한 파일명 규칙을 따릅니다.

- 기본: `/docs/api` → `docs/api.md`
- 쿼리 포함: `/docs/api?lang=ko&page=2` → `docs/api__lang-ko_page-2__hxxxxxxxx.md`
- 쿼리 키 순서는 자동 정렬되어 동일 쿼리는 같은 파일명으로 저장됩니다.

## 라이브러리 사용법

`wtm()`은 `WtmResult` 객체를 반환합니다: `{ markdown, metadata }`.

```ts
import { wtm } from '@seungyeop-lee/website-to-markdown';

// 기본 마크다운 변환 (LLM 불필요)
const result = await wtm('https://example.com/article');
console.log(result.markdown);    // Markdown 문자열
console.log(result.metadata);    // { url, origin, pathname, title, links }

// LLM 후처리 활성화
const result = await wtm('https://example.com/article', {
  llmRefine: true,
  llmConfig: {
    baseUrl: 'https://api.openai.com/v1',
    apiKey: 'your-api-key',
    model: 'gpt-4o-mini',
  },
});

// 한국어로 번역
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
  debug: true,
  llmRefine: true,
  llmConfig: {
    baseUrl: 'https://api.openai.com/v1',
    apiKey: 'your-api-key',
    model: 'gpt-4o-mini',
  },
});
```

## 환경변수

| 변수 | 설명 | 필수 |
|------|------|:----:|
| `OPENAI_API_BASE_URL` | OpenAI API 베이스 URL | `--llm-refine` 또는 `--llm-translate` 사용 시 |
| `OPENAI_API_KEY` | OpenAI API 키 | `--llm-refine` 또는 `--llm-translate` 사용 시 |
| `OPENAI_API_MODEL` | 모델명 | `--llm-refine` 또는 `--llm-translate` 사용 시 |

---

## 개발

```bash
bun install          # 의존성 설치
bun test             # 테스트 실행
bun run build        # JS 번들 생성
bun run build:types  # .d.ts 타입 선언 생성
```
