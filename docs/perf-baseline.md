# 성능 baseline

**리팩토링이 무언가를 망가뜨리지 않았는지 판단하는 두 가지 기준을 담은 문서다.**
하나는 번들 크기, 다른 하나는 화면 스크린샷이다.

성능 작업을 할 때는 [refactoring-guide.md](refactoring-guide.md) 의 원칙 P3 에 따라
**여기 적힌 수치에 대고 전/후를 비교**하고 그 결과를 PR 에 적는다.

### 어디를 보면 되나

| 하려는 일 | 볼 곳 |
| --- | --- |
| 번들이 커졌는지/작아졌는지 확인 | [라우트별 First Load JS](#라우트별-first-load-js) · [Phase 2 진행 결과](#phase-2-진행-결과) |
| "이 정도면 큰 건가?" 판단 | [이 프로젝트에서 "적당한 크기"란](#이-프로젝트에서-적당한-크기란) |
| 다음에 뭘 줄일지 고르기 | [공통 shell 의 구성](#착수-시점-공통-shell-380-kb-의-구성) · [Phase 2 타깃](#phase-2-타깃-gzip-절감-순) |
| 화면이 바뀌었는지 검사 | [시각 회귀 baseline](#시각-회귀-baseline) |
| admin 화면 검사 셋업 | [admin 시각 회귀](#admin-시각-회귀-phase-4-1-안전망--baseline-확보) |
| 스크린샷이 이상하게 나올 때 | [셋업 과정에서 부딪힌 것](#셋업-과정에서-부딪힌-것-같은-함정-반복-방지) |

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

기능을 줄인 게 아니라 **죽은 비용을 걷어낸 것**이라 시각 회귀 40장이 전부 그대로 통과했다.

### 검증에서 배운 것

`/design-system` 이 `PeriodPicker` 를 전시하는데 그 컴포넌트가 라벨을 `admin.settings.profile.*`
키로 읽는다. admin 사전을 지연 로드로 돌리자 이 페이지에서 번역 키가 노출될 상황이었는데,
**`/design-system` 은 시각 회귀에서 제외한 페이지라 자동으로 잡히지 않았다.**
`grep` 으로 admin 키 사용처를 훑다가 발견했다.

→ 이후 번역·설정처럼 **전역 사전을 건드리는 변경은 시각 회귀만 믿지 말고**
아래처럼 키 누출을 직접 확인한다.

```js
// 각 라우트에서 실행 — 번역 누락 시 getNestedValue 가 키를 그대로 반환한다
document.body.innerText.match(/\b(admin|editor)\.[a-zA-Z0-9_.]+/g)
```

## Lighthouse

미측정. `next start` 기동 후 주요 5개 라우트에 대해 별도 기록 예정.

## 스모크 e2e

> 원래 픽셀 단위 시각 회귀였으나, '변경 OK·깨짐만 방지' 방침과 안 맞고(baseline 갱신을 안 해 stale 이 됨) 노이즈가 커서 **스모크 e2e 로 교체**했다. 픽셀 비교 없이 로드·런타임 에러·에러 바운더리·빈 화면만 잡는다.

- 설정: [playwright.config.ts](../playwright.config.ts) · 스펙: [e2e/smoke.spec.ts](../e2e/smoke.spec.ts) · 대상: [e2e/routes.ts](../e2e/routes.ts)
- 공개 라우트 12개 × desktop(1440×900) / mobile(Pixel 7) = **24 검증**, ~22초

```bash
npm run test:smoke          # 공개 라우트
```

### 셋업 과정에서 부딪힌 것 (같은 함정 반복 방지)

1. **`LoadingScreen` 이 baseline 을 오염시킨다**
   전 페이지를 덮는 로딩 스크린이 로딩 완료 후 500ms 페이드아웃하고 언마운트된다
   (`/privacy` 만 skip 대상). 이걸 안 기다리면 **"검은 화면 + 로고" 상태가 baseline 으로 박힌다.**
   → `[class*="loadingScreen"]` 이 detached 될 때까지 대기
2. **`waitUntil: "networkidle"` 은 안 끝난다**
   three.js·폴링이 도는 페이지에서 30초 타임아웃. `load` + 자체 안정화로 대체
3. **fullPage 높이가 실행마다 다르다**
   lazy 콘텐츠 때문에 최대 200px 씩 흔들려 diff 가 아니라 크기 불일치로 실패
   → `scrollHeight` 가 3회 연속 같을 때까지 폴링
4. **`animations: "disabled"` 는 CSS 애니메이션만 끈다**
   framer-motion/GSAP 기반 전환은 안 꺼진다. `reducedMotion` 도 앱이 존중해야 효과가 있다
5. **`mask` 는 대상 "위에" 사각형을 덮는다 — 아래 콘텐츠까지 사라진다**
   WebGL canvas 를 `mask` 로 처리했더니 `/profile` 의 전체 화면 canvas 때문에
   **baseline 이 통째로 마젠타 단색(5.8 kB)** 이 됐다. 테스트는 통과하지만 아무것도 검증하지 못한다.
   → `visibility: hidden` 으로 전환. 레이아웃 공간은 유지한 채 내용만 숨겨 주변 콘텐츠가 남는다
6. **Next.js 개발 오버레이 배지가 찍힌다**
   감지된 이슈 개수에 따라 `N` ↔ `1 Issue` 로 모양이 바뀌어 그 자체가 diff 를 만든다
   → `nextjs-portal` 등을 `display: none`
7. **자동 회전 캐러셀과 툴팁**
   `/posts` 상단 `PostsBanner` 는 슬라이드가 자동으로 넘어가 캡처마다 다른 화면이 잡힌다.
   `Tooltip`("Enable BGM" 등)도 캡처 시점에 따라 떴다 사라진다 → 둘 다 가림
8. **픽셀 완전 일치는 이 사이트에서 원리적으로 불안정하다**
   마퀴·GSAP·three.js 가 상시 도는 페이지가 많다. `maxDiffPixelRatio` 를 올려 흡수하면
   작은 컴포넌트 회귀까지 같이 놓치므로, **임계치는 조인 채로 `retries: 2` 로 흔들림만 걸러낸다.**
   재시도 후에도 실패하면 진짜 diff 다

> **교훈: 통과하는 시각 테스트가 반드시 검증하고 있다는 뜻은 아니다.**
> baseline 을 만든 뒤에는 스냅샷을 **눈으로 열어봐야 한다.** 위 1번(로딩 화면)과 5번(단색)은
> 둘 다 "테스트는 초록불인데 실제로는 아무것도 안 보는" 상태였고, 파일 크기가 이상하게
> 작은 걸 보고서야 발견했다.

### 커버리지 한계 — 아래는 시각 테스트로 못 잡는다

| 라우트 | 제한 | 이유 |
| --- | --- | --- |
| `/works` | 뷰포트만 + 스크롤 안 함 | GSAP 스크롤 시퀀스가 모바일에서 라우팅까지 트리거해 캡처 중 페이지가 바뀜 |
| `/posts` | 배너·사이드바 마스킹 | 상단 `PostsBanner` 가 자동 회전 캐러셀, 사이드바는 랜덤 추천·최근 댓글 (`RandomPosts` 가 `PopularPosts.module.css` 를 공유해 분리 불가). 카드 목록은 검증됨 |
| `/posts/[slug]` | 뷰포트만 | 본문 lazy 이미지·코드 하이라이트가 모바일에서 늦게 붙음 |
| `/design-system` | **완전 제외** | 2만 px 초장문 + 인터랙티브 데모(useState 59개). fullPage 도 뷰포트도 안정화 실패 |
| `/admin/*` | baseline 확보 (16장) | 단 DB 데이터에 의존 — 아래 한계 참고 |

→ 위 라우트의 하단 영역은 **수동 QA 체크리스트로 커버**한다.

### admin 시각 회귀 (Phase 4-1 안전망) ✅ baseline 확보

**16장, 검증 2회 연속 16/16 통과.** 스펙 [e2e/admin.spec.ts](../e2e/admin.spec.ts) ·
로그인 셋업 [e2e/auth.setup.ts](../e2e/auth.setup.ts)

| 그룹 | 라우트 |
| --- | --- |
| 목록·대시보드 (6) | `/admin` · `/admin/posts` · `/admin/works` · `/admin/comments` · `/admin/notifications` · `/admin/reports` |
| settings 탭 (10) | `?tab=general` · `?tab=content&sub=` {home, profile, about, works, posts, calendars} · `?tab=appearance` · `?tab=services` · `?tab=account` |

settings 를 탭별로 쪼갠 이유: admin 의 73%(29,572줄)가 settings 이고 Phase 4-1 대상 파일
(`AboutStudio` 2,508 · `ContentTab` 2,168 · `ServicesTab` 1,447 · `AppearanceTab` 904)이
각 탭에 흩어져 있다. URL 하나로는 General 탭만 잡혀 안전망이 되지 못한다.
`?tab=` / `?sub=` 로 주소 지정이 가능해 탭별 캡처가 된다 (16장 전부 해시가 달라 실제로 다른 화면임을 확인).

편집 화면(`/admin/posts/new` 등)은 Plate 에디터라 캡처가 불안정하고 Phase 4-4 대상이라 제외.

#### admin baseline 의 한계 — 공개 라우트보다 취약하다

- **실제 DB 데이터에 의존한다.** 글을 쓰거나 댓글·알림이 쌓이면 그 자체로 diff 가 난다.
  → **리팩토링 세션 중에는 admin 으로 데이터를 만들지 않는다.** 데이터가 바뀌었으면
  리팩토링 전 상태에서 `-u` 로 다시 찍고 시작한다
- `/admin/reports` 는 현재 데이터가 없어 **빈 상태만 검증**한다 (42 kB). 목록 렌더링 회귀는 못 잡는다
- 스냅샷에 **소유자 이메일과 사이트 설정값이 그대로 담긴다.** 현재 리포지토리가 private 이라
  문제 없지만, **public 으로 전환한다면 이 스냅샷들을 먼저 정리해야 한다**

**로그인에 보안 게이트가 두 겹 있다:**

1. Supabase 이메일/비밀번호
2. **새 기기(UA fingerprint) 승인** — 처음 보는 기기면 즉시 `signOut` 하고 승인 메일을 보낸다
   ([api/admin/auth/route.ts](../src/app/api/admin/auth/route.ts))

2번은 최초 1회만 통과시키면 되고, 이후에는 세션을 `e2e/.auth/admin.json` 에 저장해 재사용한다.
fingerprint 는 UA 기반이라 같은 Playwright 브라우저를 쓰는 한 재승인이 필요 없다.
**이 파일에는 인증 토큰이 들어 있어 `.gitignore` 대상이다.**

**계정은 소유자(`OWNER_EMAIL`)를 쓴다.** 전용 계정을 새로 만들면 `app_metadata` 가 비어 있어
role 이 없고(`getUserRole` → level 0) admin 접근이 거부된다. 쓰려면 service role 로
`app_metadata.role` 을 심거나 초대 절차를 거쳐야 해서 오히려 손이 더 간다.

**실물 이메일은 필요 없다.** 승인 링크가 하는 일은 `admin_known_devices.approved` 를
`true` 로 바꾸는 것뿐이고, 기기 판정도 그 컬럼만 본다 — Table Editor 에서 직접 토글하면 된다.

```bash
# 1. .env.local 에 credential 추가
#    E2E_ADMIN_EMAIL=<OWNER_EMAIL 과 동일>
#    E2E_ADMIN_PASSWORD=...
# 2. 첫 실행 — "승인 대기" 로 실패한다 (정상)
npm run test:smoke:admin
# 3. Supabase Table Editor → admin_known_devices → 방금 생긴 row 의 approved 를 true 로
#    (또는 메일함의 승인 링크 클릭)
# 4. baseline 생성
npm run test:smoke:admin -- -u
```

> `.env.local` 에 관리자 비밀번호가 평문으로 들어간다. 같은 파일의 `SUPABASE_SERVICE_ROLE_KEY`
> (사실상 DB 전권) 보다 민감도가 낮고 파일은 git 에서 제외되지만, **비밀번호를 변경하면
> `.env.local` 도 함께 갱신**해야 한다. 시각 회귀는 페이지를 열기만 하므로 데이터는 바꾸지 않는다.

### 알려진 결함 (착수 전부터 존재)

- **`/profile` 간헐적 hydration mismatch**
  `Hydration failed because the server rendered text didn't match the client`
  3회 중 1~2회 재현. 원인 미특정 (three.js 씬의 `Math.random` 은 canvas 라 텍스트와 무관).
  `e2e/routes.ts` 의 `knownPageErrors` 로 허용 처리 중 — **수정 후 그 항목을 제거할 것.**

### baseline 스냅샷 인덱스

`e2e/visual.spec.ts-snapshots/` — **24장 / 6.9 MB**, 리포지토리에 커밋해 비교 기준으로 쓴다.
파일명 규칙: `<name>-<project>-darwin.png` (`name` 은 `e2e/routes.ts` 의 라우트 이름).

| 라우트 | desktop (1440×900) | mobile (Pixel 7) | 캡처 범위 |
| --- | --- | --- | --- |
| `/` | [home-desktop](../e2e/visual.spec.ts-snapshots/home-desktop-darwin.png) | [home-mobile](../e2e/visual.spec.ts-snapshots/home-mobile-darwin.png) | 전체 |
| `/about` | [about-desktop](../e2e/visual.spec.ts-snapshots/about-desktop-darwin.png) | [about-mobile](../e2e/visual.spec.ts-snapshots/about-mobile-darwin.png) | 전체 |
| `/works` | [works-desktop](../e2e/visual.spec.ts-snapshots/works-desktop-darwin.png) | [works-mobile](../e2e/visual.spec.ts-snapshots/works-mobile-darwin.png) | 뷰포트 |
| `/posts` | [posts-desktop](../e2e/visual.spec.ts-snapshots/posts-desktop-darwin.png) | [posts-mobile](../e2e/visual.spec.ts-snapshots/posts-mobile-darwin.png) | 전체 + 배너·사이드바 마스킹 |
| `/posts/categories` | [posts-categories-desktop](../e2e/visual.spec.ts-snapshots/posts-categories-desktop-darwin.png) | [posts-categories-mobile](../e2e/visual.spec.ts-snapshots/posts-categories-mobile-darwin.png) | 전체 |
| `/posts/series` | [posts-series-desktop](../e2e/visual.spec.ts-snapshots/posts-series-desktop-darwin.png) | [posts-series-mobile](../e2e/visual.spec.ts-snapshots/posts-series-mobile-darwin.png) | 전체 |
| `/posts/tags` | [posts-tags-desktop](../e2e/visual.spec.ts-snapshots/posts-tags-desktop-darwin.png) | [posts-tags-mobile](../e2e/visual.spec.ts-snapshots/posts-tags-mobile-darwin.png) | 전체 |
| `/posts/history` | [posts-history-desktop](../e2e/visual.spec.ts-snapshots/posts-history-desktop-darwin.png) | [posts-history-mobile](../e2e/visual.spec.ts-snapshots/posts-history-mobile-darwin.png) | 전체 |
| `/posts/accessibility-checklist` | [post-detail-desktop](../e2e/visual.spec.ts-snapshots/post-detail-desktop-darwin.png) | [post-detail-mobile](../e2e/visual.spec.ts-snapshots/post-detail-mobile-darwin.png) | 뷰포트 |
| `/profile` | [profile-desktop](../e2e/visual.spec.ts-snapshots/profile-desktop-darwin.png) | [profile-mobile](../e2e/visual.spec.ts-snapshots/profile-mobile-darwin.png) | 전체 |
| `/privacy` | [privacy-desktop](../e2e/visual.spec.ts-snapshots/privacy-desktop-darwin.png) | [privacy-mobile](../e2e/visual.spec.ts-snapshots/privacy-mobile-darwin.png) | 전체 |
| `/admin/login` | [admin-login-desktop](../e2e/visual.spec.ts-snapshots/admin-login-desktop-darwin.png) | [admin-login-mobile](../e2e/visual.spec.ts-snapshots/admin-login-mobile-darwin.png) | 전체 |

**갱신 시 점검 (중요):**

```bash
ls -la e2e/visual.spec.ts-snapshots/ | awk 'NR>3{print int($5/1024)"kB", $NF}' | sort -n | head -3
```

파일 크기가 유독 작은 스냅샷은 **로딩 화면이나 마스크 단색이 박힌 것**이다. 실제로 두 번 당했다
(`profile-desktop` 5.8 kB = 전체 마젠타, `posts-desktop` 30 kB = 화면 60%가 마스크).
`--update-snapshots` 후에는 위 명령으로 하위 몇 개를 확인하고 눈으로 열어본다.
현재 최소값은 `admin-login-mobile` 29 kB — 로그인 페이지라 원래 단순한 것이 맞다.

### CI 주의

스냅샷 파일명에 플랫폼 접미사(`-darwin`)가 붙어 **CI(Linux)에서 재사용할 수 없다.**
CI에서 돌리려면 동일 플랫폼 컨테이너에서 baseline 을 다시 찍어야 한다.
