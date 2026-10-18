# 테스트

[← README](../README.md)

단위 테스트(Vitest)와 e2e(Playwright)를 함께 쓴다. e2e 는 화면을 픽셀로 비교하지 않는다. 페이지가 깨졌는지, 있어야 할 것이 빠졌는지, API 가 정해진 상태 코드를 돌려주는지만 본다.

## 명령

| 명령 | 실행하는 것 |
| --- | --- |
| `npm test` | `vitest run`: 단위 테스트 전체 |
| `npm run test:watch` | `vitest`: 파일이 바뀌면 다시 실행 |
| `npm run test:smoke` | Playwright `desktop` · `mobile` 프로젝트 — 공개 화면 |
| `npm run test:smoke:admin` | Playwright `admin` 프로젝트 — 관리자 화면 (로그인 세션 필요) |
| `npm run test:api` | Playwright `api` · `api-auth` 프로젝트 — API 라우트 |

Playwright 는 `webServer` 로 `npm run start` 를 띄운다. 그래서 e2e 전에 `npm run build` 가 끝나 있어야 한다. dev 서버는 HMR 오버레이 때문에 불안정해 쓰지 않는다. 3000 번 포트에 이미 서버가 있으면 로컬에서는 그 서버를 그대로 쓴다(`reuseExistingServer`).

```bash
npm run build
npm run test:smoke
```

위 두 줄이 공개 화면 e2e 를 돌리는 최소 순서다.

## 단위 테스트 (Vitest)

**스택**: Vitest + React Testing Library + jsdom. 설정은 [`vitest.config.ts`](../vitest.config.ts) 다.

- 대상은 `src/**/*.test.{ts,tsx}` 이다. 지금 169개 파일이 있다. `src/__tests__/` 에 156개, 편집기 쪽 `src/components/posts/plate/__tests__/` 에 13개다.
- 공통 준비는 `src/__tests__/setup.ts` 가 한다.
- `@platejs/*` 는 vite 가 변환하도록 inline 으로 둔다. 전체 EditorKit 을 테스트에서 불러오기 위해서다. katex CSS 는 빈 파일로 바꿔 끼운다.
- 시간 제한은 로컬 5초, CI 20초다. CI 러너는 코어가 적어 짧은 테스트도 가끔 5초를 넘겼다.

파일 목록을 이 문서에 적지 않는다. 몇 가지는 코드가 아니라 저장소 상태를 지키는 감시 테스트라 따로 적는다.

| 파일 | 지키는 것 |
| --- | --- |
| `styleRatchet.test.ts` | [design-system.md](./design-system.md) 의 "목표" 숫자가 늘지 않는지, 줄었으면 기준선(`scripts/style-ratchet.baseline.json`)도 함께 줄였는지 |
| `cssTokens.test.ts` | 정의되지 않은 CSS 토큰을 쓰는 곳이 없는지. `var()` 에 대체값이 없으면 선언 전체가 조용히 무효가 된다 |
| `tokenDoc.test.ts` | [tokens.md](./tokens.md) 가 토큰 CSS 와 맞는지 (`npm run tokens:doc` 으로 다시 만든다) |
| `apiMap.test.ts` · `erdSchema.test.ts` | 빌드 전 생성 파일(`apiMap.ts` · `erdSchema.ts`)이 원본과 맞는지 |

## e2e (Playwright)

설정은 [`playwright.config.ts`](../playwright.config.ts), 스펙은 `e2e/` 의 16개 파일이다. 애니메이션을 줄이려고 모든 프로젝트에 `reducedMotion: "reduce"` 와 다크 색 구성을 건다. 마퀴 · GSAP · three.js 가 계속 돌아 로드 시점이 흔들리므로 `retries: 2` 로 흡수한다.

