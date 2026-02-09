# playwright-core 패치 및 버전 고정

## 현황

- `playwright`는 `1.58.2`로 버전 고정 (`package.json`에서 `^` 제거)
- `patches/playwright-core@1.58.2.patch`가 `bun install` 시 자동 적용 (`patchedDependencies`)
- `ws@8.19.0`이 패치에서 참조하는 외부 의존성

## 패치가 필요한 이유

Bun 런타임에서 Playwright의 CDP(Chrome DevTools Protocol) WebSocket 연결이 실패한다.

- Playwright는 `ws` 라이브러리를 빌드 타임에 번들링 (`utilsBundleImpl.js`)
- Bun의 HTTP 클라이언트가 HTTP→WebSocket upgrade를 지원하지 않음
- 결과: `connectOverCDP()` 호출 시 30초 타임아웃 후 실패

패치는 `utilsBundle.js`에서 Bun일 때 외부 `ws` 패키지를 로드하도록 분기한다:
```js
const ws = 'Bun' in globalThis ? require('ws') : require('./utilsBundleImpl').ws;
```

## 버전 고정 이유

- 패치 파일명이 `playwright-core@1.58.2`로 특정 버전에 바인딩
- `playwright` 버전이 올라가면 내부 의존성 `playwright-core`도 올라가서 패치 미적용
- `playwright-core` 내부 번들 구조가 바뀌면 패치 자체가 깨질 수 있음

## npm 마이그레이션 시 참고

- **패치 시스템 변경 필요**: `patchedDependencies`는 Bun 전용 기능. npm에서는 `patch-package`나 `pnpm patch` 등을 사용해야 함
- **패치 제거 가능성**: npm(Node.js) 환경에서는 이 패치가 불필요할 수 있음. 패치 코드의 `'Bun' in globalThis` 분기에 의해 Node.js에서는 원래 번들을 사용하므로 패치가 있어도 무해하지만, 유지 부담을 줄이려면 제거 검토
- **`ws` 의존성**: 패치 제거 시 `ws` 패키지도 함께 제거 가능
- **버전 고정 해제**: 패치 제거 후에는 `playwright` 버전을 `^`로 되돌려도 무방

## 패치 제거 조건

아래 중 하나가 해결되면 패치 제거 가능:
- Bun이 HTTP→WebSocket upgrade 지원 (oven-sh/bun#9911 해결)
- Playwright가 Bun 호환 WebSocket 처리를 내장

## 레퍼런스

- Bun WebSocket upgrade 미지원 이슈: https://github.com/oven-sh/bun/issues/9911
- Bun + Playwright 호환성 이슈: https://github.com/oven-sh/bun/issues/9357
- Bun 패치 기능 문서: https://bun.sh/docs/install/patch
- patch-package (npm 대안): https://github.com/ds300/patch-package
