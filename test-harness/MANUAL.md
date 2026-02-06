# CLI Harness Manual

## 1) 목적

이 하네스는 `wtm` CLI의 실제 실행 경로를 로컬 fixture 웹사이트로 검증합니다.

- 재현 가능한 입력(고정 HTML)
- 결정적 비교(expected vs actual)
- 실패 시 non-zero 종료
- 결과를 웹 대시보드에서 시각 확인

## 2) 실행 모델

이 하네스는 `test-harness/package.json`을 기준으로 독립 실행됩니다.

- `bun run test` (core)
- `bun run test:llm` (optional llm)
- `bun run ui` (viewer)
- `bun run clean` (artifacts cleanup)

`make` 명령은 위 bun scripts를 감싼 래퍼입니다.

### Core suite

`bun run test` (`bun src/run-cli-harness.ts --suite core`) 실행 시 아래 순서로 동작합니다.

1. fixture 서버를 `127.0.0.1:41730`부터 기동 (충돌 시 자동 증가)
2. 케이스별로 실제 CLI 실행
3. stdout/stderr/산출물 수집
4. markdown 정규화 후 expected와 비교
5. `report.json`, `summary.md`, diff 파일 생성
6. 실패 케이스가 1개라도 있으면 exit code `1`

### LLM suite

`bun run test:llm` (`--suite llm`) 실행 시:

- `OPENAI_API_BASE_URL`, `OPENAI_API_KEY`, `OPENAI_API_MODEL` 3개가 모두 있으면 실행
- 하나라도 없으면 `SKIPPED`로 기록하고 실패 처리하지 않음

## 2-1) 내부 아키텍처 (책임 주도 설계)

- `src/run-cli-harness.ts`는 Composition Root로서 의존성 조립만 담당합니다.
- `src/harness/domain/`은 타입/케이스 계약을 담당합니다.
- `src/harness/infrastructure/`는 CLI 실행과 아티팩트 I/O를 담당합니다.
- `src/harness/services/`는 케이스 레지스트리, 실행기, markdown 비교, 리포트 생성, 실행 오케스트레이션을 담당합니다.

## 3) 테스트 케이스

### core-convert-intro

- 명령: `convert --no-llm <fixture>/docs/intro.html -o ...`
- 검증:
  - exit code `0`
  - 출력 파일 생성
  - expected/actual markdown 일치

### core-convert-spa

- 명령: `convert --no-llm <fixture>/docs/spa.html -o ...`
- 검증:
  - exit code `0`
  - 출력 파일 생성
  - `SPA Dynamic Heading` 포함(동적 렌더링 확인)
  - expected/actual markdown 일치

### core-crawl-docs

- 명령: `crawl --no-llm --url <fixture>/docs/intro.html --output-dir ... --link-depth 1 --scope 0 --path-depth 2`
- 검증:
  - exit code `0`
  - 생성 파일이 정확히 3개: `docs/intro.md`, `docs/advanced.md`, `docs/spa.md`
  - `blog/outside.md` 미생성
  - 3개 파일 expected/actual 일치

### core-invalid-url

- 명령: `convert --no-llm not-a-url`
- 검증:
  - exit code `1`
  - stderr에 `유효하지 않은 URL입니다` 포함

### llm-translate-smoke

- 명령: `convert --translate ko <fixture>/docs/intro.html -o ...`
- 검증:
  - exit code `0`
  - 출력 파일 생성
  - 비어있지 않은 결과

## 4) 정규화 규칙

비교 전 아래 값을 마스킹합니다.

- `createdAt: ...` -> `createdAt: __WTM_CREATED_AT__`
- `http://127.0.0.1:<port>` -> `http://127.0.0.1:__WTM_PORT__`

포트 자동 증가가 발생해도 expected 비교가 깨지지 않도록 설계했습니다.

## 5) 아티팩트 구조

`test-harness/artifacts/latest/`

- `report.json`: 대시보드 원본 데이터
- `summary.md`: 요약
- `stdout/*.log`, `stderr/*.log`: 케이스별 CLI 로그
- `actual/**/*.md`: 실제 생성 markdown
- `expected/*.md`: 대시보드 표시용 expected snapshot
- `diff/**/*.diff`: mismatch 시 생성

## 6) 대시보드

`bun run ui` 실행 후 브라우저에서 접속:

- 기본: `http://127.0.0.1:41731`
- 포트 충돌 시 자동 증가

대시보드에서 확인 가능:

- 케이스 상태(PASS/FAIL/SKIP)
- 실행 명령/소요시간/종료코드
- check 항목별 상세 메시지
- stdout/stderr
- expected vs actual markdown 및 diff

## 7) 유지보수 가이드

fixture/expected를 수정할 때 권장 순서:

1. fixture HTML 수정 (`fixtures/site/...`)
2. `make test` 실행
3. `artifacts/latest/actual` 결과를 확인 후 `expected` 반영
4. `make test` 재실행해서 PASS 확인
5. `make ui`로 시각 검증

## 8) 문제 해결

- Playwright 브라우저 이슈: 루트에서 `bun install` 재실행
- 포트 충돌: 자동 증가되므로 별도 조치 없이 로그의 실제 포트 확인
- LLM suite가 항상 SKIPPED: 환경변수 3종 설정 여부 확인
