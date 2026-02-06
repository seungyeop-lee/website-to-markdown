# test-harness 규칙

## 목적

- `test-harness`는 `wtm` CLI의 실제 실행 경로를 고정 fixture 기반으로 검증하는 독립 테스트 하니스다.
- 기능 변경 검증 시 단위 테스트(`bun test`)와 별개로 하니스 검증이 필요하면 본 규칙을 따른다.

## 실행 원칙

- 하니스 명령은 반드시 `test-harness/` 디렉토리에서 실행한다.
- 기본 검증은 `bun run test`(또는 `make test`)를 사용한다.
- LLM 스모크 검증은 `bun run test:llm`(또는 `make test-llm`)를 사용한다.
- 결과 대시보드는 `bun run ui`(또는 `make ui`)로 확인한다.

## LLM 스위트 규칙

- 아래 3개 환경변수가 모두 있을 때만 LLM 스위트를 실행 대상으로 본다.
  - `OPENAI_API_BASE_URL`
  - `OPENAI_API_KEY`
  - `OPENAI_API_MODEL`
- 하나라도 없으면 LLM 케이스는 `SKIPPED`이며 실패로 간주하지 않는다.

## 결과 확인

- 하니스 실행 결과는 `test-harness/artifacts/latest/`에서 확인한다.
- 최소 확인 대상:
  - `report.json`
  - `summary.md`
  - 필요 시 `diff/**/*.diff`, `stdout/*.log`, `stderr/*.log`

## 유지보수

- fixture 또는 expected 변경 시 `test-harness/MANUAL.md`의 유지보수 절차를 따른다.
