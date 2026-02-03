# wtm - Website to Markdown

웹 사이트 URL을 입력받아 LLM을 통해 핵심 본문을 추출하고 Markdown 형식으로 출력하는 CLI 도구 및 라이브러리.

> **요구사항:** [Bun](https://bun.sh) 런타임 필수

## 실행

### bunx (설치 없이)

```bash
OPENAI_API_BASE_URL=https://api.openai.com/v1 \
OPENAI_API_KEY=your-api-key \
OPENAI_API_MODEL=gpt-4o-mini \
bunx @seungyeop-lee/website-to-markdown https://example.com/article
```

### 로컬

```bash
bun install

# .env 파일 생성
OPENAI_API_BASE_URL=https://api.openai.com/v1
OPENAI_API_KEY=your-api-key
OPENAI_API_MODEL=gpt-4o-mini
```

```bash
bun src/cli.ts https://example.com/article

# 파일로 저장
bun src/cli.ts https://example.com/article > output.md
```

## 환경변수

| 변수 | 설명 | 필수 |
|------|------|------|
| `OPENAI_API_BASE_URL` | OpenAI API 베이스 URL | O |
| `OPENAI_API_KEY` | OpenAI API 키 | O |
| `OPENAI_API_MODEL` | 모델명 | O |

## 라이브러리로 사용

```bash
bun add @seungyeop-lee/website-to-markdown
```

```ts
import { wtm } from '@seungyeop-lee/website-to-markdown';

const markdown = await wtm('https://example.com/article', {
  llm: {
    baseUrl: 'https://api.openai.com/v1',
    apiKey: 'your-api-key',
    model: 'gpt-4o-mini',
  },
});
```

## 빌드

```bash
bun run build        # JS 번들 생성
bun run build:types  # .d.ts 타입 선언 생성
```

## 기능

- SPA/JavaScript 렌더링 사이트 지원 (Playwright 사용)
- 100k 토큰 초과 시 자동 청킹
- 메타데이터 추출 (title, description, og:image)
- 이미지 URL 원본 유지

## 테스트

```bash
bun test
```
