# AGENTS.md

이 문서는 에이전트 작업 시 우선 참조할 `.claude` 문서 목록입니다.

## Reference Priority

1. `./.claude/CLAUDE.md`
2. `./.claude/rules/development-principles.md`
3. `./.claude/rules/bun-usage.md`
4. `./.claude/rules/test-harness.md`

## Maintenance Policy

- 프로젝트 관련 지침의 추가/수정/삭제는 `.claude` 폴더 내부 문서에서만 수행합니다.
- `AGENTS.md`는 참조 인덱스 역할만 유지하며, 실제 규칙 본문은 작성하지 않습니다.
- `.claude` 내부 `.md` 파일이 변경되면 `AGENTS.md`의 참조 목록과 설명만 동기화합니다.

## Reference Docs

- [`./.claude/CLAUDE.md`](./.claude/CLAUDE.md): 작업 시작 전 `README.md` 확인 및 기능 변경 시 `README.md` 업데이트 원칙을 정의합니다.
- [`./.claude/rules/bun-usage.md`](./.claude/rules/bun-usage.md): Node 생태계 대신 Bun 기반 실행/빌드/테스트/패키지 관리 규칙을 정의합니다.
- [`./.claude/rules/development-principles.md`](./.claude/rules/development-principles.md): 책임 주도 설계, 테스트 작성, 계층/폴더 구조, 의존성 조립 원칙을 정의합니다.
- [`./.claude/rules/test-harness.md`](./.claude/rules/test-harness.md): 테스트 하니스 실행 절차와 사용 규칙을 정의합니다.
