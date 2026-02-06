.PHONY: test test-llm ui clean help

help:
	@echo "test-harness commands"
	@echo "  make test      # core suite 실행"
	@echo "  make test-llm  # llm suite 실행 (환경변수 없으면 SKIPPED)"
	@echo "  make ui        # 결과 대시보드 실행"
	@echo "  make clean     # artifacts 정리"

test:
	bun run test

test-llm:
	bun run test:llm

ui:
	bun run ui

clean:
	bun run clean
