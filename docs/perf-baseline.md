# 성능 baseline

**리팩토링이 번들 크기를 키우지 않았는지 판단하는 기준을 담은 문서다.**
화면이 깨지지 않았는지는 스모크 e2e 가 본다([testing.md](testing.md#e2e-playwright)).

성능 작업을 할 때는 [refactoring-guide.md](refactoring-guide.md) 의 원칙 P3 에 따라
**여기 적힌 수치에 대고 전/후를 비교**하고 그 결과를 PR 에 적는다.

### 어디를 보면 되나

| 하려는 일 | 볼 곳 |
| --- | --- |
| 번들이 커졌는지/작아졌는지 확인 | [라우트별 First Load JS](#라우트별-first-load-js) · [Phase 2 진행 결과](#phase-2-진행-결과) |
| "이 정도면 큰 건가?" 판단 | [이 프로젝트에서 "적당한 크기"란](#이-프로젝트에서-적당한-크기란) |
| 다음에 뭘 줄일지 고르기 | [공통 shell 의 구성](#착수-시점-공통-shell-380-kb-의-구성) · [Phase 2 타깃](#phase-2-타깃-gzip-절감-순) |
| 화면이 깨졌는지 검사 | [testing.md](testing.md#e2e-playwright) |

### 이 문서의 수치를 읽는 법

- **모든 크기는 gzip 기준**이다 (= 실제로 네트워크를 타는 양).
  소스맵의 원본 크기는 압축 전이라 8~10배 크게 보이므로 목표·성과에 쓰지 않는다
- **"착수 시점" 표는 갱신하지 않는다.** 비교 기준이므로 고정해두고,
  개선 성과는 [Phase 2 진행 결과](#phase-2-진행-결과) 에 누적한다

### 측정 조건

| | |
| --- | --- |
| 측정일 | 2026-07-23 |
| 기준 커밋 | `878560ab` (현재는 master 에 머지됨) |
| 명령 | `npx next build --experimental-analyze` |
| 환경 | Next.js 16.2.11 (Turbopack), Node 23.10.0, darwin |
| gzip 계산 | `firstLoadChunkPaths` 의 각 chunk 를 gzip -9 로 압축해 합산 |

## 번들을 측정할 때 — `npm run analyze` 를 쓰면 안 된다

`package.json` 에 `analyze` 스크립트가 있지만 **이 프로젝트에서는 아무것도 만들어내지 않는다.**
실행해도 조용히 끝나서 "분석이 안 되나 보다" 하고 넘어가기 쉽다.

이유는 이렇다. 그 스크립트는 `@next/bundle-analyzer` 를 쓰는데, 이건 **webpack 플러그인**이다.
그런데 Next 16 부터 `next build` 는 **Turbopack 이 기본**이라 webpack 설정 자체를 타지 않는다.
같은 이유로 `next.config.ts` 의 `webpack:` 훅도 죽어 있다.

→ Turbopack 전용 플래그를 쓴다:

```bash
npx next build --experimental-analyze
# 산출물: .next/diagnostics/route-bundle-stats.json
#         .next/diagnostics/analyze/
```

## 라우트별 First Load JS

`shell 초과분` = 전 라우트 공통 shell(380 kB)을 뺀, 그 라우트만의 비용.

| 라우트 | gzip (kB) | 비압축 (MB) | shell 초과분 (kB) |
| --- | ---: | ---: | ---: |
| /admin/settings | 1578 | 5.10 | 1198 |
| /design-system | 950 | 3.34 | 570 |
| /admin/works/[id]/edit | 824 | 2.86 | 444 |
| /admin/works/new | 823 | 2.86 | 443 |
| /posts/[slug] | 783 | 2.77 | 404 |
| /admin/works/preview | 783 | 2.77 | 404 |
| /admin/posts/preview | 776 | 2.74 | 396 |
| /works/[slug] | 774 | 2.74 | 394 |
| /admin/posts/[id]/edit | 774 | 2.76 | 394 |
| /admin/posts/new | 773 | 2.76 | 393 |
| /profile | 650 | 2.24 | 270 |
| /admin | 550 | 1.80 | 171 |
| /privacy | 537 | 1.84 | 157 |
| /admin/posts/series/[id]/edit | 537 | 1.80 | 157 |
| /admin/posts/series/new | 536 | 1.80 | 157 |
| /admin/login | 524 | 1.69 | 144 |
| /admin/posts | 499 | 1.67 | 120 |
| /admin/works | 496 | 1.65 | 116 |
| /admin/notifications | 479 | 1.60 | 99 |
| /admin/comments | 476 | 1.59 | 96 |
| /admin/reports | 466 | 1.55 | 87 |
| /posts | 463 | 1.48 | 83 |
| /posts/history | 463 | 1.48 | 83 |
| /posts/tags/[tag] | 438 | 1.39 | 58 |
| /about | 429 | 1.34 | 49 |
| /works | 406 | 1.28 | 26 |
| /posts/series | 398 | 1.26 | 18 |
| /posts/tags | 398 | 1.26 | 18 |
| /posts/categories | 393 | 1.24 | 14 |
| / | 386 | 1.21 | 6 |
| /admin/denied | 381 | 1.20 | 1 |
| /_not-found | 380 | 1.20 | 0 |

### 이 프로젝트에서 "적당한 크기"란

흔히 인용되는 **"First Load JS 100~200 kB"** 기준을 이 프로젝트에 그대로 대면 안 된다.
그 수치는 React·프레임워크를 **포함한 총량**이고 대개 Next 13~15 시절 기준인데,
**Next 16 + React 19 는 바닥 자체가 160.7 kB 다** (아래 참고). 빈 프로젝트를 새로 만들어도
여기서 시작하므로, 100~200 kB 는 도달할 수 없는 목표다.

**앱 코드(= 총량 − 프레임워크 바닥)를 기준으로 판단한다.**

| | 값 |
| --- | ---: |
| 프레임워크 바닥 (React + Next, 손댈 수 없음) | 160.7 kB |
| 착수 시점 shell | 380.0 kB → 앱 코드 **219 kB** |
| 최저 라우트(`/_not-found`)조차 | 380 kB |

즉 문제는 "380 이 크다"가 아니라 **모든 페이지가 앱 코드 219 kB 를 무조건 받는다**는 것이다.

## 착수 시점 공통 shell 380 kB 의 구성

> 아래는 **착수 시점(380 kB) 기준**이다. 현재 값은 318 kB —
> 어떻게 줄었는지는 [Phase 2 진행 결과](#phase-2-진행-결과) 참조.

전 32개 라우트에 예외 없이 로드되는 20개 chunk.

> **원본 크기와 gzip 을 혼동하지 말 것.** 소스맵 `sourcesContent` 기준 원본 크기는 압축 전이라
> 실제 전송량보다 8~10배 크게 보인다. **개선 효과는 gzip 열로 판단한다.**
> (gzip 열 = chunk 의 실측 gzip 크기를 그 chunk 안 모듈의 원본 비중대로 배분한 추정치)

| gzip | 비중 | 원본 | 모듈 | 메모 |
| ---: | ---: | ---: | --- | --- |
| 160 kB | 42.2% | 1753 kB | `next` | 프레임워크. 대상 아님 |
| **43 kB** | 11.3% | 368 kB | `gsap` | **단독 chunk.** home/about/works/profile 전용인데 전 라우트 로드 |
| 39 kB | 10.2% | 397 kB | `motion-dom` | framer-motion 런타임 |
| 26 kB | 6.7% | 80 kB | `src/config/site.config.ts` | 설정 파일이 클라이언트 번들에 통째로 |
| 24 kB | 6.4% | 63 kB | `src/locales/en.json` | |
| 19 kB | 5.0% | 50 kB | `src/locales/ko.json` | **두 언어 동시 로드** |
| 16 kB | 4.3% | 154 kB | `framer-motion` | |
| 12 kB | 3.1% | 80 kB | `src/components/layout` | Navigation 등 |
| 9 kB | 2.3% | 128 kB | `tailwind-merge` | CSS Modules 기반인데 전 라우트 로드 |
| 4 kB | 1.1% | 30 kB | `@swc/helpers` | |
| 4 kB | 1.0% | 26 kB | `src/components/ui` | |

### Phase 2 타깃 (gzip 절감 순)

| 순위 | 타깃 | 절감 상한 | 난이도 |
| --- | --- | ---: | --- |
| 1 | **gsap 격리** | 43 kB | 낮음 — 단독 chunk 라 깔끔히 분리됨 |
| 2 | **framer-motion + motion-dom** | 55 kB | 높음 — 페이지 전환·홈 애니메이션에 광범위하게 쓰임 |
| 3 | **locales 언어별 분리** | ~20 kB | 중간 — 두 언어 중 하나만 로드 |
| 4 | **site.config.ts 경계** | 26 kB | 중간 — 서버 전용 필드가 클라이언트로 새는지 확인 |
| 5 | **tailwind-merge** | 9 kB | 낮음 — 실사용처 확인 후 `clsx` 대체 검토 |

#### `next` 160.7 kB 의 정체 — 여기가 바닥이다

| 내용 | gzip |
| --- | ---: |
| `next/compiled/react-dom` (React 19) | 62.9 kB |
| `next/compiled/react` | 7.2 kB |
| Next 클라이언트 런타임 (라우터 · RSC · 하이드레이션) | ~90.6 kB |
| **합계** | **160.7 kB** |

페이지를 하나도 안 만들어도 깔리는 값이다. **줄일 수 있는 대상이 아니다.**

#### 목표 — 220~250 kB

앱 코드에서 gsap(42.9)과 framer-motion 계열(54.9)이 **97.8 kB, 62%** 를 차지한다.
둘 다 전 라우트에 필요하지 않으므로 격리하면:

```
380 kB  착수 시점
−62     Phase 2 완료분 (tailwind-merge · site.config · admin 번역)
─────
318 kB  현재
−43     gsap 격리
−55     framer-motion 격리
─────
220 kB  ← 현실적 하한 (그중 160.7 이 프레임워크, 앱 코드 59 kB)
```

앱 코드 59 kB 는 이 규모 사이트에서 건강한 수준이다.
여유를 두어 **목표는 220~250 kB** 로 잡는다.

### 그 외 확인된 낭비

- **소스맵 90 MB vs JS 25 MB** — `productionBrowserSourceMaps: true`.
  배포 산출물이 3.6배가 되고, 프로덕션 소스가 그대로 노출된다. Phase 2에서 재검토
- `next.config.ts` 의 `optimizePackageImports` 에 **미사용 `@tiptap/*` 12개** 잔재 (의존성에 없음)
- `next.config.ts` 의 `webpack:` 훅 — Turbopack 빌드에서 무시됨 (`.md` asset/source 룰이 죽어 있음)

## Phase 2 진행 결과

> 위 baseline 표는 **착수 시점 기준선이므로 갱신하지 않는다.** 성과는 여기에 누적한다.

| 단계 | 공통 shell | 앱 코드 (shell − 160.7) | 변화 |
| --- | ---: | ---: | ---: |
| 기준선 | 380.0 kB | 219.3 kB | — |
| tailwind-merge 제거 | 371.1 kB | 210.4 kB | −8.9 |
| SiteConfigProvider 기본값 제거 | 345.5 kB | 184.8 kB | −25.6 |
| admin 번역 지연 로드 | **318.0 kB** | **157.3 kB** | −27.5 |

**누적 −62.0 kB.** shell 기준 −16.3% 지만, **판단 기준인 앱 코드로는 −28.3%** 다
(219.3 → 157.3). 32개 라우트 전부에 적용되고 라우트 평균 −53.5 kB.

| 라우트 | 전 | 후 | Δ |
| --- | ---: | ---: | ---: |
| /admin/settings | 1578 | 1542 | −36 |
| /design-system | 950 | 889 | −61 |
| /posts/[slug] | 783 | 747 | −36 |
| /works/[slug] | 774 | 712 | −62 |
| /profile | 650 | 614 | −36 |
| /privacy | 537 | 501 | −36 |
| /posts | 463 | 427 | −36 |
| /about | 429 | 367 | −62 |
| /works | 406 | 344 | −62 |
| / | 386 | 324 | −62 |
| /_not-found | 380 | 318 | −62 |

−36 kB 그룹과 −62 kB 그룹으로 갈리는 이유: `/posts`·`/profile`·`/privacy`·`/posts/[slug]` 는
`useCategories.ts` / `data/privacy.ts` / `data/profile.ts` 가 `site.config` 를 직접 import 해
라우트 번들에 따로 싣기 때문이다. 이들에서 필요한 값만 추리는 건 남은 작업.

### 세 건 모두 "쓰지 않는 것을 전 라우트가 받고 있던" 문제였다

- `cn()` 의 `twMerge` — CSS Modules 프로젝트라 병합할 Tailwind 클래스가 없었다
- `SiteConfigProvider` 의 context **기본값** — Provider 가 `<body>` 전체를 감싸 한 번도 안 쓰였다
- `admin.*` 번역 — 사전의 66%인데 방문자는 쓰지 않는다

기능을 줄인 게 아니라 **죽은 비용을 걷어낸 것**이라 당시의 시각 회귀 스냅샷 40장이 전부 그대로 통과했다.

### 검증에서 배운 것

`/design-system` 이 `PeriodPicker` 를 전시하는데 그 컴포넌트가 라벨을 `admin.settings.profile.*`
키로 읽는다. admin 사전을 지연 로드로 돌리자 이 페이지에서 번역 키가 노출될 상황이었는데,
**`/design-system` 은 당시 시각 회귀에서 제외한 페이지라 자동으로 잡히지 않았다.**
`grep` 으로 admin 키 사용처를 훑다가 발견했다.

→ 이후 번역·설정처럼 **전역 사전을 건드리는 변경은 자동 테스트만 믿지 말고**
아래처럼 키 누출을 직접 확인한다.

```js
// 각 라우트에서 실행 — 번역 누락 시 getNestedValue 가 키를 그대로 반환한다
document.body.innerText.match(/\b(admin|editor)\.[a-zA-Z0-9_.]+/g)
```

## 화면 안전망

번들 측정과 함께 쓰던 픽셀 단위 시각 회귀 테스트는 없앴다. '변경 OK · 깨짐만 방지' 방침과 맞지 않았고, 스냅샷을 갱신하지 않아 기준이 낡았다. 지금은 픽셀 비교 없이 로드 · 런타임 에러 · 에러 바운더리 · 빈 화면만 보는 스모크 e2e 를 쓴다. 대상 라우트와 실행 방법은 [testing.md](testing.md#e2e-playwright) 에 있다.

알려진 결함 하나가 스모크의 허용 목록에 있다. `/profile` 은 가끔 hydration mismatch(`Hydration failed because the server rendered text didn't match the client`)를 낸다. 원인은 아직 특정하지 못했다. `e2e/routes.ts` 의 `knownPageErrors` 로 걸러 두었고, 고치면 그 항목을 지운다.