| 프로젝트 | 스펙 | 환경 |
| --- | --- | --- |
| `desktop` | `smoke` · `nav` · `designsystem` · `about` · `postsindex` · `profile` · `dates` · `detail` · `home` | Desktop Chrome 1440×900 |
| `mobile` | `smoke` · `about` | Pixel 7 |
| `setup` | `auth.setup.ts`: 관리자로 한 번 로그인해 세션 저장 | |
| `api` | `api.spec.ts`: 로그인 없이 API 호출 | 브라우저 없음 |
| `api-auth` | `api-auth.spec.ts`: 저장한 세션으로 API 호출 | `setup` 뒤 |
| `admin` | `admin` · `dashboard` · `editor` · `workeditor` · `settings` · `adminposts` | `setup` 뒤, Desktop Chrome 1440×900 |

**스모크**(`smoke.spec.ts` · `admin.spec.ts`)는 [`e2e/routes.ts`](../e2e/routes.ts) 의 라우트를 하나씩 연다. 공개 라우트 20개, 관리자 라우트 16개(목록 6 + 설정 탭 10)다. 라우트마다 다음을 본다.

- 응답 상태가 400 미만인지
- 에러 바운더리(`app/error.tsx`)가 뜨지 않았는지
- 화면이 비지 않았고 404 화면이 아닌지
- `expectVisible` 로 지정한 섹션이 보이는지. 데이터를 못 받아 섹션이 조용히 빠지는 경우를 잡는다
- 새 런타임 에러가 없는지. 이미 알려진 에러는 라우트의 `knownPageErrors` 로 거른다

`/design-system` 은 스모크 대상에서 뺐다. 화면이 아주 길고 인터랙티브 데모가 많아 안정되지 않는다. `desktop` 프로젝트의 `designsystem.spec.ts` 가 따로 본다.

### 관리자 세션 준비

`admin` · `api-auth` 프로젝트는 로그인 세션이 필요하다.

1. `.env.local` 에 `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD` 를 넣는다. 소유자(`OWNER_EMAIL`) 계정을 쓴다. 새로 만든 계정은 `app_metadata` 에 역할이 없어 관리자 화면에 들어가지 못한다.
2. `npm run test:smoke:admin` 을 실행한다. 첫 실행은 새 기기 승인 대기로 실패한다.
3. Supabase Table Editor → `admin_known_devices` 에서 방금 생긴 행의 `approved` 를 `true` 로 바꾼다. 승인 메일의 링크가 하는 일이 이것이라 메일을 받을 필요는 없다.
4. 다시 실행하면 통과하고, 세션이 `e2e/.auth/admin.json` 에 저장된다. 이 파일에는 인증 토큰이 있어 `.gitignore` 에 들어 있다.

## 커밋 전 검사

`.husky/pre-commit` 은 커밋 작성자 · 커미터가 도구 계정(`anthropic.com`)인지 먼저 보고, 그다음 `npx lint-staged` 를 돌린다. 규칙은 [`.lintstagedrc.mjs`](../.lintstagedrc.mjs) 에 있다.

| 스테이징된 파일 | 실행 |
| --- | --- |
| `*.{ts,tsx}` | `eslint` |
| `*.{css,module.css}` | `stylelint --allow-empty-input` |
| `*.{ts,tsx,css}` | `vitest run src/__tests__/styleRatchet.test.ts` (파일 목록 없이 한 번) |

커밋 메시지는 `.husky/commit-msg` 가 commitlint 로 검사한다([commit-convention.md](./commit-convention.md)).

## CI

`.github/workflows/ci.yml` 이 master 로 가는 push · PR 마다 다음을 돌린다. e2e 는 CI 에서 돌리지 않는다.

1. `npm run typecheck`
2. `npm run lint`: 경고 개수 상한(`--max-warnings`)을 넘으면 실패
3. `npm run lint:css`
4. `npm test`
5. `npm run knip -- --no-exit-code`: 미사용 export · 파일 리포트(실패하지 않음)
6. `npm run knip:deps`: 등록되지 않은 의존성이 있으면 실패
7. `npm run type-coverage`: 97.93% 미만이면 실패

> **리팩토링 문서**: [리팩토링 가이드](./refactoring-guide.md) · [성능 baseline](./perf-baseline.md)
