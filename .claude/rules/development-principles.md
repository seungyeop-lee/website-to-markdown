## 개발 원칙

- 책임 주도 개발(Responsibility-Driven Design) 기반으로 설계한다.
- 각 책임(클래스/모듈) 단위로 단위 테스트를 반드시 작성한다.

## 폴더 구조

- `src/services/base/` — 독립 도메인 서비스 (PageRenderer, ContentExtractor, WtmFileWriter). 다른 서비스에 의존하지 않는다.
- `src/services/wtm/` — 단일 페이지 변환 facade (wtm, WtmConfig)
- `src/services/batch/` — URL 목록 배치 변환 (WtmBatchConverter, BatchConvertConfig)
- `src/services/crawler/` — 링크 추적 크롤링 오케스트레이션 (WtmCrawler, UrlScopeFilter)
- `src/infrastructure/` — 외부 시스템 어댑터 (BrowserManager, LLMRefiner, LLMTranslator, Logger)

## 클래스 설계

- 서비스와 인프라는 클래스 기반으로 작성한다.
- utils는 순수 함수로 유지한다.
- 협력자는 생성자 주입(Constructor Injection)으로 전달한다.
- `src/services/wtm/wtm.ts`, `src/services/batch/wtm-batch.ts`, `src/services/crawler/wtm-crawl.ts`가 composition root로서 의존성을 조립한다.
- `src/cli/`는 CLI 인터페이스 계층으로, 인자 파싱 후 서비스를 호출한다.

## 함수/메서드 배치

- 외부에 노출되는 메인 함수/메서드는 파일 상단에 배치한다.
- 메인 함수/메서드 내부에서만 사용하는 내부용 헬퍼 함수/메서드는 파일 하단에 배치한다.
