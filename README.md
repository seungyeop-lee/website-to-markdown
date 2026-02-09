# wtm - Website to Markdown

웹 사이트 URL을 입력받아 핵심 본문을 추출하고 Markdown으로 변환하는 CLI 도구 및 라이브러리.

### 주요 기능

- SPA/JavaScript 렌더링 사이트 지원 (Playwright + Stealth 플러그인)
- [mdream](https://github.com/nichochar/mdream) 기반 HTML → Markdown 변환 (본문 추출, 노이즈 필터링, Tailwind 처리)
- LLM 후처리를 통한 마크다운 정제 (`--llm-refine`, 선택 사항)
- LLM 기반 다국어 번역 (`--llm-translate <lang>`, 선택 사항)
- YAML frontmatter 자동 생성 (url, createdAt)
- 다중 페이지 크롤링 (`wtm crawl`) — 링크 추적, 스코프 필터링, 병렬 처리
- URL 목록 배치 변환 (`wtm batch`) — 지정된 URL만 일괄 변환
- Chrome CDP 연결 (`--use-chrome`) — 실행 중인 Chrome의 인증 세션 활용

---

## 설치

```bash
# CLI (Bun 필수, 글로벌 설치)
bun add -g @seungyeop-lee/website-to-markdown

# 라이브러리 (Node.js 18+)
npm install @seungyeop-lee/website-to-markdown
```

> **참고:** 설치 시 `postinstall` 스크립트가 Playwright Chromium을 자동 다운로드합니다.
> `--ignore-scripts` 옵션으로 설치한 경우 `npx playwright install chromium`을 수동 실행해 주세요.

## CLI 사용법

```bash
# 단일 페이지 변환
wtm convert https://example.com/article

# LLM 정제 + 번역
wtm convert --llm-refine --llm-translate ko https://example.com/article

# 파일로 저장
wtm convert -o output.md https://example.com/article

# 크롤링 (링크 추적)
wtm crawl --url https://example.com/docs/intro --output-dir ./docs

# 배치 변환 (URL 목록)
wtm batch --urls urls.txt --output-dir ./docs
```

LLM 기능 사용 시 환경변수 설정이 필요합니다. 전체 옵션과 상세 사용법은 [MANUAL.md](./MANUAL.md)를 참조하세요.

## 라이브러리 사용법

### wtm() — 단일 페이지 변환

```ts
import { wtm } from '@seungyeop-lee/website-to-markdown';

// 기본 변환 (LLM 불필요)
const result = await wtm('https://example.com/article');
console.log(result.markdown);    // Markdown 문자열
console.log(result.metadata);    // { url, origin, pathname, title, links }

// LLM 정제 + 번역
const refined = await wtm('https://example.com/article', {
  llmRefine: true,
  llmTranslate: 'ko',
  llmConfig: {
    baseUrl: 'https://api.openai.com/v1',
    apiKey: 'your-api-key',
    model: 'gpt-4o-mini',
  },
});
```

### wtmCrawl() — 링크 추적 크롤링

```ts
import { wtmCrawl } from '@seungyeop-lee/website-to-markdown';

await wtmCrawl('https://example.com/docs/intro', {
  outputDir: './docs',
  maxLinkDepth: 3,
  concurrency: 3,
});
```

### wtmUrls() — URL 목록 배치 변환

```ts
import { wtmUrls } from '@seungyeop-lee/website-to-markdown';

await wtmUrls(
  ['https://example.com/page1', 'https://example.com/page2'],
  { outputDir: './docs' },
);
```

전체 옵션은 [MANUAL.md](./MANUAL.md)를 참조하세요.

## 환경변수

LLM 기능(`--llm-refine`, `--llm-translate`) 사용 시 필요합니다.
실행 디렉토리에 `.env` 파일을 생성하면 Bun이 자동으로 로드합니다.

| 변수 | 설명 |
|------|------|
| `OPENAI_API_BASE_URL` | OpenAI API 베이스 URL |
| `OPENAI_API_KEY` | OpenAI API 키 |
| `OPENAI_API_MODEL` | 모델명 |

