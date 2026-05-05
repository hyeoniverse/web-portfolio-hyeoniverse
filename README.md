<div align="center">

**[English](./README.en.md)** | 한국어

# Arc — Where Growth Takes Shape

개인 포트폴리오 웹사이트입니다. Next.js 15, React 19, TypeScript로 구축되었으며, GSAP, Framer Motion, Lenis를 활용한 인터랙티브 애니메이션이 특징입니다.

[![License](https://img.shields.io/badge/license-PolyForm%20NC%201.0-d40063?style=flat-square)](./LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-15-000?style=flat-square&logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-61dafb?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ecf8e?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com)

**[Live Demo →](https://your-domain.vercel.app)** _(배포 후 URL 교체 예정)_

<br />

<img src="public/docs/screenshots/pc/home-dark.png" alt="Home — Dark" width="100%" />

</div>

---

## 미리보기

### 다크 / 라이트 테마

| Dark | Light |
|:---:|:---:|
| <img src="public/docs/screenshots/pc/home-dark.png" alt="Home Dark" width="100%" /> | <img src="public/docs/screenshots/pc/home-light.png" alt="Home Light" width="100%" /> |
| <img src="public/docs/screenshots/pc/works-dark.png" alt="Works Dark" width="100%" /> | <img src="public/docs/screenshots/pc/works-light.png" alt="Works Light" width="100%" /> |
| <img src="public/docs/screenshots/pc/posts-dark.png" alt="Posts Dark" width="100%" /> | <img src="public/docs/screenshots/pc/posts-light.png" alt="Posts Light" width="100%" /> |

<details>
<summary><strong>더 보기 — Profile / About / Work Detail / Design System</strong></summary>

| Dark | Light |
|:---:|:---:|
| <img src="public/docs/screenshots/pc/profile-dark.png" alt="Profile Dark" width="100%" /> | <img src="public/docs/screenshots/pc/profile-light.png" alt="Profile Light" width="100%" /> |
| <img src="public/docs/screenshots/pc/about-dark.png" alt="About Dark" width="100%" /> | <img src="public/docs/screenshots/pc/about-light.png" alt="About Light" width="100%" /> |
| <img src="public/docs/screenshots/pc/work-detail-dark.png" alt="Work Detail Dark" width="100%" /> | <img src="public/docs/screenshots/pc/work-detail-light.png" alt="Work Detail Light" width="100%" /> |
| <img src="public/docs/screenshots/pc/design-system-dark.png" alt="Design System Dark" width="100%" /> | <img src="public/docs/screenshots/pc/design-system-light.png" alt="Design System Light" width="100%" /> |

</details>

### 반응형 — PC / Tablet / Mobile

| PC (1440px) | Tablet (768px) | Mobile (390px) |
|:---:|:---:|:---:|
| <img src="public/docs/screenshots/pc/home-dark.png" alt="Home PC" width="100%" /> | <img src="public/docs/screenshots/tablet/home-dark.png" alt="Home Tablet" width="100%" /> | <img src="public/docs/screenshots/mobile/home-dark.png" alt="Home Mobile" width="100%" /> |
| <img src="public/docs/screenshots/pc/works-dark.png" alt="Works PC" width="100%" /> | <img src="public/docs/screenshots/tablet/works-dark.png" alt="Works Tablet" width="100%" /> | <img src="public/docs/screenshots/mobile/works-dark.png" alt="Works Mobile" width="100%" /> |
| <img src="public/docs/screenshots/pc/posts-dark.png" alt="Posts PC" width="100%" /> | <img src="public/docs/screenshots/tablet/posts-dark.png" alt="Posts Tablet" width="100%" /> | <img src="public/docs/screenshots/mobile/posts-dark.png" alt="Posts Mobile" width="100%" /> |

---

## 한눈에 보기

| 영역 | 핵심 |
|:---|:---|
| **인터랙션** | 무한 스크롤 루프, 마우스 패럴랙스, StaggerText, Three.js 3D 커피잔 + 라떼아트, 방향별 Scroll Cascade |
| **Works** | 6종 레이아웃 (Flow · Fullscreen · Cinematic · Grid · Split · Cylinder) |
| **Blog** | SSR + ISR, 시리즈, 배너 슬라이더, 게스트 댓글 (이중 인증) |
| **Admin** | Plate.js 에디터, `.md` 동기화 + 내보내기, AI 번역/요약, 리비전 히스토리 |
| **성능** | Lighthouse 98 — LCP 1.9s, 449KB (-70%) |
| **보안** | SQL Injection, XSS, RLS, 이중 인증, 카테고리 화이트리스트 |
| **디자인 시스템** | 3-layer 토큰 (Raw → Semantic → Context) + 라이브 프리뷰 |

---

## 기술 스택

| Category | Technology |
|:---|:---|
| Framework | ![Next.js](https://img.shields.io/badge/Next.js_15-000?style=flat-square&logo=nextdotjs&logoColor=white) (App Router, Turbopack) |
| Language | ![TypeScript](https://img.shields.io/badge/TypeScript-3178c6?style=flat-square&logo=typescript&logoColor=white) |
| UI | ![React](https://img.shields.io/badge/React_19-61dafb?style=flat-square&logo=react&logoColor=black) |
| Styling | ![CSS Modules](https://img.shields.io/badge/CSS_Modules-1572b6?style=flat-square&logo=css3&logoColor=white) + CSS Variables |
| Animation | ![Framer Motion](https://img.shields.io/badge/Framer_Motion-e846ff?style=flat-square&logo=framer&logoColor=white) ![GSAP](https://img.shields.io/badge/GSAP-88ce02?style=flat-square&logo=greensock&logoColor=black) ![Lenis](https://img.shields.io/badge/Lenis-000?style=flat-square) |
| 3D | ![Three.js](https://img.shields.io/badge/Three.js-000?style=flat-square&logo=threedotjs&logoColor=white) ![R3F](https://img.shields.io/badge/React_Three_Fiber-000?style=flat-square&logo=threedotjs) ![Drei](https://img.shields.io/badge/Drei-000?style=flat-square) |
| Typography | Instrument Serif, Space Grotesk, JetBrains Mono (관리자 설정에서 카테고리별 30+ 프리셋 + Google Fonts 직접 입력 지원) |
| Backend | ![Supabase](https://img.shields.io/badge/Supabase-3ecf8e?style=flat-square&logo=supabase&logoColor=white) (PostgreSQL, Auth, Storage) |
| Editor | ![Plate.js](https://img.shields.io/badge/Plate.js-1a1a2e?style=flat-square) (Slate 기반 WYSIWYG) + Markdown |
| AI Image | NanoBanana / Hugging Face (우선순위 기반 fallback chain) |

## 주요 기능

### Animation & Interaction

- **Infinite Scroll Loop**: Lenis smooth scroll + Bridge Section 기반 무한 순환 스크롤
- **Mouse Parallax**: Framer Motion useSpring/useTransform 기반 마우스 반응형 패럴랙스
- **Scroll-Triggered Animations**: GSAP ScrollTrigger를 활용한 스크롤 기반 등장 애니메이션
- **Scroll Velocity Parallax**: Lenis velocity 기반 스크롤 속도 연동 이미지 패럴랙스 (Works 이미지 160% buffer로 원 밖으로 새지 않도록 보정)
- **Directional Scroll Cascade**: Services 항목이 스크롤 방향별로 cascade — 위로 스크롤 시 item0, 아래로 스크롤 시 item3가 leader, velocity 기반 overlap 축소 + 상·하단 border hard stop
- **Hero Oval Spread**: 위쪽 원 그룹은 위로 누적 스크롤 거리, 아래쪽 원 그룹은 아래로 누적 스크롤에 비례해 벌어짐 (방향별 독립 spread)
- **StaggerText**: 호버 시 글자별 순차 외곽선 애니메이션, mouseEnter 시점의 실제 글자 색을 JS로 캡처해 stroke 색을 동적으로 동기화
- **CTA 3D Coffee**: Three.js(R3F) 기반 세라믹 커피잔 — LatheGeometry 둥근 프로파일, 마우스 추적 회전, Canvas 2D로 그린 parametric heart 라떼아트(cream↔coffee wave + 엽맥 blur) + 갈색 halo + contact shadow disc
- **Glass Hover Buttons**: CTA 컨택트/이력서 버튼 hover 시 backdrop-filter blur로 뒷 커피 canvas가 유리창 너머처럼 흐려짐 (transform 기반 compositing 이슈를 marginTop 엔트런스로 해결)
- **3D Scroll Torus**: Three.js(R3F) 기반 3D 메탈릭 토러스 — 리사주 곡선 경로 회전, 테마별 머티리얼, 모바일 터치 반발 인터랙션

<p align="center">
  <img src="public/docs/screenshots/pc/home-dark.png" width="49%" alt="Home — Dark" />
  <img src="public/docs/screenshots/pc/home-light.png" width="49%" alt="Home — Light" />
</p>

### Works Gallery

- **6종 레이아웃**: Admin 설정 또는 `?layout=` 쿼리 파라미터로 전환 — Flow(기본 가로 스크롤) · Fullscreen(배경 크로스페이드) · Cinematic(패럴랙스 시네마) · Grid(벤토 그리드) · Split(좌 메타 + 우 스크롤) · Cylinder(Three.js 3D 실린더)
- **Flow 레이아웃**: GSAP 기반 가로 스크롤 갤러리 — 양방향 무한 래핑, 마우스 3D tilt, 이미지 hover 확대, 메타데이터 reveal 시차
- **Cylinder 레이아웃**: Three.js 세로 원통 회전 + HTML 오버레이, 우주 테마 인트로 + 바운싱 버니 캐릭터
- **Cylinder 반응형**: 뷰포트 크기에 따라 카메라 자동 후퇴, 태블릿 이하에서 기울기(tilt) 비활성, 스크롤 기반 제목 slide-in reveal (CSS variable `--reveal` + clip-path 마스크)
- **Cylinder 메타 분리**: mix-blend-mode: difference는 제목·카테고리만 적용, 설명·상세(연도/역할/기술 marquee)·CTA는 별도 overlay로 분리해 항상 흰색 텍스트 유지
- **Floating Comments**: 인트로 슬롯에 최신 작품 댓글이 RAF 물리 기반으로 떠다님, 클릭 시 해당 작품으로 전환 효과와 함께 이동
- **Breakpoint Guard**: Cylinder 레이아웃은 리사이즈 시 리로드 없이 실시간 대응, 나머지 레이아웃은 breakpoint 전환 시 자동 remount

<p align="center">
  <img src="public/docs/screenshots/pc/works-dark.png" width="49%" alt="Works — Dark" />
  <img src="public/docs/screenshots/pc/works-light.png" width="49%" alt="Works — Light" />
</p>

### Blog System

- **Posts (Blog)**: Supabase 기반 블로그 시스템 — SSR + ISR 캐싱, Markdown/Rich Text 전환 에디터, 검색/태그 필터, 조회수 추적, GitHub 링크
- **시리즈(Series)**: 포스트를 시리즈로 묶어 순서대로 발행 — `/series` 별도 페이지 폐지 후 `/posts` 안으로 통합, 카테고리 필터 후 타임라인(스텝 번호 + 세로 connector) 형태로 노출, 상세 페이지 이전/다음 네비게이션
- **Series Deck Cards**: 가로 스크롤 row — 카드를 hover 하면 0.8s 후 deck 형태로 펼쳐지며 소속 글 4개의 미리보기 layer가 0.4s 간격 stagger로 순차 등장 (transform 기반 stack offset, JS state 기반 timer 로 CSS transition-delay snap 회피), 펼침 상태에서 우측으로 next 카드를 밀어내고 `::after` pseudo 로 hit-area 확장해 flicker 없이 hover 유지. **deck 가 가로 스크롤 컨테이너 우측 밖으로 넘치면 rAF 루프로 매 프레임 `scrollLeft` 직접 증가** — 카드 `margin-right` 가 transition 으로 점차 늘어나면서 `scrollWidth` 도 함께 커지므로 단발 `scrollBy` 는 시작 시점 `maxScrollLeft` 에 즉시 clamp 되어 부족함. auto-scroll 종료 후 `card.matches(":hover")` 한번 더 확인해 cursor 가 떠나 있으면 deck 닫음(스크롤로 카드가 cursor 밑에서 빠져나간 false-positive mouseleave 방지)
- **Series Auto Cover**: cover/소속 글 cover 둘 다 없는 시리즈는 SSR 시점에 Unsplash 에서 자동으로 cover 1장 fetch → `series.auto_cover_url` 컬럼에 영구 캐시 (다음 요청부터 외부 호출 0회)
- **Posts 배너 슬라이더**: 피닝된 포스트를 배너로 표시 — 4가지 레이아웃 x 4가지 오버레이 x 2가지 전환 모드, Admin에서 선택
- **Posts 필터 바**: 카테고리 접기/펼치기(+N more), hover indicator(layoutId), sticky + 스크롤 방향 감지, 콘텐츠 blur 효과 — sticky 진입 anchor 시점은 IntersectionObserver `rootMargin` 을 컴포넌트의 실제 sticky `top` 값으로 동기화해 인기글 등 사이드 위젯과 1px 도 안 어긋나게 보정
- **Posts Bento Masonry**: 3/4/6 column CSS Grid + `grid-auto-rows: 1px` + JS 가 각 카드 `scrollHeight` 측정 후 `grid-row: span N` 적용 → 진정한 masonry. wide / banner(21:9) / square(1:1) / portrait(3:4) / standard 5종 variant 가 `grid-auto-flow: dense` 로 빈틈 없이 packing. 모바일은 변형 비활성화 + 16:10 통일. **PC(4·6col) 빈공간 최소화 템플릿 재배열** — banner(21:9, 가장 짧음)는 사이클 앞쪽에 두어 이후 standard 들이 dense backfill 가능, wide(2col 16:10)와 portrait(1col 3:4)는 height 가 비슷해 같은 row 매칭, standard 비중 확대(5/cycle) + square 1개로 축소해 평균 height 변주 줄여 packing 안정화
- **PopularPosts/RecentComments hover 효과**: 사이드 위젯 항목 hover 시 `translateX(var(--spacing-2xs))` 로 부드럽게 들여쓰기 — compound selector `(0,2,0)` 로 글로벌 theme transition `(0,1,1)` 우회 (transform 은 글로벌 규칙에 없어 일반 선택자로는 덮어쓸 수 없음)
- **Posts Sort Capsule**: 최신순(↑/↓) · 인기순(↑/↓) · 제목순(↑/↓) 3-way capsule + 별도 Shuffle(랜덤) 버튼. 방향 화살표는 transform: rotate 로 트위닝, hover indicator(Framer Motion `layoutId`) + 화살표 줄바꿈 방지(`white-space: nowrap`). 랜덤 정렬은 mulberry32 시드 셔플로 페이지네이션 일관성 유지
- **Posts Tooltip-everywhere**: 모든 필터·정렬·태그·카테고리·SearchCapsule 트리거에 `<T>` 컴포넌트 + Tooltip(번역 + 설명) 적용 — long hover(600ms) 로 반대 언어 + 짧은 설명 동시 노출, 모바일은 터치 토글
- **SearchCapsule 공통 컴포넌트**: `components/admin/SearchCapsule` → `components/ui/SearchCapsule` 이동. `searchType` prop optional, padding 을 태그/정렬 캡슐 톤에 맞춰 슬림화 (`var(--spacing-2xs) var(--spacing-sm)`). PostsClient · `/admin/comments` 등 모든 인라인 검색 input 을 일괄 교체
- **Seeded Color Generator**: `src/utils/seededColor.ts` — FNV-1a 해시 + 8 hue 앵커(주황/앰버/라임/그린/시안/블루/퍼플/마젠타) × 3 톤 스타일(vivid / pastel / muted) = 24가지 결정적 HSL 조합. 같은 seed 는 항상 같은 색, 인접 카드는 anchor + tone 둘 다 cycle 되어 시각적 분리 보장. OKLCH 의 sRGB gamut 클리핑 회피용으로 HSL 채택
- **PostCard 메타 i18n**: 날짜는 `language === "ko" ? ko-KR : en-US` 로 locale-aware 포맷, min read / views / likes 는 번역 키 사용, Eye/Heart 아이콘 + 0 도 항상 표시, `metaGroup` span 으로 그룹별 줄바꿈 단위 통일
- **IP 기반 좋아요**: Posts/Works/댓글에서 단일 `likes` 테이블 + `target_type` 구분, IP 기반 UNIQUE 제약으로 중복 방지, 연타 방지(ref lock + busy disabled), formatCount(1k/1.2m) 숫자 축약
- **댓글 시스템**: 게스트 대댓글(threaded) 지원 — 이중 인증(commenter_hash + bcrypt), 닉네임 셔플, 이메일 답글 알림, 관리자 댓글, 관리자 tombstone 2회 삭제로 완전 제거, 닉네임 보존 tombstone
- **첫 댓글 축하**: 첫 댓글 등록 시 confetti 효과 + 카드 플립 축하 메시지 (sparkle 별 장식 + accent 라인), 관리자 댓글 전체 선택 / 드래그 선택 / tombstone 일괄 완전 삭제

<p align="center">
  <img src="public/docs/screenshots/pc/posts-dark.png" width="49%" alt="Posts — Dark" />
  <img src="public/docs/screenshots/pc/posts-light.png" width="49%" alt="Posts — Light" />
</p>

### Works Detail & Project Pages

- **Works Admin CRUD**: Supabase DB 기반 작업물 관리 — 단일 에디터(MD/Rich Text) + 8섹션 템플릿, TOC 자동 생성, 한/영 이중언어, 갤러리/팀멤버
- **Work Detail**: 프로젝트 상세 페이지 — 콘텐츠 내 `##` 헤딩 파싱 TOC, 갤러리 이미지, 좋아요/댓글, GitHub 링크 버튼, DB 미연결 시 정적 데이터 fallback

<p align="center">
  <img src="public/docs/screenshots/pc/work-detail-dark.png" width="49%" alt="Work Detail — Dark" />
  <img src="public/docs/screenshots/pc/work-detail-light.png" width="49%" alt="Work Detail — Light" />
</p>

### Navigation & UX

- **Mix-Blend Navigation**: mix-blend-mode: difference 자동 반전 네비게이션 — 이미지 로고(숏/풀/다크 전용), 글리치 효과 Admin 제어. **메뉴는 좌측 로고와 우측 actions 사이 남는 공간의 가운데로 자동 정렬**(`flex: 1; justify-content: center`)되어 어떤 viewport 너비에서도 actions 와 겹치지 않음. **active link 의 sliding indicator** 는 일반 hover/이동 시 부드러운 transition, **창 너비 resize 중에는 `transition: none` 인라인으로 즉시 snap** 되어 메뉴 위치를 1프레임 단위로 따라감(120ms 디바운스 후 transition 복원)
- **Tooltip & Translation Tooltip**: 범용 Tooltip + 번역 `<T>` 컴포넌트 — long hover(600ms)로 반대 언어 표시, createPortal 기반, 모바일 터치 토글
- **Footer Sliding Indicator**: Navigation과 동일한 슬라이딩 인디케이터 — hover 시 화살표 이동, ResizeObserver + fonts.ready 정확도
- **Carousel (default / cylinder)**: 공통 Carousel — default(CSS opacity) / cylinder(3D perspective) 모드, autoPlay/loop/dots/arrows
- **About 가로 스크롤**: `useHorizontalScroll` 훅으로 GSAP 기반 가로 스크롤(데스크톱), 모바일 자동 세로 스택
- **Page Transition**: 모든 detail 페이지 이동 시 이미지 확대→hero 위치 모핑→그라데이션 페이드 전환 효과 (PageTransitionProvider, root layout 레벨에서 페이지 간 유지)
- **ImageViewer 방향 슬라이드**: 이전/다음 이동 시 반대 방향에서 slide-in (mode wait), 좌/우 영역 hover로 화살표 노출
- **Select 드롭다운 애니메이션**: portal 기반 드롭다운에서 mount 후 rAF 2회 대기로 CSS transition 보장 (compound selector로 글로벌 theme transition 우회). **외부 스크롤 시 dropdown 위치 재계산이 아니라 dropdown 자체를 닫음** — trigger 따라 이동해 산만해지는 걸 방지(내부 옵션 list overflow 스크롤은 유지)
- **LanguageToggle 동적 측정**: EN 버튼 위치를 useLayoutEffect로 실측해 indicator 정확한 정렬

<p align="center">
  <img src="public/docs/screenshots/pc/about-dark.png" width="49%" alt="About — Dark" />
  <img src="public/docs/screenshots/pc/about-light.png" width="49%" alt="About — Light" />
</p>

### Admin & CMS

- **Admin Dashboard**: `/admin` 홈 — 누적 게시물 조회수, 좋아요, 방문자, 댓글 카운트 + 일별 조회 추세 차트(Recharts), 최근 활동 피드, 예약 발행 대기 목록
- **CRUD & 일괄 관리**: Posts/Works CRUD, 드래그 일괄 선택 + 발행/삭제, 시리즈 관리, 휴지통(soft delete + 복원)
- **예약 발행**: `scheduled_at` 컬럼 + Vercel cron(`/api/cron/publish-scheduled`, 5분 주기) — 미래 시간 설정 시 자동 `published=true` flip, DateTimePicker UI(날짜 + 시간 분리, 12h/24h 토글)
- **Posts ↔ Works 양방향 연결**: Notion Relation 스타일 — `post_work_relations` 다대다 테이블, 양쪽 어디서 추가하든 detail 페이지에 자동 노출, `RelationPicker` 검색·썸네일·발행 상태 표시
- **SEO 체크리스트**: 에디터 하단 위젯 — title/slug/excerpt(30자+)/cover/category/tags 6항목 점검, score 진행 바, 항목 클릭 시 해당 필드로 스크롤 + label accent 강조 (다음 인터랙션 전까지 유지)
- **`.md` 동기화**: `content/posts/` · `content/works/` 폴더 → DB 단방향 싱크 (Jekyll-style, `pnpm sync-all`)
- **`.md` 내보내기**: 전체/선택/개별/시리즈 단위로 frontmatter 포함 `.md` 다운로드
- **Plate.js 에디터**: Markdown ↔ Rich Text 양방향 변환 (파일/오디오 첨부 포함), 커스텀 각주, 5종 템플릿, 에디터 전환 skeleton, 직접입력 font size/line height
- **WorkEditor 정비**: ① **연도 → PeriodPicker** — 단순 연도가 아닌 시작/종료/진행중 까지 표현, JSON 직렬화로 기존 단순 year 문자열과 back-compat. ② **역할 multi-select** — combobox 캡슐 안에서 chip + 검색 input + portal'd dropdown(`position: fixed`), preset 10종 + 커스텀 직접입력, 한글 IME composition Enter 시 마지막 글자 중복 방지(`isComposing`/keyCode 229 가드). ③ **정렬 순서 drag list** — 다른 작품들과 같은 list 에서 grip handle 로 drag, 페이지네이션(5개씩) + 위치 input + 맨앞/맨뒤 jump 버튼, 드래그 중 list edge(60px) hover 시 `apply()` 로 인접 페이지 첫/끝 위치로 reorder 자체 수행해 source 가 unmount 되지 않게 보존. ④ **카테고리 직접입력** — KO/EN inline 캡슐(언어 태그 + input), 자동완성/생성. ⑤ subtitle 은 chip row 의 높이에 맞춰 textarea-like 로 stretch, 2줄 이상이면 radius 자동 morph
- **RelationPicker 강화**: chip 좌측 grip handle 로 **pointer-based drag-reorder**(HTML5 D&D 의 source-unmount cancel / 자식 click 흡수 / state-driven `draggable` 토글 등 quirks 회피), `framer-motion` `layout` prop 으로 재정렬 시 FLIP spring 자동 애니메이션, drag 위치에 따라 chip 좌/우 가장자리에 `::before/::after` 삽입 indicator. 입력 영역 닫힘 시 안내 placeholder("+ Add" / "No more items"), 화살표는 `ChevronRight` + 열림 시 90° 회전. 썸네일 로드 실패 시 동일 사이즈 ImageIcon placeholder 로 fallback
- **PostEditor 커버 picker 애니메이션**: ① 닫기 버튼 텍스트 "선택 ↔ 닫기" 가 `AnimatePresence mode="wait"` 로 부드럽게 swap. ② picker 펼친 상태에선 같은 row 의 excerpt textarea 가 picker 높이만큼 함께 stretch(`align-items: stretch` + `flex-direction: column`). ③ 닫기 시 `closingCoverPicker` state 로 ~450ms collapse 애니메이션 끝난 뒤 unmount(즉시 unmount 면 닫는 모션이 안 보임). 시리즈 순서 list 는 grip 핸들 가장 앞 + framer `layout` 으로 drop indicator + spring reorder
- **CursorTrail HTML5 drag 지원**: HTML5 native drag 가 활성이면 브라우저가 `pointermove` 를 시스템 차원에서 억제 → CursorTrail 이 freeze + 다른 요소 hover 마다 cursor type 흔들림. `dragover` 를 `handleMouseMove` 로 forward 해 좌표 stream 복원 + `dragstart` 시점에 `cursorType="grab"` lock + `runHitTest` 진입부 early-return 으로 "내가 잡고 있는 것" 의 cursor 를 끝까지 유지
- **이미지 깨짐 placeholder 시스템**: 모든 이미지 surface(에디터 cover, Plate inline, MarkdownRenderer, RelationPicker chip/option, ImagePanel 썸네일, WorkEditor main/gallery)에서 로드 실패 시 `/images/placeholder.svg` 로 통일 swap. React 컴포넌트는 `onError` + state, `dangerouslySetInnerHTML` 영역(MarkdownRenderer / useRichtextEnhance)은 `attachImageFallback(root)` — `addEventListener("error")` + 즉시 `complete && naturalWidth===0` 체크 + MutationObserver 로 dynamic 추가 img 자동 추적, swap 시 `removeAttribute("srcset")` 로 srcset 재시도 차단
- **리비전 히스토리**: JSONB snapshot 자동저장, LCS diff 비교, 기기 간 공유, 50개 초과 자동 정리
- **AI 번역/요약**: DeepL/Google/Gemini/Claude fallback chain, 발행 시 자동 요약 생성
- **카테고리 일괄 재할당**: `BulkCategoryModal` — 선택한 게시물들의 카테고리를 한 번에 변경, 시리즈 매핑 보존
- **댓글 관리**: `/admin/comments` 통합 패널 — Posts/Works 댓글 동시 표시, 일괄 tombstone/완전 삭제, 신고 필터
- **Settings 5탭**: General/Content/Appearance/Services/Account — 브랜드, SEO, 이중언어 편집
- **Cover Image Picker 고도화**: 4탭 구조(프리셋 / Unsplash / AI 생성 / 이력) + 클라이언트 이미지 WebP 압축. **프리셋 = Adobe Color 스타일 그라데이션 에디터** — base color + 8 scheme(유사 / 단색 / 삼각형 / 보색 / 분할 보색 / 정사각형 / 혼합 / 음영) + linear/radial 토글 + 각도/크기/속도 슬라이더 + drag-to-reposition stop bar(2~4 stop, capsule bar + 핸들 아래 아이콘), **이미지 업로드 → 색 추출** 또는 **클립보드 색상표 붙여넣기**(`#rrggbb` / `#rgb` 둘 다 인식, 모달 prompt fallback)로 stop seed, **완전 랜덤 버튼**(pattern/크기/속도/색/개수/위치 모두 random) + presets[0] 자동 시드 — picker 첫 진입 시 현재 cover 이미지에서 palette 추출해 stops seed (사용자가 preset 클릭/수동 편집하면 seed 비활성). **이력 탭** 은 ai/unsplash/preset 통합, Supabase 영구 저장(cover_image_history 테이블, RLS) — 선택/삭제/키워드 복사/색상표 복사/다운로드 버튼이 좌상단에 cluster, active 체크는 우상단
- **CoverImageField 공용 컴포넌트**: `src/components/admin/CoverImageField` — 라벨 + inline 액션(Upload / Choose / Remove) + 썸네일 + 추출 팔레트 swatch row. 깨진 이미지 placeholder fallback, 클릭으로 picker open. PostEditor / WorkEditor / SeriesEditor 가 동일 UI 공유
- **ColorPicker 커스텀 구현**: `src/components/ui/ColorPicker` — native `<input type="color">` 의 OS 별 일관성 부재 해결. SV pad + hue slider + Hex/RGB 입력, render-prop trigger(부모가 swatch 모양 자유), createPortal popover(`overflow:hidden` 부모 escape). **wrapper span 이 0×0 으로 collapse 되는 케이스**(자식이 `position: absolute` 인 stop handle 등) 는 `firstElementChild.getBoundingClientRect()` fallback 으로 popover 위치 정확. PlateEditor / Settings / RichTextEditor / MainToolbar / TableToolbar 등 13곳 native input 일괄 교체
- **SortOrderDragList 공용 컴포넌트**: `src/components/admin/SortOrderDragList` — 페이지네이션(5/페이지) + grip handle pointer 드래그 + 페이지 edge hover 시 즉시 reorder + 위치 input + 맨앞/맨뒤 jump. WorkEditor 정렬 + PostEditor 시리즈 순서 동일 UI 공유
- **글로벌 Toast**: `src/stores/toastStore.ts` + `src/components/ui/Toast` — zustand 기반 싱글톤, success/error/info variant, 자동 dismiss(기본 2.4s), 하단 중앙 stack. 팔레트 swatch / 팔레트 row 복사 등 non-blocking 피드백 ("Copied!") 에 사용
- **카테고리 직접입력 모드 유지**: PostEditor / WorkEditor 카테고리 select 가 별도 `categoryCustomMode` flag 를 추적 — "직접 입력" 선택 시 값을 지워도 input 은 사용자가 다른 옵션을 고를 때까지 유지(이전엔 빈 값 → 첫 카테고리로 자동 복귀해 input 이 사라지던 회귀 해결)
- **미디어 업로드 관리**: 허용 파일 형식 화이트리스트 (MIME 타입별 크기 제한), 차단 확장자 블랙리스트, 인프라 키 읽기 전용 표시 — 추가 가능한 MIME은 그룹별 chip UI(이미지/비디오/오디오/문서/압축)로 클릭 한 번에 허용 목록에 추가되며, 같은 그룹(예: JPEG/PNG/WebP)의 크기 제한을 공유
- **HEIC / TIFF 자동 변환**: 업로드 시점에 sharp로 HEIC/HEIF/TIFF → WebP(quality 85) 서버 변환, 브라우저 네이티브 미지원 포맷도 모든 브라우저에서 표시 가능
- **문서 뷰어**: 파일 첨부 시 PDF(iframe) · 오피스(MS Viewer) · 텍스트(fetch+pre) 인라인 미리보기, 다운로드 원본 파일명 유지
- **아이콘 일관화**: 모든 인라인 SVG를 `lucide-react`로 통일 (~200개 교체), 브랜드 마크(GitHub)는 `src/components/icons/` 커스텀 컴포넌트로 분리 — 트리 셰이킹 + 일관된 strokeWidth/size API

<p align="center">
  <img src="public/docs/screenshots/pc/profile-dark.png" width="49%" alt="Profile — Dark" />
  <img src="public/docs/screenshots/pc/profile-light.png" width="49%" alt="Profile — Light" />
</p>

### Performance

- **번들 최적화**: react-icons를 inline SVG로 교체, Three.js dynamic import, About 6개 패널 코드 스플리팅(JS 62% 절감), 미사용 패키지/이미지(22MB) 삭제
- **성능 최적화**: Hero/마퀴 CSS animation 전환(컴포지터 스레드), useMagneticRepel ref 직접 DOM 조작(60fps), Three.js FrontSide + dispose, AudioContext 지연 초기화

| 메트릭 | Before | After |
|:---|:---:|:---:|
| Lighthouse Performance | 60 | **98** |
| LCP | 7,294ms | **1,979ms** |
| 페이지 용량 | 1,489KB | **449KB** (-70%) |
| 네트워크 요청 | 63건 | **28건** |

### Design System

- **Design System 프리뷰**: `/design-system` 라우트로 토큰/컴포넌트/배너 레이아웃 확인 — Tooltip, Select(portal 기반 dropdown), Pagination(smart ellipsis), PeriodPicker, ButtonGroup(캡슐형 합체 버튼), Gradient Tokens, 3-phase scroll 애니메이션

<p align="center">
  <img src="public/docs/screenshots/pc/design-system-dark.png" width="49%" alt="Design System — Dark" />
  <img src="public/docs/screenshots/pc/design-system-light.png" width="49%" alt="Design System — Light" />
</p>

> **상세 문서**: [Security](./docs/security.md) · [DB 설계 결정](./docs/db-design.md) · [User Flow](./docs/user-flow.md)

## 시작하기

```bash
# 1. 의존성 설치
npm install

# 2. 개발 서버 실행
npm run dev
```

[http://localhost:3000](http://localhost:3000)에서 결과를 확인할 수 있습니다.

> **Supabase 없이도 동작합니다.** 환경변수가 없으면 Works, Profile, Settings의 정적 데이터로 자동 fallback됩니다. Posts/댓글/좋아요 등 DB 연동 기능을 사용하려면 아래 Supabase 세팅 가이드를 참고하세요.

---

> **Supabase 없이도 동작**: 환경변수가 없으면 정적 데이터로 자동 fallback. Posts/댓글/좋아요 기능은 **[Supabase 세팅 가이드](./docs/supabase-setup.md)** 참고.

<!-- supabase-setup-start: 아래 블록은 docs/supabase-setup.md로 분리됨 -->
<details>
<summary><strong>Supabase 세팅 가이드 (빠른 참조)</strong></summary>

Posts 기능을 사용하려면 Supabase 프로젝트 세팅이 필요합니다.

### 1. 환경변수 설정

`.env.local` 파일을 프로젝트 루트에 생성:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...

# Cover Image Picker — Unsplash (선택사항)
UNSPLASH_ACCESS_KEY=your_unsplash_access_key

# Cover Image Picker — AI Generate (provider에 맞는 키 하나만 설정)
# site.config.ts의 aiCover.provider 값에 따라 해당 키 사용
HUGGINGFACE_API_KEY=hf_...          # provider: "huggingface"
NANOBANANA_API_KEY=your_key         # provider: "nanobanana"

# Translation — 선택한 provider에 맞는 키만 설정
# site.config.ts의 translation.provider 값에 따라 해당 키 사용 (기본: deepl)
DEEPL_API_KEY=your_deepl_key                   # provider: "deepl" (기본)
GOOGLE_TRANSLATE_API_KEY=your_google_key        # provider: "google"
GEMINI_API_KEY=your_gemini_key                  # provider: "gemini"
ANTHROPIC_API_KEY=your_anthropic_key            # provider: "claude" (번역 + AI 요약)
```

**값 확인 방법:**

1. [Supabase Dashboard](https://supabase.com/dashboard) → 프로젝트 선택
2. **Settings** → **API** 탭
3. `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
4. `anon` `public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. `service_role` `secret` key → `SUPABASE_SERVICE_ROLE_KEY`

> **주의**: `service_role` 키는 RLS를 우회하므로 절대 클라이언트에 노출하면 안 됩니다. `SUPABASE_SERVICE_ROLE_KEY`는 `NEXT_PUBLIC_` 접두사 없이 서버 사이드에서만 사용됩니다.

### 2. 데이터베이스 테이블 생성

[`supabase/setup.sql`](supabase/setup.sql) 파일에 전체 테이블 생성 + RLS 정책이 포함되어 있습니다.

Supabase Dashboard → **SQL Editor**에서 파일 내용을 복사하여 한 번에 실행하면 됩니다.

**생성되는 테이블 (13개) + RPC 함수 (3개):**

| 테이블 | 용도 |
|--------|------|
| `site_settings` | 사이트 설정 + 프로필 데이터 + secrets/API 키 (JSONB) |
| `series` | 블로그 시리즈 (sort_order — admin 정렬, auto_cover_url — Unsplash 캐시) |
| `posts` | 블로그 포스트 (post_number 시퀀스 + `scheduled_at` 예약 발행) |
| `comments` | 포스트 댓글 (대댓글, 이중 인증: commenter_hash + password) |
| `likes` | 좋아요 (포스트/작업물/댓글 통합, target_type으로 구분, IP 중복 방지) |
| `works` | 포트폴리오 작업물 (team_members jsonb + `scheduled_at` 예약 발행) |
| `site_visits` | 방문자 통계 (IP+날짜 1회) |
| `post_views` | 게시물별 시계열 조회 기록 (대시보드 일별 추세 차트) |
| `work_comments` | Works 댓글 (대댓글, 이중 인증) |
| `admin_notifications` | 관리자 알림 로그 |
| `revisions` | 에디터 리비전 히스토리 (posts/works 공용, JSONB snapshot) |
| `post_work_relations` | posts ↔ works 양방향 다대다 (Notion Relation 스타일) |
| `cover_image_history` | Cover Image Picker 통합 이력 (admin user 별, ai/unsplash/preset 구분, RLS) |

**RPC 함수**: `sum_post_views()` (누적 조회수 합계), `daily_post_views(start, end)` (일별 시계열), `publish_scheduled()` (예약 시간 도달한 게시물/작품을 cron이 호출해서 발행)

> `IF NOT EXISTS`를 사용하므로 이미 존재하는 테이블은 건너뜁니다. 기존 배포 DB에 누락된 컬럼(commenter_hash, updated_at 등)은 파일 하단의 마이그레이션 섹션에서 `ALTER TABLE ADD COLUMN IF NOT EXISTS`로 안전하게 추가됩니다.

> **Supabase 없이도 동작**: 환경변수가 설정되지 않으면 Works(`data/projects.ts`), Profile(`data/profile.ts`), Settings(`config/site.config.ts`)의 정적 데이터로 자동 fallback됩니다.

**주요 API 엔드포인트:**

> **Posts API**: `GET/POST /api/posts`, `GET/PATCH/DELETE /api/posts/[id]`, `POST /api/posts/[id]/view`, `GET/POST /api/posts/[id]/like`, `GET /api/posts/export` (단일/전체/시리즈 .md 내보내기)
>
> **Series API**: `GET/POST /api/series`, `GET/PATCH/DELETE /api/series/[id]`
>
> **Works API**: `GET/POST /api/works`, `GET/PATCH/DELETE /api/works/[id]`, `GET/POST /api/works/[id]/like`, `GET /api/works/export` (단일/전체 .md 내보내기)
>
> **Comments API**: `GET /api/comments?post_id=`, `POST /api/comments`, `PATCH /api/comments` (수정), `DELETE /api/comments/[id]`
>
> **Work Comments API**: `GET /api/work-comments?work_id=`, `POST /api/work-comments`, `PATCH /api/work-comments` (수정), `DELETE /api/work-comments/[id]`
>
> **Comment Likes API**: `GET /api/comment-likes?comment_type=&comment_ids=` (좋아요 상태 일괄 조회), `POST /api/comment-likes` (댓글 좋아요 토글)
>
> **Admin API**: `POST /api/admin/auth`, `GET/PATCH /api/admin/settings`, `GET/PATCH /api/admin/profile`, `GET/PATCH /api/admin/account`, `GET/PUT /api/admin/secrets`, `POST /api/admin/upload`, `POST /api/admin/translate`
>
> **Revisions API**: `GET /api/revisions?entity_type=&entity_id=` (목록, snapshot 제외), `POST /api/revisions` (저장 + 50개 초과 정리), `GET /api/revisions/[id]` (snapshot 포함 단건), `DELETE /api/revisions/[id]`
>
> **Categories API**: `GET /api/categories` (Posts 이중언어 카테고리 목록), `GET /api/works-categories` (Works 이중언어 카테고리 목록)
>
> **Utility API**: `POST /api/translate` (공개, Gemini 단일 텍스트), `POST /api/posts/reassign-category` (카테고리 일괄 재할당), `GET /api/fonts/search?q=` (Google Fonts 자동완성 검색)

### 3. Storage 버킷 생성

이미지·이력서·BGM 업로드용:

1. Supabase Dashboard → **Storage**
2. **New bucket** 클릭
3. 버킷 이름: `uploads`
4. **Public bucket** 체크 (파일을 공개 URL로 접근 가능하게)
5. **Create bucket**

> 업로드 API가 폴더별로 파일을 구분합니다: `logos/`, `resume/`, `bgm/`, `covers/`, `images/` 등

**Storage 정책 설정:**

```sql
-- 인증된 사용자만 업로드 가능
CREATE POLICY "Authenticated users can upload"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'uploads' AND auth.role() = 'authenticated');

-- 누구나 읽기 가능 (public bucket)
CREATE POLICY "Anyone can view uploads"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'uploads');
```

### 4. Admin 계정 생성

Supabase Dashboard → **Authentication** → **Users** → **Add user**:

- Email과 Password 입력
- **Auto Confirm User** 체크 (이메일 인증 건너뛰기)

### 5. Admin 로그인 방법

사이트에 별도 로그인 버튼은 없습니다. 관리자만 URL을 직접 입력하여 접속합니다.

**로그인:**

1. `/admin/login` 접속
2. Supabase에서 생성한 이메일/비밀번호 입력
3. 로그인 성공 → `/admin/settings` (설정)으로 리다이렉트

**로그인 후 사용 가능한 기능:**

- `/admin/posts` — 포스트 목록 (발행/비공개 상태 확인, 호버 미리보기, 행 번호, 썸네일)
- `/admin/posts/new` — 새 포스트 작성 (Markdown ↔ Rich Text 전환, 자동 번역, 재번역, 자동 저장 + DB 리비전 히스토리 + diff 비교 + Revert)
- `/admin/posts/[id]/edit` — 기존 포스트 수정 (PlateEditor 로딩 스켈레톤)
- `/admin/posts/series/new` — 새 시리즈 생성
- `/admin/posts/series/[id]/edit` — 시리즈 편집
- `/admin/works` — 작업물 목록 (테이블 뷰, 발행/비공개 토글, 정렬 순서, 썸네일, .md 업로드)
- `/admin/works/new` — 새 작업물 생성 (단일 콘텐츠 에디터 + 템플릿, 한/영 이중 언어, 기술 스택, 갤러리)
- `/admin/works/[id]/edit` — 기존 작업물 수정
- `/admin/settings` — 사이트 설정 (General, Content, Appearance, Services, Account 5개 탭). General 탭에서 브랜드·SEO·푸터 저작권·BGM 파일 업로드·음원 출처(곡명/아티스트/URL) 관리. Content 탭은 Home/Profile/About/Posts/Works 서브 네비게이션으로 분리. Services 탭에서 이메일 서비스, AI 커버, reCAPTCHA 설정 및 API 키 편집. Account 탭에서 관리자 이메일/비밀번호 변경

### 6. Cover Image Picker 사용법

포스트·시리즈·작업물 에디터의 Cover Image / Main Image 영역에서 **Upload**(직접 업로드)과 **Choose cover**(피커) 중 선택할 수 있습니다.

**Choose cover** 클릭 시 3개 탭이 표시됩니다:

| 탭 | 설명 | 필요한 환경변수 |
|----|------|----------------|
| **Presets** | 16종 그라데이션/패턴 중 클릭하면 Canvas API로 1200×630 이미지를 생성하여 Supabase에 업로드 | 없음 |
| **Unsplash** | 키워드로 Unsplash 사진 검색 → 클릭 시 다운로드 트래킹 + Supabase 업로드 | `UNSPLASH_ACCESS_KEY` |
| **AI Generate** | 프롬프트 + 스타일 선택 → AI로 이미지 생성 → Supabase 업로드 | provider별 API key (아래 참고) |

> **참고**: Unsplash와 AI Generate 탭은 각각 API key가 필요합니다. Presets 탭은 환경변수 없이 사용 가능합니다.

---

#### AI Generate — Provider 설정

`src/config/site.config.ts`의 `aiCover.provider`에서 사용할 서비스를 선택합니다:

```ts
aiCover: {
  provider: "huggingface",  // "nanobanana" | "huggingface"
},
```

| Provider | 모델 | 환경변수 | 가격 | 발급 방법 |
|----------|------|----------|------|-----------|
| **huggingface** | FLUX.1-schnell | `HUGGINGFACE_API_KEY` | 무료 (rate limit 있음) | [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens) → New token → `Inference Providers` 권한 체크 |
| **nanobanana** | Gemini 2.5 Flash | `NANOBANANA_API_KEY` | ~$0.02/장 (가입 시 무료 크레딧) | [nanobananaapi.ai/api-key](https://nanobananaapi.ai/api-key) → 회원가입 → API Key 복사 |

**설정 예시 (.env.local):**

```env
# Hugging Face 사용 시 (권장 — 무료)
HUGGINGFACE_API_KEY=hf_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# 또는 NanoBanana 사용 시
# NANOBANANA_API_KEY=nb_xxxxxxxxxxxxxxxx

```

> provider를 변경한 후 `.env.local`에 해당 키만 설정하면 됩니다. 사용하지 않는 provider의 키는 비워두어도 무방합니다.

---

#### Hugging Face API Key 발급 (권장)

1. [huggingface.co](https://huggingface.co/join) 회원가입
2. [Settings → Access Tokens](https://huggingface.co/settings/tokens) 이동
3. **Create new token** 클릭
4. Token type: **Fine-grained** 선택
5. Token name: 아무 이름 (예: `portfolio-cover`)
6. Permissions 설정:
   - **Inference Providers** → **Make calls to Inference Providers** 체크 (필수)
   - 나머지 권한은 모두 체크 해제해도 됨
7. **Create token** → `hf_...` 형식의 토큰 복사
8. `.env.local`에 `HUGGINGFACE_API_KEY=hf_...` 입력

> 무료 계정 기준 시간당 수백 건 호출 가능. 커버 이미지 생성 용도로는 충분합니다.

#### NanoBanana API Key 발급

1. [nanobananaapi.ai](https://nanobananaapi.ai) 회원가입
2. [API Key 관리 페이지](https://nanobananaapi.ai/api-key) 이동
3. API Key 복사 (별도 권한 설정 없음 — 키 하나로 전체 API 접근)
4. `.env.local`에 `NANOBANANA_API_KEY=...` 입력

> 가입 시 무료 크레딧 제공. 이후 ~$0.02/장. 비동기 방식(생성 요청 → 폴링)이라 응답까지 수~십 초 걸릴 수 있습니다.

---

#### Unsplash API Key 발급

1. [Unsplash Developers](https://unsplash.com/developers) 가입
2. **Your apps** → **New Application** 클릭
3. 가이드라인 동의 체크 후 앱 이름/설명 입력 → **Create application**
4. 생성된 앱 페이지에서 **Access Key** 복사 (Secret Key 아님)
5. `.env.local`에 `UNSPLASH_ACCESS_KEY=...` 입력

> Demo 앱 기준 시간당 50건 제한. Production 승인 시 5,000건/시간.

**인증 플로우:**

```
/admin/login (폼 제출)
  → POST /api/admin/auth
    → supabase.auth.signInWithPassword()
    → 세션 쿠키 설정
  → /admin/settings로 리다이렉트

/admin/* 접속 시
  → Dashboard layout에서 세션 확인
  → 세션 없으면 → /admin/denied (접근 거부 페이지)
  → 세션 있으면 → 정상 접근

/admin/login 접속 시
  → Auth layout에서 세션 확인
  → 이미 로그인 → /admin/settings로 리다이렉트
```

> **포인트**: 일반 방문자는 `/posts`에서 글 읽기 + 댓글만 가능하고, 관리자(본인)만 `/admin/login`을 직접 입력해서 접속합니다. 포트폴리오 사이트이므로 로그인 UI를 노출하지 않습니다.


</details>

<details>
<summary><strong>테스트</strong></summary>


**스택**: Vitest + React Testing Library + jsdom

```bash
# 전체 테스트 실행
npm test

# 워치 모드 (파일 변경 시 자동 재실행)
npm run test:watch
```

**테스트 대상**:

| 파일                       | 테스트 수 | 설명                                                                |
| -------------------------- | --------- | ------------------------------------------------------------------- |
| `cn.test.ts`               | 6         | 클래스명 조합 유틸 (`cn`)                                           |
| `date.test.ts`             | 6         | 날짜 포맷 유틸 (`formatDate`, `getYear`)                            |
| `random.test.ts`           | 8         | 랜덤 요소 생성 (`generateRandomElements`, `generateRandomDroplets`) |
| `mobileCheck.test.ts`      | 6         | 모바일 레이아웃 판별 (`checkMobileLayout`)                          |
| `renderHighlight.test.tsx` | 4         | 하이라이트 마크업 변환 (`renderHighlight`)                          |

설정 파일: `vitest.config.ts`, 테스트 위치: `src/__tests__/`

---


</details>

> **컴포넌트 상세**: [StaggerText · BreakpointGuard · Modal](./docs/components.md)

## Trouble Shooting

> 개발 과정에서 마주친 46건의 이슈 중 핵심 13건만 추려 About 페이지에서 노출 (난이도 + 일반화 가능성 기준, `HIDDEN_PROBLEMS` Set 으로 필터 — 데이터는 보존되어 언제든 다시 노출 가능). 6개 섹션(아키텍처 / 성능 / 레이아웃 / Plate 에디터 / 애니메이션·인터랙션 / 컴포넌트) + 난이도(1~3) + 추천(★) 표시. 주요 항목은 아래에서, 전체 목록은 **[docs/troubleshooting.md](./docs/troubleshooting.md)** 또는 About 페이지에서 확인할 수 있습니다.

| # | 이슈 | 핵심 |
|:---:|:---|:---|
| 4 | GSAP ScrollTrigger 수평 무한 스크롤 | 프로젝트 세트 래핑 + 스크롤 위치 순간 이동으로 이음새 없는 양방향 무한 루프 |
| 5 | Lighthouse reCAPTCHA 지연 로딩 | 스크립트 로딩을 폼 인터랙션까지 지연하여 LCP 7.2s → 1.9s |
| 12 | 전체 성능 최적화 (Lighthouse 60→98) | react-icons→SVG, Three.js dynamic import, About 패널 코드 스플리팅 — 페이지 1,489KB→449KB |
| 19 | 글로벌 theme transition이 컴포넌트 애니메이션 덮어쓰기 | compound selector (0,2,0)로 specificity 역전 — max-height, transform 등 개별 transition 복원 |
| 32 | LoadingScreen SSR 미포함 → 콘텐츠 flash | dynamic({ ssr: false }) → 일반 import으로 서버 HTML에 로딩 배경 포함 |
| 33 | CTA 버튼 backdrop-filter가 Chrome에서 동작 안 함 | `.home` entrance 애니메이션을 `y: transform` → `marginTop: layout` 으로 교체 — 상위 transform이 만든 compositing layer 때문에 backdrop 샘플링이 차단되던 이슈. `-webkit-backdrop-filter` 접두사도 Chrome에서 역으로 파싱을 꼬이게 해서 제거 |
| 34 | Portal 기반 드롭다운에서 CSS transition 미작동 | mount 시 이미 open 상태 클래스가 적용되어 초기값=최종값이 됨 — `animateOpen` state + rAF×2 지연으로 mount→close→open 순서 보장, compound selector(0,2,0)로 글로벌 theme transition 우회 |
| 35 | mix-blend-mode: difference 자식 요소 색상 강제 | parent에 difference를 걸면 자식 전체가 blending되어 개별 override 불가 — 제목/카테고리만 difference 적용 div에 두고 설명/상세는 별도 형제 요소(overlay)로 분리, JS rAF에서 동일 위치 동기화 |
| 36 | About 페이지 첫 패널 시작 위치 오류 | dynamic import 패널의 skeleton 너비와 실제 너비 불일치(ErdPanel: 350vw→100vw) + strict mode cleanup에서 GSAP transform/animate 리셋 제거 + initializedRef guard |
| 37 | Plate 인라인 코드 커서 점프 | CodePlugin의 affinity 오버라이드("directional")가 기본값("hard")의 mark 경계 처리를 무력화 — 설정 제거로 해결 |
| 38 | Admin 테이블 모바일 가로 스크롤 시 row border 중간 끊김 | `.row`/`.tableHeader`/`.bulkBar`가 독립된 grid 컨테이너라 track 확장이 row별로 따로 계산 — header에는 `col.className` 누락으로 title track 미확장, row만 확장되어 너비 불일치 발생. 헤더에도 `col.className` 적용 + `.tableInner` wrapper(`display: flex; width: max-content; min-width: 100%`)로 모든 자식을 가장 넓은 row 너비로 stretch하여 border 연속성 확보 |
| 39 | Page transition hold 멈춤 + morph 후 skeleton 노출 | DetailLayout hero motion 의 `onAnimationStart` 에 endTransition 을 묶었는데 `initial===animate`(opacity:1) 일 때 framer-motion 이 콜백을 안 부름 → hold 영구 정체. morph 가 새 페이지 mount 전에 끝나 Suspense fallback 노출. 해결: `onAnimationStart` → `useEffect` 기반 endTransition 으로 교체, hold 단계에서 backdrop fullscreen 유지로 스켈레톤 가림, `SAFETY_MS=5000` 안전망 + `endRequestedRef` short-circuit |
| 40 | CSS Grid masonry — `grid-template-rows` 만으로는 카드별 높이 차이가 빈칸을 만듦 | bento 의 wide / banner / square / portrait variant 가 섞이면 row track 이 가장 큰 카드 기준으로 잡혀 빈 셀 발생. 해결: `grid-auto-rows: 1px` 로 잘게 쪼개고 JS 가 각 카드 `firstElementChild.scrollHeight` 측정 → `grid-row: span N` (N=ceil(h/rowUnit))을 동적으로 부여. `grid-auto-flow: dense` 로 작은 카드가 빈 자리에 backfill. ResizeObserver + 이미지 onLoad 로 재계산 |
| 41 | sticky filterBar IntersectionObserver — 인기글 위젯과 1px 어긋남 | sentinel 의 `rootMargin` 을 고정값으로 두면 filterBar 의 `top: var(--nav-height)` 같은 동적 sticky 오프셋과 불일치. `getComputedStyle(filterBar).top` 으로 실측한 값을 `rootMargin: -${stickyTop+1}px 0px 0px 0px` 로 동기화하고, `resize` 이벤트마다 observer 를 재등록해 PC ↔ 모바일 nav-height 변화에도 정확히 anchor |
| 42 | Series Deck — hover 펼침이 "사라졌다 나타나는" 느낌 | CSS `transition-delay` 로 stagger 를 주면 hover out 시 delay 가 같이 cancel 되어 layer 가 동시 사라짐 + transform overshoot 이징(0.34, 1.45)에서 미리 펼쳐 보임. 해결: `setTimeout(setOpen, 800)` JS state 기반 트리거 + `cubic-bezier(0.4, 0, 0.2, 1)` standard ease + `calc(1s + (var(--deck-i) - 1) * 0.4s)` 명시적 stagger 로 layer 가 한 장씩 완전히 펼쳐진 뒤 다음 layer 시작 |
| 43 | Deck spread 시 setPointerCapture 가 자식 click 차단 + flicker | 부모가 `setPointerCapture` 를 잡으면 펼쳐진 deck layer 의 click 이 부모로 흡수되어 SeriesCard 클릭이 안 됨. margin-right 만으로 next 카드를 밀면 visual 만 이동, 실제 hit-area 는 안 늘어나 마우스가 layer 사이로 빠지면 hover 종료 → flicker. 해결: `setPointerCapture` 제거 + document-level `pointermove`/`pointerup` 로 이동 (click suppression flag), `::after { width: <펼쳐진 너비> }` pseudo 로 hit-area 를 layer 끝까지 확장 |
| 44 | HTML5 drag 가 pointermove 를 막아 커스텀 커서가 멈추고 type 도 계속 바뀜 | 브라우저는 HTML5 drag 동안 `pointermove` 발화를 시스템 차원에서 억제하고 그 자리를 `dragover` 가 채움 — CursorTrail 이 freeze 되고, hit-test 도 hover 한 요소에 따라 cursor type 이 흔들림. 해결: `dragover` 를 `handleMouseMove` 로 forward 해 좌표 stream 복원 + `dragstart` 시점에 `cursorType="grab"` lock + `runHitTest` 진입부 early-return |
| 45 | HTML5 D&D quirks 회피 — chip 드래그 정렬을 pointer 기반으로 전환 | `draggable={dragId === id}` state 토글이 React batching 과 안 맞아 드래그 시작 안 되고, "앞→뒤" 만 비대칭 실패, 페이지네이션된 list 에서 source unmount 시 drag cancel 등 quirks 누적. 해결: handle `pointerdown` → document `pointermove`/`pointerup` 추적 + `elementFromPoint` hit-test, 페이지 edge hover 시 `apply()` 로 reorder 자체 수행해 source 가 살아남도록 함, `setPointerCapture` 미사용 (자식 click 보존) |
| 46 | Navigation 메뉴가 좁은 viewport 에서 우측 actions 와 겹침 + indicator 가 resize 중 메뉴 위치 못 따라감 | viewport 정중앙 absolute 고정은 좌·우 cluster 폭을 모름 → 겹침. flex 로 옮긴 뒤엔 indicator 의 `transition: left ... var(--duration-moderate)` lag 으로 메뉴 위치보다 ~300ms 뒤처짐. 해결: `.navCenter { flex: 1; justify-content: center }` 로 좌·우 사이 가운데 배치, resize event + `ResizeObserver(navCenter+nav)` 발화 시 `transition: "none"` inline 으로 즉시 snap, 120ms 디바운스 후 transition 복원 |
| 47 | 이미지 깨짐 placeholder — `dangerouslySetInnerHTML` 로 렌더된 markdown img 에는 React onError 가 안 붙음 | React 합성 이벤트는 `dangerouslySetInnerHTML` 영역 밖이고, 이미 fetch 가 끝난 img 는 `error` 가 retroactive 발화 안 됨, dynamic 추가 img 도 querySelectorAll 단발로 못 잡음. 해결: `attachImageFallback(root)` — 컨테이너 내 모든 img 에 `data-fallback-bound` gate + `addEventListener("error")` + 즉시 `complete && naturalWidth===0` 체크 + MutationObserver 로 새 img 자동 추적, swap 시 `removeAttribute("srcset")` 로 srcset 재시도 차단 |
| 48 | `.row { grid-template-columns: 1fr 1fr }` 안의 cover 팔레트가 viewport 밖으로 잘려 나감 | `1fr` 은 `minmax(auto, 1fr)` 의 단축형 — 자식이 trim 안 되면 `min-width: auto` 가 intrinsic content size 를 잡아 트랙이 부풀고 50:50 비율이 무너짐. 해결: 트랙을 `minmax(0, 1fr) minmax(0, 1fr)` 로 명시 + `min-width: 0`. 모바일 break 도 동일하게 `minmax(0, 1fr)` 로 통일하고, 안쪽 `.palette` 에는 `flex-wrap: wrap` + `max-width: 100%` 로 swatch 자체도 wrap 가능하게 보강 |
| 49 | ColorPicker popover 가 trigger 위치에 안 붙음 — wrapper `<span>` 이 0×0 으로 collapse | render-prop 으로 받은 trigger 자식이 `position: absolute`(stop handle) 면 normal flow 에서 빠져 wrapper 자체가 0×0 → 모든 stop 의 popover 좌표가 동일. 해결: `updatePos` 가 wrapper rect 대신 **`firstElementChild.getBoundingClientRect()`** 를 우선 사용, 자식 rect 도 0 이면 wrapper rect 로 fallback — 일반 swatch / absolute handle 둘 다 정확히 anchor |


## 배포

### Vercel (권장)

1. [Vercel](https://vercel.com)에서 GitHub 레포를 Import
2. **Environment Variables**에 `.env.local`과 동일한 키-값 추가
3. **Deploy** 클릭 — 빌드 설정은 자동 감지됨

```
필수 환경변수:
  NEXT_PUBLIC_SUPABASE_URL
  NEXT_PUBLIC_SUPABASE_ANON_KEY
  SUPABASE_SERVICE_ROLE_KEY

선택 환경변수:
  UNSPLASH_ACCESS_KEY          # Cover Image — Unsplash
  HUGGINGFACE_API_KEY          # Cover Image — AI (HuggingFace)
  NANOBANANA_API_KEY           # Cover Image — AI (NanoBanana)
  DEEPL_API_KEY                # 번역 — DeepL
  GOOGLE_TRANSLATE_API_KEY     # 번역 — Google
  GEMINI_API_KEY               # 번역 + AI 요약 — Gemini
  OPENAI_API_KEY               # AI 요약 — OpenAI
  ANTHROPIC_API_KEY            # 번역 + AI 요약 — Claude
```

> `main` 브랜치에 push할 때마다 자동 배포됩니다. PR을 생성하면 Preview 배포가 별도로 생성됩니다.

### 기타 플랫폼

Next.js를 지원하는 플랫폼이면 배포 가능합니다. 자세한 내용은 [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying)을 참고하세요.

## 디자인 시스템

CSS 토큰 3-레이어 구조, 클래스 네이밍 규칙, 특이도 가이드라인 등 스타일 관련 모든 규칙은 **[docs/design-system.md](./docs/design-system.md)** 에 문서화되어 있습니다.

### 개요

| 레이어 | 위치 | 접두사 | 역할 |
|--------|------|--------|------|
| Raw Tokens | `src/styles/tokens/` | `--color-*`, `--spacing-*` 등 | 원시 값 |
| Semantic Tokens | `src/styles/globals/_semantic.css` | `--text-*`, `--bg-*`, `--border-*` | 의미 부여 |
| Context Tokens | CSS Module 내 | `--_*` | 컴포넌트 스코프 |

**클래스 네이밍**: CSS Modules + camelCase (BEM 미사용)
**핵심 규칙**: context 토큰은 반드시 글로벌 토큰 참조 / var() fallback 금지 / hex 직접 사용 금지
**디자인 시스템 미리보기**: `/design-system` 라우트

---

## 커밋 컨벤션

[Conventional Commits](https://www.conventionalcommits.org/ko/v1.0.0/) 규칙을 따릅니다. 상세: **[docs/commit-convention.md](./docs/commit-convention.md)**

---

<div align="center">

## 라이선스

[PolyForm Noncommercial License 1.0.0](./LICENSE)

자유롭게 사용·수정·배포 가능하나, **상업적 이용은 불가**합니다.

</div>
