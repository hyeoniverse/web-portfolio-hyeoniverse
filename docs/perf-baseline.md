# 성능 baseline

리팩토링 착수 시점의 기준선. [refactoring-guide.md](refactoring-guide.md) P3 — 모든 성능 PR은 이 표에 대고 전/후를 비교한다.

- **측정일**: 2026-07-23
- **커밋**: `878560ab` (branch `design/about-erd-explorer-ux`)
- **명령**: `npx next build --experimental-analyze`
- **환경**: Next.js 16.2.11 (Turbopack), Node 23.10.0, darwin
- **gzip**: `firstLoadChunkPaths` 의 각 chunk 를 gzip -9 로 압축해 합산 (실제 전송량 근사)

## 측정 방법 주의

`npm run analyze`(= `@next/bundle-analyzer`)는 **이 프로젝트에서 아무것도 생성하지 않는다.**
Next 16의 `next build`는 Turbopack이 기본이고, bundle-analyzer는 webpack 플러그인이라 무시된다.
`next.config.ts` 의 `webpack:` 훅도 같은 이유로 죽어 있다.

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

**참고 기준**: 일반적으로 First Load JS는 gzip 100~200 kB 를 건강한 선으로 본다.
현재는 최저 라우트(`/_not-found`)조차 380 kB — **모든 페이지가 기준의 2배에서 시작한다.**

## 공통 shell 380 kB 의 구성

전 32개 라우트에 예외 없이 로드되는 20개 chunk. 소스맵의 `sourcesContent` 기준 원본 비중:

| 비중 | 원본 크기 | 모듈 | 메모 |
| ---: | ---: | --- | --- |
| 53.1% | 1753 kB | `next` | 프레임워크. 대상 아님 |
| 12.0% | 397 kB | `motion-dom` | framer-motion 런타임 |
| 11.1% | 368 kB | `gsap` | **works 가로스크롤 전용인데 전 라우트 로드** |
| 4.7% | 154 kB | `framer-motion` | |
| 3.9% | 128 kB | `tailwind-merge` | CSS Modules 기반인데 전 라우트 로드 |
| 2.4% | 80 kB | `src/components/layout` | Navigation 등 |
| 2.4% | 80 kB | `src/config/site.config.ts` | 설정 파일이 클라이언트 번들에 통째로 |
| 1.9% | 63 kB | `src/locales/en.json` | |
| 1.5% | 50 kB | `src/locales/ko.json` | **두 언어 동시 로드** |
| 0.9% | 30 kB | `@swc/helpers` | |
| 0.8% | 26 kB | `src/components/ui` | |

### Phase 2 타깃 (예상 효과 순)

1. **gsap 격리** — 368 kB. `works` / webflow 가로스크롤에서만 필요. 전 라우트에서 제거
2. **framer-motion + motion-dom 격리** — 551 kB. 사용처를 리프 컴포넌트로 좁히고 `next/dynamic`
3. **locales 언어별 분리** — 113 kB. 현재 ko/en 동시 로드
4. **site.config.ts 경계** — 80 kB. 서버 전용 필드가 클라이언트로 새는지 확인
5. **tailwind-merge** — 128 kB. CSS Modules 프로젝트에서 실제 사용처 확인 후 `clsx` 로 대체 가능한지

### 그 외 확인된 낭비

- **소스맵 90 MB vs JS 25 MB** — `productionBrowserSourceMaps: true`.
  배포 산출물이 3.6배가 되고, 프로덕션 소스가 그대로 노출된다. Phase 2에서 재검토
- `next.config.ts` 의 `optimizePackageImports` 에 **미사용 `@tiptap/*` 12개** 잔재 (의존성에 없음)
- `next.config.ts` 의 `webpack:` 훅 — Turbopack 빌드에서 무시됨 (`.md` asset/source 룰이 죽어 있음)

## Lighthouse

미측정. `next start` 기동 후 주요 5개 라우트에 대해 별도 기록 예정.

## 시각 회귀 baseline

- 설정: [playwright.config.ts](../playwright.config.ts) · 스펙: [e2e/visual.spec.ts](../e2e/visual.spec.ts) · 대상: [e2e/routes.ts](../e2e/routes.ts)
- 공개 라우트 12개 × desktop(1440×900) / mobile(Pixel 7) = **스냅샷 24장**
- **안정성: 3회 연속 24/24 통과 (flaky 0)** — 아래 함정을 전부 잡고 난 뒤의 결과다

```bash
npm run test:visual          # 비교
npm run test:visual:update   # baseline 갱신 (의도된 design 변경일 때만)
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
| `/admin/*` | 셋업 완료, baseline 미생성 | 테스트 계정 credential 필요 — 아래 참고 |

→ 위 라우트의 하단 영역은 **수동 QA 체크리스트로 커버**한다.

### admin 시각 회귀 (Phase 4-1 안전망)

admin 슬라이스가 40,586줄이라 시각 회귀 없이 착수하면 안전망이 수동 QA뿐이다.
스펙([e2e/admin.spec.ts](../e2e/admin.spec.ts))과 로그인 셋업([e2e/auth.setup.ts](../e2e/auth.setup.ts))은
준비돼 있고, **계정 credential 만 넣으면 baseline 을 찍을 수 있다.**

대상 7개: `/admin` · `/admin/settings` · `/admin/posts` · `/admin/works` · `/admin/comments` ·
`/admin/notifications` · `/admin/reports`
(편집 화면은 Plate 에디터라 캡처가 불안정하고 Phase 4-4 대상이라 제외)

**로그인에 보안 게이트가 두 겹 있다:**

1. Supabase 이메일/비밀번호
2. **새 기기(UA fingerprint) 승인** — 처음 보는 기기면 즉시 `signOut` 하고 승인 메일을 보낸다
   ([api/admin/auth/route.ts](../src/app/api/admin/auth/route.ts))

2번은 사람이 메일 링크를 눌러야 통과한다. 그래서 최초 1회만 수동 승인하고 세션을
`e2e/.auth/admin.json` 에 저장해 재사용한다. fingerprint 는 UA 기반이라 같은 Playwright
브라우저를 쓰는 한 재승인이 필요 없다. **이 파일에는 인증 토큰이 들어 있어 `.gitignore` 대상이다.**

```bash
# 1. Supabase Dashboard → Authentication → Users → Add user (Auto Confirm 체크)
# 2. .env.local 에 credential 추가
#    E2E_ADMIN_EMAIL=...
#    E2E_ADMIN_PASSWORD=...
# 3. 첫 실행 — "승인 대기" 로 실패한다
npm run test:visual:admin
# 4. 해당 계정 메일함의 승인 링크 클릭
# 5. baseline 생성
npm run test:visual:admin -- -u
```

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
