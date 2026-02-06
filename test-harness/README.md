# CLI Harness (독립 실행)

`test-harness`는 레포 내부 서브프로젝트이지만, 자체 `package.json` + `Makefile`로 독립 실행 가능한 CLI 실테스트 환경입니다.

## 빠른 시작

```bash
cd test-harness
bun run test
bun run ui
```

또는 Makefile 사용:

```bash
cd test-harness
make test
make ui
```

- `bun run test` / `make test`: core suite 실행 (`convert`, `crawl`, `invalid-url`)
- `bun run ui` / `make ui`: 시각 검증 대시보드 실행 (기본 `http://127.0.0.1:41731`)
- `bun run test:llm` / `make test-llm`: LLM 스모크 테스트 실행
- `bun run clean` / `make clean`: `artifacts/latest` 정리

## 독립성 범위

- 독립 실행: `test-harness` 폴더 내부 명령만으로 실행/검증/UI 확인 가능
- 비독립 배포: npm 배포 대상이 아니며 `private: true`

## LLM 스모크 테스트

`bun run test:llm` 전에 필요 환경변수:

- `OPENAI_API_BASE_URL`
- `OPENAI_API_KEY`
- `OPENAI_API_MODEL`

샘플은 `.env.example` 참고.

## 결과 위치

- 리포트: `test-harness/artifacts/latest/report.json`
- 요약: `test-harness/artifacts/latest/summary.md`
- 로그: `test-harness/artifacts/latest/stdout/*.log`, `test-harness/artifacts/latest/stderr/*.log`
- 실제 결과: `test-harness/artifacts/latest/actual/**/*.md`
- 비교 diff: `test-harness/artifacts/latest/diff/**/*.diff`

## 포트 정책

- fixture 서버 기본 포트: `41730`
- viewer 서버 기본 포트: `41731`
- 포트 충돌 시 자동으로 다음 포트로 증가

## 문서

- 상세 작동 원리/검증 규칙: [`MANUAL.md`](./MANUAL.md)
