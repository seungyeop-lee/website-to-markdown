## 개발 원칙

- 책임 주도 개발(Responsibility-Driven Design) 기반으로 설계한다.
- 각 책임(클래스/모듈) 단위로 단위 테스트를 반드시 작성한다.

## 폴더 구조

- `src/services/` — 핵심 도메인 서비스 (PageRenderer, ContentExtractor)
- `src/infrastructure/` — 외부 시스템 어댑터 (BrowserManager, LLMClient)

## 클래스 설계

- 서비스와 인프라는 클래스 기반으로 작성한다.
- utils는 순수 함수로 유지한다.
- 협력자는 생성자 주입(Constructor Injection)으로 전달한다.
- `src/services/wtm.ts`와 `src/services/crawler/wtm-crawler.ts`가 composition root로서 의존성을 조립한다.
- `src/cli/`는 CLI 인터페이스 계층으로, 인자 파싱 후 서비스를 호출한다.
- `src/services/crawler/` — 크롤링 오케스트레이션 (WtmCrawler, WtmFileWriter, UrlScopeFilter)
