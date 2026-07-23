# 리팩토링 가이드

전체 리팩토링의 원칙과 실행 계획. 작업 전 이 문서를 먼저 읽는다.

## 0. 왜 계획이 필요한가

| 항목 | 수치 |
| --- | --- |
| `src` 전체 | 226,886줄 (tsx 432 · ts 375 · css 214) |
| `use client` | 353 / 432 tsx (82%) |
| `page.tsx` 중 client | 15 / 31 |
| `next/dynamic` | 21곳 |
| useState / useEffect | 1,492 / 630 |
| `any` / `eslint-disable` | 308 / 348 |
| 최대 파일 | PlateEditor 3,561 · admin page 3,035 · WorkEditor 2,610 · PostsClient 1,972 |
| 최대 CSS | Settings.module.css 6,633 |

구조 규약(4-tier 토큰, `components/ui`, `_components` 콜로케이션)은 이미 서 있다.
문제는 **규약을 못 따라간 거대 파일들과 client 경계**다.

---

## 1. 원칙

### P1. 리팩토링 커밋에 기능 변경을 섞지 않는다

`refactor:` 커밋은 동작이 100% 같아야 한다. 픽셀도 보존한다.
리팩토링 중 발견한 버그는 **이슈로 떼고 별도 PR**. 롤백 가능성이 여기서 갈린다.

### P2. 한 번에 한 축만

JSX 구조 · 스타일 · 프로젝트 구조 · 성능 · 타입을 한 PR에 섞지 않는다.
예외: Phase 4의 거대 파일 분해는 JSX와 CSS 모듈이 물리적으로 붙어 있으므로 함께 간다.

### P3. 측정 없는 성능 개선 금지

라우트별 First Load JS를 먼저 기록하고, 전/후 수치를 PR 본문에 적는다. 체감으로 판단하지 않는다.

```bash
npx next build --experimental-analyze   # ← npm run analyze 아님 (아래 주의)
```

**주의:** `npm run analyze`(`@next/bundle-analyzer`)는 이 프로젝트에서 **아무것도 생성하지 않는다.**
Next 16의 빌드는 Turbopack이 기본이고 bundle-analyzer는 webpack 플러그인이라 무시된다.
기준선과 측정 방법은 [perf-baseline.md](perf-baseline.md) 참조.

### P4. 원칙은 린터로 강제한다

문서로만 둔 규칙은 반드시 회귀한다. `audit:full`에 게이트를 얹어 기계가 지키게 한다.
새 규칙은 baseline을 락하고 **점진적으로 조인다** (한 번에 통과 불가능한 룰은 무시당한다).

### P5. 수직 슬라이스로 자른다

도메인 단위(`admin` → `posts` → `about`/`works` → 에디터)로 자르고,
한 슬라이스는 착수 → 완료 → 머지까지 끝낸 뒤 다음으로 간다. **동시 진행 금지.**

### P6. 보이스카웃 금지, 배치로 처리

지나가다 고치면 diff가 오염되어 리뷰가 불가능해진다.
눈에 띈 건 슬라이스 이슈의 체크리스트에 적고 해당 차례에 처리한다.

### P7. 삭제 > 추상화

추상화를 만들기 전에 `npm run knip`. 안 쓰는 코드를 지우는 게 가장 싸고 안전하다.
중복은 **3번째 등장할 때** 추출한다. 2번은 놔둔다.

### P8. 슬라이스마다 안전망을 먼저

손대기 전에 그 영역의 스냅샷을 확보한다. 없으면 리팩토링이 아니라 도박이다.

---

## 2. 안전망 4종

작업 전 순서대로 통과시킨다.

| 종류 | 대상 | 시점 |
| --- | --- | --- |
| `npm run audit:full` | typecheck · eslint · stylelint · knip | 매 커밋 (husky) |
| `npm run test:visual` | 공개 라우트 12개 × 2 viewport | PR마다 |
| 유닛 테스트 | 손댈 `lib`/`utils`/`hooks`의 순수 로직 | 슬라이스 착수 전 보강 |
| 수동 QA 체크리스트 | 시각 회귀가 못 덮는 영역 | 머지 전 |

시각 회귀 baseline은 **리팩토링 시작 전 커밋**에서 찍는다. 그 이후 diff가 나오면 P1 위반이다.

