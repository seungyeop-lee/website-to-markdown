# 릴리스 가이드

## 버전 규칙 (Semantic Versioning)

| 명령어 | 변경 | 예시 |
|--------|------|------|
| `bun pm version patch` | 버그 수정 | 0.1.0 → 0.1.1 |
| `bun pm version minor` | 기능 추가 | 0.1.0 → 0.2.0 |
| `bun pm version major` | breaking change | 0.1.0 → 1.0.0 |

## 릴리스 절차

```bash
# 1. 코드 변경 커밋
git add . && git commit -m "feat: 새 기능 추가"

# 2. 버전 올리기 (package.json 수정 + git commit + git tag 자동 생성)
bun pm version patch  # 또는 minor, major

# 3. 태그 포함 push
git push --follow-tags

# 4. GitHub에서 Release 생성
#    Releases → Draft a new release → 태그 선택 → Publish release
```

Release가 생성되면 GitHub Actions가 자동으로 테스트 → GitHub Packages 배포를 실행합니다.
