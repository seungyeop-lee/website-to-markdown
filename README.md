# wtm - Website to Markdown

웹 사이트 URL을 입력받아 LLM을 통해 핵심 본문을 추출하고 Markdown으로 변환하는 CLI 도구 및 라이브러리.

> **요구사항:** [Bun](https://bun.sh) 런타임 필수

### 주요 기능

- SPA/JavaScript 렌더링 사이트 지원 (Playwright)
- 100k 토큰 초과 시 자동 청킹
- 메타데이터 추출 (title, description, og:image)
- 이미지 URL 원본 유지

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

# 파일로 저장
bunx @seungyeop-lee/website-to-markdown https://example.com/article > output.md
```

### 글로벌 설치

```bash
bun install -g @seungyeop-lee/website-to-markdown
```

```bash
wtm https://example.com/article
wtm https://example.com/article > output.md
```

## 라이브러리 사용법

```ts
import { wtm } from '@seungyeop-lee/website-to-markdown';

// LLM 후처리 활성화
const markdown = await wtm('https://example.com/article', {
  llm: {
    enable: true,
    baseUrl: 'https://api.openai.com/v1',
    apiKey: 'your-api-key',
    model: 'gpt-4o-mini',
  },
});

// LLM 후처리 비활성화 (기본 마크다운 변환만 수행)
const markdown = await wtm('https://example.com/article', {
  llm: {
    enable: false,
    baseUrl: '',
    apiKey: '',
    model: '',
  },
});
```

## 환경변수

| 변수 | 설명 | 필수 |
|------|------|:----:|
| `OPENAI_API_BASE_URL` | OpenAI API 베이스 URL | `--no-llm` 미사용 시 |
| `OPENAI_API_KEY` | OpenAI API 키 | `--no-llm` 미사용 시 |
| `OPENAI_API_MODEL` | 모델명 | `--no-llm` 미사용 시 |

---

## 개발

```bash
bun install          # 의존성 설치
bun test             # 테스트 실행
bun run build        # JS 번들 생성
bun run build:types  # .d.ts 타입 선언 생성
```