**중요 — 시각 회귀에는 사각지대가 있다.** `/works`·`/posts`·`/posts/[slug]` 는 뷰포트만,
`/design-system` 은 제외, `/admin/*` 은 인증 미셋업으로 전부 미포함이다.
사각지대 목록과 이유는 [perf-baseline.md](perf-baseline.md#커버리지-한계--아래는-시각-테스트로-못-잡는다) 참조.
**그 영역은 수동 QA 체크리스트가 유일한 안전망이므로 슬라이스 착수 시 반드시 작성한다.**

---

## 3. 코드 기준선

Phase 4에서 파일을 분해할 때 목표치. 절대 규칙이 아니라 **넘으면 분해를 검토하는 선.**

| 대상 | 상한 |
| --- | --- |
| 컴포넌트 파일 | 300줄 (한 화면에 안 들어가면 책임이 둘 이상) |
| CSS 모듈 | 500줄 |
| 컴포넌트당 `useState` | 7개 (넘으면 `useReducer` 또는 상태 분리) |
| JSX 중첩 | 5단계 |
| 파일당 export 컴포넌트 | 1개 (아이콘·프리미티브 모음 예외) |

### JSX 구조 규칙

- 조건부 렌더링은 삼항 중첩 금지 → early return 또는 서브컴포넌트로 분리
- `map` 안의 JSX가 5줄 넘으면 컴포넌트로 추출
- props 8개 이상이면 객체로 묶거나 컴포넌트 합성으로 재설계
- 파생 상태를 `useEffect`로 동기화하지 않는다 → 렌더 중 계산 또는 `useMemo`

### 스타일 규칙

기존 [design-system.md](design-system.md)의 4-tier 토큰 규약을 따른다. 추가로:

- CSS 모듈은 담당 컴포넌트와 1:1. 컴포넌트를 쪼개면 CSS도 함께 쪼갠다
- 셀렉터 중첩 3단계 이하
- 미사용 클래스는 슬라이스 완료 시 제거

---

## 4. 실행 계획

### Phase 0 — 기준선 ✅ 완료 (2026-07-23)

- [x] 라우트별 First Load JS 기록 → [perf-baseline.md](perf-baseline.md)
- [x] 공통 shell 380 kB 의 라이브러리별 구성 분석 → Phase 2 타깃 확정
- [x] Playwright 시각 회귀 셋업 + 공개 라우트 13개 × 2 viewport baseline
- [x] `npm run knip` 결과 전량 기록 → [dead-code-inventory.md](dead-code-inventory.md)
- [x] admin 라우트 시각 회귀 16장 (목록 6 + settings 탭 10) — Phase 4-1 안전망 확보
- [ ] 주요 라우트 Lighthouse 점수 (미측정 — 번들 수치로 Phase 2 착수 가능)

**핵심 발견:**

- 최저 라우트(`/_not-found`)조차 First Load JS 380 kB gzip — 모든 페이지가 권장선의 2배에서 시작
- 그중 **gsap 368 kB + framer-motion 계열 551 kB** 가 전 라우트에 무조건 로드됨
- 소스맵 90 MB vs JS 25 MB (`productionBrowserSourceMaps: true`)
- `next.config.ts` 의 `webpack:` 훅과 `@next/bundle-analyzer` 는 Turbopack 빌드에서 죽어 있음
- 선언 안 된 의존성 4개 (`@codemirror/lang-*`, `@lezer/highlight`) — 빌드가 깨질 수 있는 결함
- `/profile` 간헐적 hydration mismatch — 시각 회귀 셋업이 잡아낸 기존 버그

**리팩토링 전에 처리해야 할 결함** (P1 — 별도 이슈/PR):

| 결함 | 위험 |
| --- | --- |
| 선언 안 된 의존성 4개 | lockfile 재생성 시 빌드 실패 |
| `/profile` hydration mismatch | 해당 트리가 클라이언트에서 재생성됨. 리팩토링 중 발생하면 원인이 섞여 추적 불가 |
| `knip.json` entry 오류 (`src/middleware.ts` → `src/proxy.ts`) | ✅ Phase 0에서 수정 |

### Phase 1 — 게이트 구축 (1일)

**현재 baseline** (2026-07-23 측정):

| 게이트 | 현재 | 비고 |
| --- | --- | --- |
| `tsc --noEmit` | ✅ 통과 | |
| `eslint` | 0 error / **435 warning** | 아래 분류 |
| `stylelint` | ✅ 통과 | 하드코딩 값 룰이 이미 작동 중 |
| `type-coverage` | **97.71%** (306,266 / 313,431) | 임계치 97 |
| `knip` | 미사용 파일 5 · export 57 · 타입 20 | [dead-code-inventory.md](dead-code-inventory.md) |
| 시각 회귀 | 26/26 통과 | 공개 라우트 13 × 2 viewport |

eslint warning 435개 분류 — **Phase 4의 실제 작업 목록이다**:

| 개수 | 룰 | 의미 |
| ---: | --- | --- |
| 159 | `react-hooks/set-state-in-effect` | effect 안에서 setState — 파생 상태를 동기화하는 안티패턴. 코드 기준선의 "파생 상태를 effect로 동기화하지 않는다"가 여기 대응 |
| 118 | `react-hooks/refs` | 렌더 중 ref 접근 등 |
| 49 | `react-hooks/immutability` | |
| 29 | `react-hooks/static-components` | 컴포넌트 안에서 컴포넌트 정의 — 매 렌더 재생성 |
| 23 | `react-hooks/preserve-manual-memoization` | |
| 20 | `react-hooks/purity` | 렌더 중 부수효과 |
| 17 | `react-hooks/exhaustive-deps` | |
| 9 | `@typescript-eslint/no-explicit-any` | (전체 `any` 308곳 중 린트가 잡는 것만) |
| 6 | `react-hooks/use-memo` | |
| 5 | `@next/next/no-img-element` | raw `<img>` — Phase 2 이미지 항목 |

**구축 완료:**

- [x] **eslint warning 총량 락** — `eslint --max-warnings 435`. 한 개라도 늘면 CI 실패
- [x] **type-coverage 97 → 97.7 락** + CI 에서 `continue-on-error` 제거해 차단으로 승격
- [x] 룰별 baseline 문서화 (아래 표 = Phase 4 작업 목록)
- [ ] knip 차단 승격 — 미사용 export 57개 정리 후. 선언 안 된 의존성(#373)이 우선
- [ ] 시각 회귀 CI 연결 — 스냅샷이 `-darwin` 접미사라 Linux runner 에서 재사용 불가.
      로컬 실행이 전제이므로 PR 체크리스트로 대신한다

**게이트를 내릴 때의 규칙:** warning 을 줄였거나 커버리지를 올렸으면
`package.json` 의 `--max-warnings` / `--at-least` 도 **같은 PR 에서 함께 조인다.**
안 그러면 다시 후퇴할 여지가 남는다.

**`max-lines` 는 추가하지 않는다.** 300줄 상한을 걸면 수백 개 warning 이 한꺼번에 생겨
총량 락이 무의미해진다. 파일 크기 기준은 위 "코드 기준선"으로 두고 슬라이스마다 사람이 판단한다.

**산출물:** 원칙 P1~P8 중 기계화 가능한 것 전부 자동화.

### Phase 2 — 성능 (2~3일) ⚡ ROI 최고

파일 수는 적고 효과는 가장 크다. 슬라이스 순회보다 먼저 한다.

Phase 0 실측으로 확정된 순서. **수치는 전부 gzip 기준**(= 실제 전송량).

> 소스맵 원본 크기는 압축 전이라 8~10배 크게 보인다. 목표와 성과는 gzip 으로만 말한다.

**완료 — 누적 380.0 → 318.0 kB (−62 kB, −16.3%)**

- [x] **`tailwind-merge` 제거 (−8.9 kB)** — `75a9a185`
- [x] **`site.config.ts` 경계 (−25.6 kB)** — `SiteConfigProvider` 의 context 기본값이 원인. `f98cd849`
- [x] **admin 번역 지연 로드 (−27.5 kB)** — 사전의 66%가 `admin.*`. `e20ed3bf`

**남음**

- [ ] **gsap 격리 (43 kB)** — 단독 chunk 라 분리 자체는 깔끔하나, Lenis rAF 가 `gsap.ticker` 에 묶여 있어 전역 스크롤 구조 변경이 선행돼야 한다. 상세 ↓
- [ ] **framer-motion + motion-dom (55 kB)** — 절감액 최대, 난이도도 최대
- [ ] **client 경계 재설정** — `use client` page.tsx 15개를 서버 컴포넌트로 내리고, 클라이언트 경계를 상호작용이 실제 필요한 리프까지 밀어내기
- [ ] **라우트별 `site.config` 잔여분** — `/posts`·`/profile`·`/privacy` 는 `useCategories.ts` / `data/*.ts` 가 config 를 직접 import 해 여전히 라우트 번들에 싣는다
- [ ] **`PeriodPicker` 라벨을 `admin` 네임스페이스 밖으로** — 공개 컴포넌트가 admin 키를 읽고 있다
- [ ] **라우트별 스플리팅** — `three` / `@react-three` / `mermaid` / `@ffmpeg` / `shiki` / `katex` / `@xyflow/react` / Plate → `next/dynamic`
- [ ] `optimizePackageImports` 에서 미사용 `@tiptap/*` 12개 제거
- [ ] `productionBrowserSourceMaps: true` 재검토 — 소스맵 90 MB, 프로덕션 소스 노출
- [ ] `webpack:` 훅 정리 — Turbopack 빌드에서 무시되므로 `.md` 로더가 turbopack rules 에만 의존 중
- [ ] 이미지: `OptimizedImage`/`ProgressiveImage` 사용률 점검, raw `<img>` 제거

**게이트:** 주요 라우트 First Load JS가 [perf-baseline.md](perf-baseline.md) 대비 감소. PR마다 수치 기재.

**목표:** 공통 shell 380 kB → **280~300 kB**.
`next` 160 kB 는 손댈 수 없어 이론적 하한이 약 200 kB 이고, 그건 framer-motion 을 완전히
제거했을 때의 값이라 비현실적이다. 달성 가능한 선으로 잡는다.

#### 2-1. gsap 격리 — 원인과 접근

**원인:** `src/providers/LenisProvider.tsx` 가 루트 레이아웃에 있는 전역 프로바이더인데
gsap + ScrollTrigger 를 정적 import 한다. Lenis 스크롤과 ScrollTrigger 를 동기화하는 용도
(`gsap.ticker`, `ScrollTrigger.scrollerProxy`, `ScrollTrigger.update`).
이것 하나 때문에 gsap 이 32개 라우트 전부에 실린다.

**까다로운 지점:** Lenis 의 rAF 루프를 `gsap.ticker` 가 돌린다
([LenisProvider.tsx:85-90](../src/providers/LenisProvider.tsx#L85-L90)).
즉 지금 구조에서는 **gsap 없이는 스무스 스크롤 자체가 동작하지 않는다.**
먼저 rAF 를 자체 루프로 바꿔 Lenis 를 gsap 에서 떼어내야 한다.

**gsap 실사용 라우트** (전부 제거는 불가, 아래 라우트는 계속 필요):

| 라우트 | 사용처 |
| --- | --- |
| `/` (home) | `HomeClient` |
| `/about` | `FeaturesPanel` · `ProcessPanel` · `TechStackPanel` · `DesignSystemPanel` · `usePinnedScroll` · `useMobileTabNavigation` · `useMobilePinScroll` · `AboutSection`(useHorizontalScroll) |
| `/works` | `WorksSection` · `CinematicLayout` |
| `/profile` | `ProfileMeSection` (KineticHeroTitle + useHorizontalScroll) |
| `/admin/settings` | `AboutStudio` (KineticHeroTitle) |

**절감 대상 라우트** — gsap 이 전혀 필요 없는 곳:
`/posts` 계열 6개 · `/privacy` · `/design-system` · `/_not-found` · admin 대부분(settings 제외)

`ImageViewer` 는 주석에서만 GSAP 를 언급하고 실제로 쓰지 않는다.

**접근:** ① Lenis rAF 를 `gsap.ticker` → 자체 `requestAnimationFrame` 으로 교체
② ScrollTrigger 연동을 동적 import 로 분리하고 gsap 이 필요한 라우트에서만 활성화

**검증:** `/posts`·`/privacy` 등 gsap 불필요 라우트의 First Load JS 가 43 kB 줄어야 한다.
시각 회귀 40장 전부 통과해야 한다. **다만 스크롤 애니메이션 동작은 정지 스크린샷으로
검증되지 않으므로 수동 QA 가 필수다** — home/about/works/profile 의 스크롤 시퀀스를 직접 확인한다.

### Phase 3 — 구조 (1~2일)

- [ ] **배치 기준 확정 및 문서화**
  - `src/components/ui` — 도메인 무관 프리미티브
  - `src/components/<domain>` — 2개 이상 라우트에서 쓰는 도메인 컴포넌트
  - `src/app/<route>/_components` — 해당 라우트 전용
  - 판단 기준: **사용처가 1곳이면 콜로케이션, 2곳 이상이면 승격**
- [ ] 기준 위반 파일 이동 (import 경로만 바뀌는 순수 이동 PR)
- [ ] 배럴(`index.ts`) 44개 점검 — 트리셰이킹 방해하는 재export 정리
- [ ] `lib` / `utils` / `hooks` / `constants` / `config` 경계 재정의 (현재 중복 의심)

**주의:** 이 Phase는 diff가 거대해 보이지만 내용은 이동뿐이어야 한다. 로직 수정 금지.

### Phase 4 — 도메인 슬라이스 순회 (전체의 70%)

순서: **admin → posts → about/works → 에디터**

각 슬라이스 = GitHub 이슈 1개, 그 안에 300~500줄 단위 PR 여러 개.

#### 4-1. admin (40,586줄 / 100 파일)

`settings/`가 admin의 73%(29,572줄)를 차지한다. 여기가 핵심.

**안전망 확보됨** — 시각 회귀 16장 (목록 6 + settings 탭 10). 착수 전 반드시:

```bash
npm run build && npm run test:visual:admin   # 현재 상태가 baseline 과 같은지 먼저 확인
```

admin baseline 은 **DB 데이터에 의존**한다. 리팩토링 세션 중 글·댓글을 만들면 가짜 diff 가 난다.
데이터가 바뀌었으면 리팩토링 전 상태에서 `-u` 로 다시 찍고 시작한다
([perf-baseline.md](perf-baseline.md#admin-baseline-의-한계--공개-라우트보다-취약하다)).

| 순서 | 대상 | 규모 |
| --- | --- | --- |
| 1 | `settings/Settings.module.css` 분해 | 6,633줄 |
| 2 | `settings/_components/about/AboutStudio.tsx` | 2,508줄 |
| 3 | `settings/_components/ContentTab.tsx` (useState 35) | 2,168줄 |
| 4 | `settings/_components/ServicesTab.tsx` · `AppearanceTab.tsx` | 2,351줄 |
| 5 | `settings/page.tsx` · `SeriesInlineEditor` · `CategoriesEditor` | 2,565줄 |
| 6 | `(dashboard)/page.tsx` + `Dashboard.module.css` | 5,134줄 |
| 7 | `posts/page.tsx` (useState 35) · `works/page.tsx` | 1,741줄 |
| 8 | `components/admin/*` 공통화 | 11,848줄 |

#### 4-2. posts (사용자 화면)

`PostsClient.tsx`(1,972줄, useState 43) 분해가 핵심. `Posts.module.css` 1,937줄 동반.

#### 4-3. about / works

`TroubleshootingPanel`(JSX 중첩 최다) · `WorksSection` · `CylinderLayout`.

#### 4-4. 에디터 (최후)

`PlateEditor.tsx` 3,561줄 / `eslint-disable` 85개 / `RichTextEditor.module.css` 5,184줄.
가장 아프고 가장 어렵다. 앞 슬라이스에서 패턴이 확립된 뒤에 착수한다.

### Phase 5 — 잠금

- [ ] Phase 1 게이트를 warn → error 승격
- [ ] `type-coverage` 최종 임계치 고정
- [ ] 이 문서를 CLAUDE.md에서 참조하도록 연결

---

## 5. PR 규약

- 슬라이스당 이슈 1개, PR 여러 개. PR 본문에 `Refs #N` (슬라이스 완료 PR만 `Closes #N`)
- PR 1개 = 300~500줄 목표
- 커밋 타입: 동작 보존 = `refactor:`, 시각 조정만 = `design:`, 구조 이동 = `refactor:`
- PR 본문 필수 항목:
  - 변경한 축 (JSX / 스타일 / 구조 / 성능 / 타입 중 하나)
  - 시각 회귀 diff 결과
  - 성능 PR인 경우 First Load JS 전/후 수치
