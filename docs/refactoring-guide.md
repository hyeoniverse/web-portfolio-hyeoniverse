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

### 진행 현황 — 각 Phase 를 실행한 PR

> 전체 진행을 추적하는 상위 이슈: **[#388](https://github.com/hyeoniverse/web-portfolio-oval/issues/388)**
> (이 표와 같은 내용을 이슈에서도 본다. 리팩토링 중 발견한 결함도 거기에 모아둔다.)

| Phase | 내용 | 상태 | 실행 PR |
| --- | --- | --- | --- |
| [0](#phase-0) | 기준선·시각 회귀 40장 | ✅ 완료 | [#377](https://github.com/hyeoniverse/web-portfolio-oval/pull/377) |
| [1](#phase-1) | 품질 게이트 | ✅ 완료 | [#380](https://github.com/hyeoniverse/web-portfolio-oval/pull/380) · [#382](https://github.com/hyeoniverse/web-portfolio-oval/pull/382) |
| [2](#phase-2) | shell 번들 −62 kB | ✅ 완료 | [#378](https://github.com/hyeoniverse/web-portfolio-oval/pull/378) · [#382](https://github.com/hyeoniverse/web-portfolio-oval/pull/382) |
| [3](#phase-3) | 구조 조사 (이동 없음) | ✅ 완료 | [#386](https://github.com/hyeoniverse/web-portfolio-oval/pull/386) |
| [4-1](#phase-4) | admin — `Settings.module.css` 정리 | 🔄 진행 중 | [#387](https://github.com/hyeoniverse/web-portfolio-oval/pull/387) (1단계 완료) · [#384](https://github.com/hyeoniverse/web-portfolio-oval/issues/384) |
| [5](#phase-5) | 게이트 잠금 | ⏳ 예정 | — |

**리팩토링 중 발견한 결함** (원칙 P1 — 별도 이슈로 분리):
[#373](https://github.com/hyeoniverse/web-portfolio-oval/issues/373) 미선언 의존성 ·
[#374](https://github.com/hyeoniverse/web-portfolio-oval/issues/374) `/profile` hydration ·
[#385](https://github.com/hyeoniverse/web-portfolio-oval/issues/385) admin baseline (✅ #387 에서 해결)

<a id="phase-0"></a>
### Phase 0 — 기준선 ✅ 완료 (2026-07-23)

> 📋 실행: [PR #377](https://github.com/hyeoniverse/web-portfolio-oval/pull/377)

- [x] 라우트별 First Load JS 기록 → [perf-baseline.md](perf-baseline.md)
- [x] 공통 shell 380 kB 의 라이브러리별 구성 분석 → Phase 2 타깃 확정
- [x] Playwright 시각 회귀 셋업 + 공개 라우트 13개 × 2 viewport baseline
- [x] `npm run knip` 결과 전량 기록 → [dead-code-inventory.md](dead-code-inventory.md)
- [x] admin 라우트 시각 회귀 16장 (목록 6 + settings 탭 10) — Phase 4-1 안전망 확보
- [ ] 주요 라우트 Lighthouse 점수 (미측정 — 번들 수치로 Phase 2 착수 가능)

**핵심 발견:**

- 최저 라우트(`/_not-found`)조차 First Load JS 380 kB gzip — 그중 160.7 kB 는 프레임워크 바닥이고, **앱 코드 219 kB 를 모든 페이지가 무조건 받는다**
- 그 앱 코드의 45%가 애니메이션 라이브러리다 — **gsap 42.9 kB + framer-motion 계열 54.9 kB**(gzip)가 전 라우트에 무조건 로드됨
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

<a id="phase-1"></a>
### Phase 1 — 게이트 구축 ✅ 완료

> 📋 실행: [PR #380](https://github.com/hyeoniverse/web-portfolio-oval/pull/380) · 문서 정정 [PR #382](https://github.com/hyeoniverse/web-portfolio-oval/pull/382)

**요지: 코드 품질이 지금보다 나빠지면 CI 가 막게 만든다.** 코드를 고치는 단계가 아니라
감시 장치를 설치하는 단계다.

#### 무엇이 문제였나

CI 는 typecheck · eslint · stylelint · 유닛 테스트를 모두 돌리고 있었다. 그런데
**eslint 가 실질적으로 아무것도 막지 못했다.**

```
✖ 435 problems (0 errors, 435 warnings)
```

error 가 0 이면 eslint 는 성공으로 끝낸다. CI 는 그 신호만 보고 통과시킨다.
**warning 이 435개든 500개든 초록불이었다는 뜻이다.**

당장은 문제가 없다. 문제는 Phase 4 다. 3,000줄짜리 파일을 쪼개기 시작하면 컴포넌트가
수십 개씩 새로 생기는데, 그때 warning 이 늘어나도 아무도 모른다. 나중에 발견해도
어느 PR 이 원인인지 추적할 수 없다. 원칙 P4 를 적어놓고 정작 그 기계가 놀고 있었다.

#### 무엇을 했나 — 현재 수치를 그대로 상한으로 박았다

```diff
- "lint": "eslint"
+ "lint": "eslint --max-warnings 435"

- "type-coverage": "type-coverage --strict --at-least 97"
+ "type-coverage": "type-coverage --strict --ignore-files \".next/**\" --at-least 97.78"
```

`type-coverage`(타입이 제대로 붙은 비율)는 기준이 97 로 느슨해 0.7%p 후퇴해도 통과했다.
현재 수치에 붙이고, CI 에서 `continue-on-error: true` 였던 것도 제거해 **차단으로 승격**했다.

이제 warning 이 436개가 되거나 커버리지가 97.77% 로 떨어지면 CI 가 실패한다.
**둘 다 실제로 실패하는지 확인했다** — `--max-warnings 434` / `--at-least 97.79` 로
모의 실행해 exit 1 을 검증.

> **함정 하나 — 게이트 기준은 로컬이 아니라 CI 다.**
>
> 처음엔 로컬 수치(97.71%)를 그대로 임계치로 박았는데 **CI 에서 실패했다.**
> 같은 명령이 환경에 따라 다른 값을 냈기 때문이다.
>
> 원인은 두 가지였다.
> 1. `global.d.ts` 에 `declare module "*.css";` 만 있어 CSS Module 의 `styles` 가 **타입 없는 any** 였다.
>    로컬에서는 `next-env.d.ts` 가 참조하는 `.next/types/routes.d.ts` 가 Next 의 CSS 타입을 보충해
>    가려져 있었지만, **빌드하지 않는 CI 에는 그 파일이 없다**
> 2. `.next/**` 의 Next 생성 타입 파일이 분모에 섞여 로컬에서만 수치가 0.07%p 낮았다
>
> `*.module.css` 를 클래스명 맵으로 직접 선언하고 `.next/**` 를 집계에서 제외해
> **로컬과 CI 가 같은 값(97.78%)** 을 내도록 맞췄다.
> 앞으로 게이트를 추가할 때는 **CI 에서 한 번 돌려 값을 확인한 뒤 임계치를 정한다.**

#### 왜 435개를 그대로 두나

지금 다 고치는 건 불가능하다. 대부분(159개) `useEffect` 안에서 `setState` 하는 패턴인데
컴포넌트 구조를 바꿔야 해결된다. **그게 Phase 4 에서 할 일이다.**

그래서 "지금 다 고친다" 가 아니라 **"여기서 더 나빠지지 않게 막는다"** 를 택했다.
계단에 미끄럼 방지 턱을 대는 것에 가깝다. 슬라이스를 돌면서 435 → 400 → 350 으로 내려간다.

> **운영 규칙:** warning 을 줄였으면 `--max-warnings` 도 **같은 PR 에서 함께 내린다.**
> 커버리지를 올렸으면 `--at-least` 도 같이 올린다. 안 그러면 400 으로 줄여놓고
> 다시 435 까지 늘어나는 일이 벌어진다. 개선한 만큼 즉시 잠가야 의미가 있다.

#### 일부러 하지 않은 것

**`max-lines` 룰을 넣지 않았다.** 3,000줄 넘는 파일이 여럿이라 300줄 상한을 켜면
warning 이 수백 개 한꺼번에 생긴다. 그러면 방금 만든 총량 락이 무의미해지고, 새로
유입되는 warning 이 기존 노이즈에 묻힌다. 감시 장치를 만들면서 그 장치를 먹통으로
만드는 셈이다. 파일 크기는 위 "코드 기준선" 으로 두고 슬라이스마다 사람이 판단한다.

**knip 은 보조 신호로 뒀다.** 미사용 export 57개가 남아 있어 지금 차단하면 바로 빨간불이다.
선언 안 된 의존성(#373)이 먼저 해결돼야 한다.

**시각 회귀는 CI 에 연결하지 않았다.** 스냅샷 파일명에 `-darwin` 이 붙어
macOS 에서 찍은 baseline 을 Linux runner 에서 쓸 수 없다. macOS runner 를 쓰거나
Linux 용 baseline 을 따로 관리해야 하는데 둘 다 비용이 크다. 로컬 실행을 전제로 두고
PR 체크리스트로 대신한다.

#### 락한 warning 435개의 정체 — Phase 4 의 실제 작업 목록

| 개수 | 룰 | 무슨 뜻인가 |
| ---: | --- | --- |
| 159 | `react-hooks/set-state-in-effect` | `useEffect` 안에서 `setState` — 다른 상태에서 계산할 수 있는 값을 effect 로 동기화하는 패턴. 렌더가 한 번 더 돈다 |
| 118 | `react-hooks/refs` | 렌더 도중 ref 를 읽거나 쓰는 경우 |
| 49 | `react-hooks/immutability` | 상태를 직접 변경 |
| 29 | `react-hooks/static-components` | 컴포넌트 안에서 컴포넌트를 정의 — 매 렌더마다 새로 만들어져 자식이 통째로 리마운트된다 |
| 23 | `react-hooks/preserve-manual-memoization` | 수동 메모이제이션이 깨지는 패턴 |
| 20 | `react-hooks/purity` | 렌더 중 부수효과 |
| 17 | `react-hooks/exhaustive-deps` | 의존성 배열 누락 |
| 9 | `@typescript-eslint/no-explicit-any` | 명시적 `any` (전체 `any` 308곳 중 린트가 잡는 것만) |
| 6 | `react-hooks/use-memo` | |
| 5 | `@next/next/no-img-element` | raw `<img>` — `next/image` 미사용 |

대부분 React Compiler 대비 룰(`eslint-plugin-react-hooks` v7)이다. 지금은 Compiler 를
쓰지 않지만, 이 항목들이 리팩토링 때 정리할 실질적인 목록이 된다.

#### 착수 시점 게이트 현황 (2026-07-23)

| 게이트 | 값 |
| --- | --- |
| `tsc --noEmit` | 통과 |
| `eslint` | 0 error / 435 warning |
| `stylelint` | 통과 (하드코딩 값 룰이 이미 작동 중) |
| `type-coverage` | 97.71% |
| `knip` | 미사용 파일 5 · export 57 · 타입 20 |
| 시각 회귀 | 40장 (공개 24 + admin 16) |

<a id="phase-2"></a>
### Phase 2 — 성능 (2~3일) ⚡ ROI 최고

> 📋 실행: [PR #378](https://github.com/hyeoniverse/web-portfolio-oval/pull/378) · 문서 정정 [PR #382](https://github.com/hyeoniverse/web-portfolio-oval/pull/382)

파일 수는 적고 효과는 가장 크다. 슬라이스 순회보다 먼저 한다.

Phase 0 실측으로 확정된 순서. **수치는 전부 gzip 기준**(= 실제 전송량).

> 소스맵 원본 크기는 압축 전이라 8~10배 크게 보인다. 목표와 성과는 gzip 으로만 말한다.

**완료 — shell 380.0 → 318.0 kB (−62 kB). 앱 코드로는 219.3 → 157.3 kB (−28.3%)**

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

**목표:** 공통 shell 380 kB → **220~250 kB** (현재 318 kB).

shell 의 절반은 손댈 수 없는 바닥이다 — React 19 + Next 16 런타임이 **160.7 kB**.
빈 프로젝트를 새로 만들어도 여기서 시작한다.

그래서 판단 기준은 **앱 코드(= shell − 160.7)** 다. 착수 시점 219 kB → 현재 157 kB 인데,
그중 gsap(42.9)과 framer-motion 계열(54.9)이 **97.8 kB, 62%** 를 차지한다.
둘을 필요한 라우트로 격리하면 앱 코드가 59 kB 로 줄어 총 220 kB 가 된다.

> 흔히 인용되는 "First Load JS 100~200 kB" 기준은 이 프로젝트에 적용되지 않는다.
> 그 수치는 프레임워크를 포함한 총량이고 Next 13~15 시절 기준이라, 바닥이 160.7 kB 인
> 여기서는 도달 불가능하다. 자세한 근거는 [perf-baseline.md](perf-baseline.md#이-프로젝트에서-적당한-크기란) 참조.

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

<a id="phase-3"></a>
### Phase 3 — 구조 ✅ 조사 완료, **파일 이동은 하지 않는다**

> 📋 실행: [PR #386](https://github.com/hyeoniverse/web-portfolio-oval/pull/386)

> **Phase 3 이란:** 파일이 올바른 위치에 있는지(폴더 배치·`lib`/`utils` 경계·배럴)만 보는 단계다.
> 코드 로직은 건드리지 않는다. 아래 "배치 기준" 은 앞으로 새 파일을 어디 둘지 판단할 때 쓴다 —
> CSS/스타일 규칙은 [design-system.md](design-system.md) 와 짝을 이룬다.

착수 전 실측해보니 **고칠 게 거의 없었다.** 계획 단계에서 "중복 의심" 이라고 적어둔 것들이
실제로는 대체로 지켜지고 있었다. diff 만 크고 이득 없는 이동은 하지 않는다.

#### 배치 기준 (확정)

| 위치 | 용도 |
| --- | --- |
| `src/components/ui` | 도메인 무관 프리미티브 |
| `src/components/<domain>` | **2개 이상 라우트**에서 쓰는 도메인 컴포넌트 |
| `src/app/<route>/_components` | 해당 라우트 전용 |

**판단 기준: 쓰는 라우트가 1곳이면 콜로케이션, 2곳 이상이면 승격.**

"파일 하나에서만 import 되면 콜로케이션" 이 아니다. 부모 컴포넌트를 쪼개서 생긴 자식은
사용처가 1곳이어도 그 자리가 맞다. **라우트 단위로 센다.**

#### 실측 결과 — 위반 없음

| 도메인 | 쓰는 라우트 | 판단 |
| --- | --- | --- |
| `about` | about · admin | 공유 정당 |
| `works` | works · admin | 공유 정당 |
| `posts` | posts · admin · works · design-system | 정당 |
| `layout` | 거의 전 라우트 | 정당 |
| `effects` | home · about · design-system | 정당 |
| `admin` | admin · design-system | 정당 (design-system 은 전시용) |

#### `lib` vs `utils` — 이미 갈려 있다

| | 서버 의존 파일 | 성격 |
| --- | ---: | --- |
| `src/lib` | 7개 (Supabase · env · `next/headers`) | 데이터 접근 · 외부 서비스 · 도메인 로직 |
| `src/utils` | **0개** | 순수 함수 |

`lib` 에 순수 함수가 일부 섞여 있지만(`dedupe` · `koSearch` · `categoryTree` 등)
옮겨봐야 import 경로만 바뀐다. **슬라이스에서 그 파일을 손댈 때 함께 정리한다.**

#### 배럴 — 손댈 것 없음

`index.ts` 44개 중 대부분이 `components/ui/<Component>/index.ts` 형태로 정상 패턴이다.
`utils/index.ts` 는 5줄에 re-export 2개뿐이고, 실제로도 배럴 경로(9곳)보다
개별 경로(95곳)로 훨씬 많이 쓴다. 트리셰이킹을 방해할 규모가 아니다.

#### 상수·타입 정리는 "기준만 여기서, 이동은 Phase 4 에서"

현재 상태를 보면 이렇다.

| | |
| --- | --- |
| `src/constants/` | 116줄 4파일 |
| 코드 전역에 흩어진 대문자 상수 export | **130곳** |
| `src/types/` | 615줄 9파일 |

`constants/` 디렉토리가 사실상 제 역할을 못 하고 있으니 "지금 다 모으자" 가 답 같지만,
**그러면 두 번 일하게 된다.**

Phase 4 에서 `PostsClient.tsx`(1,972줄) · `AboutStudio.tsx`(2,508줄) 같은 파일을 쪼개면
그 안에 박힌 상수와 타입도 함께 재배치된다. 지금 미리 옮겨놔도 그때 또 움직여야 한다.

**따라서:**

- **Phase 3 에서는 배치 기준만 정한다** — 한 파일에서만 쓰면 그 파일 안에,
  한 도메인이면 도메인 폴더, 진짜 전역이면 `constants/` · `types/`
- **실제 이동은 Phase 4 에서 파일을 쪼갤 때 함께 한다** — 어차피 그 파일을 손대고 있으니
  추가 비용이 거의 없다
- 미사용 타입 20개 삭제도 슬라이스에서 처리 ([dead-code-inventory.md](dead-code-inventory.md) E)

원칙 P6(보이스카웃 금지)과도 맞는다. 지나가다 상수를 하나씩 옮기면 diff 가 오염된다.

<a id="phase-4"></a>
### Phase 4 — 도메인 슬라이스 순회 (전체의 70%)

> 📋 실행: [PR #387](https://github.com/hyeoniverse/web-portfolio-oval/pull/387) (4-1 admin, 진행 중)

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

<a id="phase-5"></a>
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
