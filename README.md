# wtm - Website to Markdown

웹 사이트 URL을 입력받아 LLM을 통해 핵심 본문을 추출하고 Markdown으로 변환하는 CLI 도구 및 라이브러리.

> **요구사항:** [Bun](https://bun.sh) 런타임 필수

### 주요 기능

- SPA/JavaScript 렌더링 사이트 지원 (Playwright + Stealth 플러그인)
- [mdream](https://github.com/nichochar/mdream) 기반 HTML → Markdown 변환 (본문 추출, 노이즈 필터링, Tailwind 처리)
- LLM 후처리를 통한 마크다운 정제 (선택 사항)
- LLM 기반 다국어 번역 (`--translate <lang>`)
- YAML frontmatter 자동 생성 (url, createdAt)
- `--debug` 모드로 파이프라인 각 스텝 로깅
- 다중 페이지 크롤링 (`wtm crawl`) — 링크 추적, 스코프 필터링, 병렬 처리

---

## Quick Start

```bash
OPENAI_API_BASE_URL=https://api.openai.com/v1 \
OPENAI_API_KEY=your-api-key \
OPENAI_API_MODEL=gpt-4o-mini \
bunx @seungyeop-lee/website-to-markdown https://example.com/article
```

## 설치

```bash
bun add @seungyeop-lee/website-to-markdown
```

## CLI 사용법

실행 디렉토리에 `.env` 파일을 생성하면 Bun이 자동으로 로드합니다.
`.env` 파일이 없는 경우 환경변수를 직접 설정해야 합니다.

```sh
OPENAI_API_BASE_URL=https://api.openai.com/v1
OPENAI_API_KEY=your-api-key
OPENAI_API_MODEL=gpt-4o-mini
```

```bash
# 실행
bunx @seungyeop-lee/website-to-markdown https://example.com/article

# LLM 후처리 없이 기본 마크다운 변환만 수행
bunx @seungyeop-lee/website-to-markdown --no-llm https://example.com/article

# 마크다운을 한국어로 번역
bunx @seungyeop-lee/website-to-markdown --translate ko https://example.com/article

# LLM 정제 없이 번역만 수행
bunx @seungyeop-lee/website-to-markdown --no-llm --translate ko https://example.com/article

# 디버그 모드 (파이프라인 각 스텝 로깅)
bunx @seungyeop-lee/website-to-markdown --debug https://example.com/article

# 파일로 저장 (stdout 리다이렉션)
bunx @seungyeop-lee/website-to-markdown https://example.com/article > output.md

# 파일로 저장 (-o 옵션)
bunx @seungyeop-lee/website-to-markdown -o output.md https://example.com/article
```

### 글로벌 설치

```bash
bun install -g @seungyeop-lee/website-to-markdown
```

```bash
wtm https://example.com/article
wtm --no-llm https://example.com/article
wtm --translate ko https://example.com/article
wtm --no-llm --translate ko https://example.com/article
wtm --debug https://example.com/article
wtm https://example.com/article > output.md
wtm -o output.md https://example.com/article
```

### 크롤링

링크를 따라가며 여러 페이지를 한 번에 Markdown으로 변환합니다.

```bash
# 기본 크롤링 (시작 URL의 같은 디렉토리 범위, 링크 3홉)
wtm crawl https://example.com/docs/intro --output-dir ./docs

# 링크 깊이 제한 및 스코프 확장
wtm crawl https://example.com/docs/api/auth --output-dir ./docs --link-depth 2 --scope 1

# 경로 깊이 제한 (scope root 아래 1 segment까지만 허용)
wtm crawl https://example.com/docs/intro --output-dir ./docs --path-depth 1

# 동시 처리 수 조절
wtm crawl https://example.com/docs/intro --output-dir ./docs --concurrency 5

# LLM 없이 크롤링
wtm crawl https://example.com/docs/intro --output-dir ./docs --no-llm

# URL 목록 파일로 크롤링 (링크 추적 없이 지정된 URL만 변환)
wtm crawl --urls urls.txt --output-dir ./docs
```

**옵션:**

| 옵션 | 설명 | 기본값  |
|------|------|:----:|
| `--output-dir <dir>` | 결과 파일 저장 디렉토리 | (필수) |
| `--link-depth <n>` | 최대 링크 홉 깊이 |  3   |
| `--path-depth <n>` | scope 기준 하위 경로 최대 깊이 |  1   |
| `--scope <n>` | 스코프 레벨 (0: 현재 디렉토리, 1: 한 단계 위, ...) |  0   |
| `--concurrency <n>` | 동시 처리 수 |  3   |
| `--urls <file>` | URL 목록 파일 경로 (한 줄에 하나씩) |  -   |

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

## 라이브러리 사용법

`wtm()`은 `WtmResult` 객체를 반환합니다: `{ markdown, metadata }`.

```ts
import { wtm } from '@seungyeop-lee/website-to-markdown';

// LLM 후처리 활성화
const result = await wtm('https://example.com/article', {
  llm: {
    enable: true,
    baseUrl: 'https://api.openai.com/v1',
    apiKey: 'your-api-key',
    model: 'gpt-4o-mini',
  },
});
console.log(result.markdown);    // Markdown 문자열
console.log(result.metadata);    // { url, origin, pathname, title, links }

// LLM 후처리 비활성화 (기본 마크다운 변환만 수행)
const result = await wtm('https://example.com/article');

// 한국어로 번역 (LLM 정제 + 번역)
const result = await wtm('https://example.com/article', {
  translate: 'ko',
  llm: {
    enable: true,
    baseUrl: 'https://api.openai.com/v1',
    apiKey: 'your-api-key',
    model: 'gpt-4o-mini',
  },
});

// LLM 정제 없이 번역만 수행
const result = await wtm('https://example.com/article', {
  translate: 'ko',
  llm: {
    enable: false,
    baseUrl: 'https://api.openai.com/v1',
    apiKey: 'your-api-key',
    model: 'gpt-4o-mini',
  },
});

// 디버그 모드
const result = await wtm('https://example.com/article', {
  debug: true,
  llm: {
    enable: true,
    baseUrl: 'https://api.openai.com/v1',
    apiKey: 'your-api-key',
    model: 'gpt-4o-mini',
  },
});
```

## 환경변수

| 변수 | 설명 | 필수 |
|------|------|:----:|
| `OPENAI_API_BASE_URL` | OpenAI API 베이스 URL | LLM 정제 또는 번역 사용 시 |
| `OPENAI_API_KEY` | OpenAI API 키 | LLM 정제 또는 번역 사용 시 |
| `OPENAI_API_MODEL` | 모델명 | LLM 정제 또는 번역 사용 시 |

---

## 개발

```bash
bun install          # 의존성 설치
bun test             # 테스트 실행
bun run build        # JS 번들 생성
bun run build:types  # .d.ts 타입 선언 생성
```
