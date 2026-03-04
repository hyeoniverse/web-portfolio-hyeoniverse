# Web Portfolio - Oval

개인 포트폴리오 웹사이트입니다. Next.js 15, React 19, TypeScript로 구축되었으며, GSAP, Framer Motion, Lenis를 활용한 인터랙티브 애니메이션이 특징입니다.

## 기술 스택

- **Framework**: Next.js 15 (App Router)
- **Library**: React 19
- **Language**: TypeScript
- **Animation**: GSAP + ScrollTrigger, Framer Motion
- **3D**: Three.js, React Three Fiber, Drei
- **Scroll**: Lenis Smooth Scroll
- **Styling**: CSS Modules, CSS Variables
- **Typography**: Instrument Serif, Space Grotesk, JetBrains Mono (관리자 설정에서 카테고리별 30+ 프리셋 + Google Fonts 직접 입력 지원)
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **Editor**: Tiptap (WYSIWYG), Marked (Markdown)
- **AI Image**: NanoBanana / Hugging Face (설정으로 선택)

## 주요 기능

- **Infinite Scroll Loop**: Lenis smooth scroll과 Bridge Section을 결합한 무한 순환 스크롤
- **Mouse Parallax**: Framer Motion useSpring/useTransform 기반 마우스 반응형 패럴랙스
- **Scroll-Triggered Animations**: GSAP ScrollTrigger를 활용한 스크롤 기반 등장 애니메이션
- **Scroll Velocity Parallax**: Lenis velocity를 활용한 스크롤 속도 기반 이미지 패럴랙스
- **Mix-Blend Navigation**: mix-blend-mode: difference를 활용한 자동 반전 네비게이션
- **StaggerText**: 호버 시 글자별 순차 애니메이션 효과 컴포넌트
- **Works Horizontal Gallery**: GSAP 기반 가로 스크롤 갤러리, 양방향 무한 스크롤 래핑, 인트로 인플로우 배치, 언어 전환 레이아웃 안정화
- **3D Scroll Torus**: Three.js(React Three Fiber) 기반 3D 메탈릭 토러스가 스크롤에 연동되어 리사주 곡선 경로를 따라 회전·이동. Lenis 누적 스크롤 추적, 테마별 머티리얼, 모바일 최적화(geometry 간소화, 스케일 축소). 모바일에서는 터치/클릭 반발 인터랙션 지원 (Canvas pointer-events 차단으로 window 이벤트 수동 추적)
- **Breakpoint Guard**: 뷰포트가 breakpoint(768px, 1024px)를 넘을 때 페이지 콘텐츠를 자동 remount하여 GSAP/ScrollTrigger 등 레이아웃 의존 애니메이션을 재초기화. R3F 호환 전환 오버레이로 깜빡임 없는 리사이즈 전환
- **About 가로 스크롤**: Webflow 페이지와 통합된 `useHorizontalScroll` 훅으로 About 페이지에서도 GSAP 기반 가로 스크롤 적용 (데스크톱), 모바일에서는 자동 세로 스택
- **번들 최적화**: react-icons를 inline SVG로 교체, Three.js 데모를 dynamic import로 분리하여 about 페이지 First Load JS 326kB→272kB 절감. 미사용 npm 패키지 정리, 미사용 대용량 이미지(22MB) 삭제
- **성능 최적화**: Hero/마퀴 애니메이션을 Framer Motion/GSAP에서 CSS animation으로 전환(컴포지터 스레드), useMagneticRepel을 ref 기반 직접 DOM 조작으로 변경(60fps 리렌더 제거), Three.js FrontSide 렌더링 + geometry dispose, AudioContext 지연 초기화
- **Posts (Blog)**: Supabase 기반 포스트 작성/관리 시스템. 목록 페이지는 Server Component로 초기 데이터를 서버 사이드 렌더링하고 ISR(`revalidate = 60`)로 CDN 캐시. 상세 페이지는 `generateStaticParams`로 빌드 시 정적 생성(`revalidate = 300`). Admin 로그인 후 Markdown/Rich Text(Tiptap) 전환 가능한 에디터로 아티클 작성. 이미지 삽입 후 정렬(좌/중앙/우) 및 크기(25%/50%/75%/100%) 조절 가능. 게스트 대댓글(threaded) 지원, 이중 인증(commenter_hash + bcrypt 비밀번호)으로 수정/삭제. Works 상세에서도 동일한 댓글 시스템 지원. 검색, 태그 필터, 커버 이미지, 조회수 추적
- **시리즈(Series)**: 포스트를 시리즈로 묶어 순서대로 발행하는 기능. 시리즈는 카테고리의 하위 요소로, 각 시리즈는 하나의 카테고리에 소속됩니다. 포스트 목록에서 "Posts" / "Series" 뷰 토글로 시리즈 카드 그리드를 별도로 탐색할 수 있으며, 카테고리 선택 시 해당 카테고리의 시리즈만 표시됩니다. 시리즈 카드 클릭 시 해당 시리즈의 포스트만 필터링하여 표시. 포스트 상세 페이지에서 시리즈 네비게이션(이전/다음 글 + 전체 목록 접기/펼치기) 표시. Admin에서 시리즈 CRUD + 카테고리 관리
- **IP 기반 좋아요**: Posts, Works, 댓글(post/work)에서 좋아요 기능 지원. 단일 `likes` 테이블에서 `target_type`('post'|'work'|'post_comment'|'work_comment')으로 구분하고, IP 주소 기반 `UNIQUE` 제약으로 중복 방지 및 토글 처리. Posts는 목록 조회 성능을 위해 `posts.like_count` 캐시 컬럼에 동기화
- **Cover Image Picker**: 포스트·시리즈·작업물 커버 이미지를 3가지 방식으로 선택 가능 — 16종 프리셋 그라데이션(Canvas API 렌더), Unsplash 키워드 검색, AI 이미지 생성(NanoBanana / Hugging Face 중 선택 가능). 모든 이미지는 Supabase Storage에 저장
- **Works Admin CRUD**: Supabase DB 기반 포트폴리오 작업물 관리. Admin에서 작업물 생성/수정/삭제, 발행 토글, 정렬 순서 변경 가능. 단일 콘텐츠 에디터(Markdown/Rich Text 전환) + 템플릿 삽입 방식으로 프로젝트 기술서 작성. 템플릿 8개 섹션: Overview, Background, Key Features, Architecture, Challenges, Solutions, Results, Lessons Learned. 한/영 이중 언어, 기술 스택, 갤러리 이미지, 팀 멤버(이름·역할 한/영·URL) 지원. 상세 페이지에서 콘텐츠 내 `##` 헤딩을 자동 파싱하여 TOC 생성. DB 미연결 시 정적 데이터(`data/projects.ts`)로 자동 fallback
- **Profile Admin**: 프로필 데이터(경력, 스킬, 철학, 접근법, 자격증, 수상) Admin 편집. Settings > Content > Profile 서브탭에서 관리. `site_settings` 테이블에 JSONB로 저장. DB 미연결 시 정적 데이터 fallback
- **방문자 통계**: IP+날짜 기반 일간·누적 방문자 카운터. Footer에 실시간 표시
- **Admin Dashboard**: Supabase Auth 기반 어드민 시스템. 포스트/작업물 CRUD, 발행/비공개 전환, 이미지 업로드(Supabase Storage). Layout 레벨 인증으로 `/admin` 경로 보호, 미인증 시 접근 거부 페이지 표시. 로그인 페이지 i18n 지원, 이메일 기억 기능, Input/Checkbox 공통 컴포넌트 활용. 네비게이션에 Admin 배지 + 관리자 이메일 표시. 삭제 시 제목 입력 확인 모달, 발행 상태 토글 체크박스
- **사이트 콘텐츠 관리**: Admin Settings에서 5개 탭(General, Content, Appearance, Services, Account)으로 관리. Content 탭은 사이드 네비게이션으로 Home/Profile/About/Posts/Works 서브탭 분리. Hero 카피, About 인트로, Services, Marquee, Works 인트로, Profile 콘텐츠를 EN/KO 이중 언어로 편집 가능. Services 탭에서 API 키(환경변수)를 DB에 저장·관리하고, 번역 프로바이더(DeepL/Google/Gemini) 선택 가능. Account 탭에서 관리자 이메일/비밀번호 변경 지원(비밀번호 확인 모달). Settings 저장 시 BroadcastChannel로 다른 탭 자동 새로고침. `site.config.ts`를 기본값으로 사용하며 DB 오버라이드 지원
- **자동 번역**: 에디터에서 언어 전환 시 대상 언어가 비어있으면 자동 번역. DeepL API Free(기본), Google Cloud Translation, Gemini 2.0 Flash 중 Settings에서 선택. 재번역 버튼으로 전체/개별 필드 재번역 가능. 번역 중 언어 토글 차단으로 중복 요청 방지
- **이중언어 카테고리 관리**: Posts와 Works 카테고리를 `{ ko, en }` 이중언어 쌍으로 관리. Admin Settings의 Content 탭에서 추가/삭제/드래그 순서 변경 가능. 카테고리 삭제 시 소속 포스트를 시리즈 단위/개별로 일괄 재할당하는 모달. DB에는 `ko` 값을 저장하고, 기존 `string[]` 형식과 자동 호환(정규화). 공개 페이지(CategoryNav)와 에디터(PostEditor, WorkEditor, SeriesEditorModal)에서 현재 언어에 맞는 라벨 표시
- **시리즈 편집 모달**: Post 에디터에서 시리즈 선택 후 Edit 버튼으로 제목/설명/커버 이미지/카테고리/발행 상태를 인라인 모달에서 편집 가능. 커버 이미지는 CoverImagePicker(프리셋/Unsplash/AI)로 선택 가능. 시리즈 내 포스트 목록 표시·드래그 순서 변경·연결 해제 지원. 신규 시리즈 생성도 모달로 처리. Settings 시리즈 목록은 페이지당 5개씩 페이징 처리
- **에디터 리비전 히스토리**: Posts/Works 에디터의 자동저장 시 `revisions` DB 테이블에 폼 전체를 JSONB snapshot으로 영구 저장. 탭을 닫거나 다른 기기에서 접속해도 리비전 히스토리 유지. 목록 조회 시 snapshot 제외로 경량 로딩, 상세 보기 시 lazy fetch. 현재 폼과의 diff(LCS 기반 라인 비교) 표시, Revert 버튼으로 초기 상태 복원. 개별 리비전 삭제 지원(리스트·상세 뷰). 상세 보기에서 카테고리·태그·시리즈 등 메타 항목도 diff 비교 표시. 이전 snapshot과 동일하면 저장 스킵(중복 방지). 엔티티당 50개 초과 시 자동 정리
- **CTA 이력서 다운로드**: Home 페이지 CTA 영역에 이력서 다운로드 버튼 표시. Admin Settings에서 PDF 업로드(5MB 제한, Supabase Storage) 및 버튼 텍스트 한/영 편집 가능. `resumeUrl`이 비어있으면 버튼 미표시
- **소셜 링크 관리**: CTA 영역에 소셜 아이콘(GitHub, LinkedIn, Blog, X, Instagram, YouTube, Behance, Dribbble, Custom) 표시. Admin Settings에서 순서 변경·추가·삭제 가능(최대 6개). `socialLinks` 배열과 기존 `social` 객체 자동 호환
- **Carousel (default / cylinder)**: 공통 Carousel 컴포넌트. default 모드(AnimatePresence 슬라이드 전환)와 cylinder 모드(3D perspective + 사이드 슬라이드 어둡게) 지원. autoPlay, pauseOnHover, arrows, dots, loop
- **Posts 배너 슬라이더**: 피닝된 포스트를 배너로 표시. 4가지 레이아웃(fullwidth·split·cards·ticker) + 4가지 오버레이 스타일(editorial·minimal·cinematic·magazine) + 2가지 전환 모드(default·cylinder). Admin Settings에서 선택 가능
- **Posts 필터 바**: 카테고리 접기/펼치기(+N more), hover indicator 애니메이션(layoutId), sticky 상태 감지(IntersectionObserver), 스크롤 방향에 따라 필터 바 숨김/표시 + 자동 접기, 카테고리/태그 펼칠 때 콘텐츠 영역 blur 효과(ContactDrawer와 동일 기법)
- **Tooltip & Translation Tooltip**: 범용 Tooltip UI 컴포넌트(`<Tooltip>`)와 번역 tooltip 컴포넌트(`<T>`). `<T k="key" />`로 텍스트를 렌더하면 long hover(600ms) 시 반대 언어 번역을 tooltip으로 표시. createPortal + position: fixed로 stacking context 회피, 모바일 자동 비활성화. Navigation 링크에 페이지 설명 tooltip, 언어/테마/사운드 버튼에 기능 설명 tooltip 적용
- **Posts i18n & Sort Capsule**: Posts 페이지의 모든 하드코딩된 텍스트를 locale 파일(`postsPage` 섹션)로 이동. 정렬 UI를 Select 드롭다운에서 캡슐형 세그먼트 컨트롤(Framer Motion layoutId 애니메이션)로 변경
- **Footer Sliding Indicator**: Navigation과 동일한 슬라이딩 인디케이터를 Footer 링크에 적용. hover 시 ►◀ 화살표가 인디케이터와 함께 해당 링크로 이동
- **Design System 프리뷰**: `/design-system` 라우트로 토큰/컴포넌트/배너 레이아웃 확인. Admin Settings 외관 탭 + About 페이지 Design System 패널 + CreditsFooter(panel)에서 진입 가능. Tooltip/T 컴포넌트 섹션, Select 컴포넌트 섹션, Gradient Tokens 섹션 추가. 3-phase scroll 애니메이션 시스템(Phase 1: 숨김 → Phase 2: 순차 등장 → Phase 3: whileInView 스크롤 기반 등장/소멸) 적용. staggerItemX(좌→우 등장/우→좌 소멸), staggerItem(위→아래) 방향별 stagger 지원

## Security

모든 공개 API 엔드포인트에 다층 보안 검증을 적용합니다.

| 보안 레이어 | 구현 방식 | 적용 범위 |
|------------|-----------|----------|
| **SQL Injection 방지** | Supabase 파라미터화 쿼리 (prepared statements) | 모든 DB 쿼리 |
| **XSS 방지** | React JSX 자동 이스케이프 (dangerouslySetInnerHTML 미사용) | 모든 사용자 입력 렌더링 |
| **입력 검증** | UUID 포맷 검증, 길이 제한, 제어문자 제거, 이메일 포맷 검증 | 모든 공개 API |
| **인증** | 댓글 이중 인증 (commenter_hash + bcrypt password), Supabase Auth (admin) | 댓글 수정/삭제, 관리자 |
| **RLS** | Supabase Row Level Security 정책 | 모든 테이블 |
| **경로 보호** | Layout 레벨 Supabase Auth 세션 확인 + 접근 거부 페이지 | `/admin/*` |
| **중복 방지** | IP 기반 UNIQUE 제약조건 | 좋아요, 방문자 통계 |
| **비밀번호 보안** | bcrypt (salt round 10), 72바이트 제한 | 댓글 비밀번호 |

**검증 대상 API:**

| 엔드포인트 | 검증 항목 |
|-----------|----------|
| `POST/PATCH /api/comments` | UUID, content (2000자), password (72B), 제어문자 제거 |
| `POST/PATCH /api/work-comments` | UUID, content (2000자), password (72B), 제어문자 제거 |
| `DELETE /api/comments/[id]` | UUID 포맷 검증 |
| `DELETE /api/work-comments/[id]` | UUID 포맷 검증 |
| `POST /api/comment-likes` | UUID, comment_type enum 검증 |
| `GET/POST /api/posts/[id]/like` | UUID 포맷 검증 |
| `GET/POST /api/works/[id]/like` | UUID 포맷 검증 |
| `POST /api/contact` | 이름 (100자), 이메일 포맷/길이, 메시지 (5000자) |
| `POST /api/translate` | 텍스트 (2000자), targetLang enum |

## DB 설계 결정

### 통합 좋아요 테이블: `likes`

모든 좋아요(포스트, 작업물, 포스트 댓글, 작업물 댓글)를 단일 `likes` 테이블에서 `target_type`으로 구분합니다.

**검토한 대안:**

| 방식 | 장점 | 단점 |
|------|------|------|
| **단일 테이블** (현재 구조) | Single Source of Truth, 하나의 UNIQUE 제약으로 전체 중복 방지, 새 엔티티 추가 시 CHECK 값 하나만 추가 | `target_type`이 4개 |
| **완전 분리** (post_likes, work_likes, ...) | 쿼리 단순 | 테이블 과다, 스키마 중복 |
| **2테이블** (likes + comment_likes) | 콘텐츠/댓글 관심사 분리 | 동기화 로직 분산, 테이블 수 증가 |

**선택 근거:** `UNIQUE(target_type, target_id, ip)` 하나로 모든 엔티티의 중복을 DB 레벨에서 차단합니다. 댓글 좋아요는 실시간 `COUNT(*)` 쿼리로 조회하고, Posts만 목록 성능을 위해 `posts.like_count` 캐시 컬럼에 동기화합니다. 인덱스가 적용된 상태에서 수천 건까지 성능 차이가 없으므로, 정합성과 단순성을 우선합니다.

### 비정규화 카운트 캐싱: `posts.like_count`

`likes` 테이블이 좋아요의 **source of truth**이고, `posts.like_count`는 목록 조회 성능을 위한 **캐시 컬럼**입니다.

| 엔티티 | 카운트 방식 | 근거 |
|--------|------------|------|
| **Posts** | `posts.like_count` 캐시 컬럼 동기화 | 목록 조회 시 JOIN 없이 즉시 표시 |
| **Works / 댓글** | 실시간 `COUNT(*)` 쿼리 | 목록에서 카운트 불필요, 상세 페이지에서만 조회 |

**선택 근거:** 포트폴리오 사이트는 읽기 >> 쓰기 비율입니다. Posts만 목록에서 좋아요 수를 표시하므로 캐시 컬럼이 필요하고, 나머지는 실시간 조회로 충분합니다.

### 에디터 리비전 히스토리: `revisions`

Posts/Works 에디터의 자동저장 시 폼 전체를 JSONB snapshot으로 영구 저장하는 다형적 테이블입니다.

**검토한 대안:**

| 방식 | 장점 | 단점 |
|------|------|------|
| **별도 DB 테이블** (현재 구조) | 기기·탭·세션 간 영속, 엔티티별 자동 정리, diff 비교 가능 | 자동저장마다 DB 쓰기 발생 |
| **sessionStorage** (이전 구조) | 즉시 접근, DB 부하 없음 | 탭 닫으면 소멸, 기기 간 공유 불가 |

**선택 근거:** 포트폴리오 관리자(1인)가 사용하므로 자동저장 빈도(5초 debounce)의 DB 쓰기는 무시 가능. 기기·탭·세션 간 리비전 공유와 diff 기반 상세 비교가 더 중요합니다. `entity_type` CHECK 컬럼으로 posts/works를 단일 테이블에서 구분하고, 목록 조회 시 snapshot을 제외하여 경량 로딩합니다. JSON.stringify 해시 비교로 동일 snapshot 중복 저장을 방지하며, 상세 뷰에서 카테고리·태그·시리즈 등 메타 항목도 diff로 표시합니다.

### 익명 댓글 이중 인증

로그인 없는 댓글 시스템에서 수정/삭제 권한을 **2개 경로**로 검증합니다.

| 인증 경로 | 저장 위치 | 지속성 | 용도 |
|-----------|----------|--------|------|
| `commenter_hash` | 브라우저 localStorage UUID → SHA-256 | 같은 브라우저에서 영구 | 자동 인증 (비밀번호 입력 불필요) |
| `password_hash` | bcrypt (salt round 10) | 사용자가 기억하는 한 영구 | 다른 기기/브라우저에서 인증 |

**왜 둘 다 필요한가:** `commenter_hash`만 있으면 브라우저 변경 시 수정 불가. `password`만 있으면 매번 입력 필요. 병행하면 같은 브라우저에서는 자동 인증, 다른 환경에서는 비밀번호 fallback으로 UX와 보안을 모두 확보합니다.

## User Flow

### 방문자 플로우

```
Home → Works 갤러리(가로 스크롤) → Work 상세(좋아요)
     → Posts 목록(검색/태그 필터) → Post 상세(좋아요/댓글)
     → Profile → About(기술 문서)
```

- **Works**: 가로 스크롤 갤러리에서 프로젝트를 탐색하고, 상세 페이지에서 IP 기반 좋아요를 남길 수 있습니다
- **Posts**: 태그/검색으로 블로그 글을 필터링할 수 있습니다. 카테고리를 선택하면 해당 카테고리의 시리즈가 책 모양 카드로 표시되며, 시리즈를 클릭하면 소속 포스트만 필터링됩니다. 상세 페이지에서 좋아요와 게스트 댓글(이중 인증: 브라우저 UUID + 비밀번호)을 남길 수 있으며, 시리즈 소속 글에서는 이전/다음 글 네비게이션이 표시됩니다
- **About**: 가로 스크롤로 14개 패널(프로젝트 개요, 유저 플로우, 아키텍처, 기능, 디자인 컨셉, 개발 프로세스, 기술 스택, 백엔드, ERD, 코드 하이라이트, 트러블슈팅)을 순회합니다. UserFlow 패널은 9개 플로우(Visitor, Posts, Works, Profile, Contact, Comment, Admin/Settings, Admin/Settings/Appearance, Admin/Posts·Works)를 탭+SVG 다이어그램으로 시각화, ERD 패널은 DB 테이블 관계도를 인터랙티브하게 표시

### 관리자 플로우

```
/admin 직접 접속 → Supabase Auth 로그인 → Settings 리다이렉트
→ 포스트 작성(Markdown/Rich Text 전환) → 커버 이미지 선택(프리셋/Unsplash/AI) → 시리즈 선택(선택사항) → 발행
→ 작업물 관리(/admin/works) — 생성, 수정, 삭제, 발행/비공개 전환, 정렬 순서 변경
→ 사이트 설정(/admin/settings) — General(브랜드, SEO), Content(Home/Profile/About/Posts/Works 서브탭), Appearance(테마·타이포그래피), Services(API 키 관리), Account(이메일/비밀번호 변경)
```

- 로그인 버튼 없이 URL 직접 접속 방식
- Layout 레벨 Supabase Auth 세션 검증 — 미인증 시 `/admin/denied` 접근 거부 페이지로 리다이렉트

## 시작하기

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

[http://localhost:3000](http://localhost:3000)에서 결과를 확인할 수 있습니다.

---

## Supabase 세팅 가이드

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

**생성되는 테이블 (10개):**

| 테이블 | 용도 |
|--------|------|
| `site_settings` | 사이트 설정 + 프로필 데이터 + secrets/API 키 (JSONB) |
| `series` | 블로그 시리즈 |
| `posts` | 블로그 포스트 |
| `comments` | 포스트 댓글 (대댓글, 이중 인증: commenter_hash + password) |
| `likes` | 좋아요 (포스트/작업물/댓글 통합, target_type으로 구분, IP 중복 방지) |
| `works` | 포트폴리오 작업물 (team_members jsonb 포함) |
| `site_visits` | 방문자 통계 (IP+날짜 1회) |
| `work_comments` | Works 댓글 (대댓글, 이중 인증) |
| `admin_notifications` | 관리자 알림 로그 |
| `revisions` | 에디터 리비전 히스토리 (posts/works 공용, JSONB snapshot) |

> `IF NOT EXISTS`를 사용하므로 이미 존재하는 테이블은 건너뜁니다. 기존 배포 DB에 누락된 컬럼(commenter_hash, updated_at 등)은 파일 하단의 마이그레이션 섹션에서 `ALTER TABLE ADD COLUMN IF NOT EXISTS`로 안전하게 추가됩니다.

> **Supabase 없이도 동작**: 환경변수가 설정되지 않으면 Works(`data/projects.ts`), Profile(`data/profile.ts`), Settings(`config/site.config.ts`)의 정적 데이터로 자동 fallback됩니다.

**주요 API 엔드포인트:**

> **Posts API**: `GET/POST /api/posts`, `GET/PATCH/DELETE /api/posts/[id]`, `POST /api/posts/[id]/view`, `GET/POST /api/posts/[id]/like`
>
> **Series API**: `GET/POST /api/series`, `GET/PATCH/DELETE /api/series/[id]`
>
> **Works API**: `GET/POST /api/works`, `GET/PATCH/DELETE /api/works/[id]`, `GET/POST /api/works/[id]/like`
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

포스트 커버 이미지 및 본문 이미지 업로드용:

1. Supabase Dashboard → **Storage**
2. **New bucket** 클릭
3. 버킷 이름: `posts`
4. **Public bucket** 체크 (이미지를 공개 URL로 접근 가능하게)
5. **Create bucket**

**Storage 정책 설정:**

```sql
-- 인증된 사용자만 업로드 가능
CREATE POLICY "Authenticated users can upload"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'posts' AND auth.role() = 'authenticated');

-- 누구나 읽기 가능 (public bucket)
CREATE POLICY "Anyone can view uploads"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'posts');
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

- `/admin/posts` — 포스트 목록 (발행/비공개 상태 확인, 호버 미리보기)
- `/admin/posts/new` — 새 포스트 작성 (Markdown ↔ Rich Text 전환, 자동 번역, 재번역, 자동 저장 + DB 리비전 히스토리 + diff 비교 + Revert)
- `/admin/posts/[id]/edit` — 기존 포스트 수정
- `/admin/works` — 작업물 목록 (테이블 뷰, 발행/비공개 토글, 정렬 순서)
- `/admin/works/new` — 새 작업물 생성 (단일 콘텐츠 에디터 + 템플릿, 한/영 이중 언어, 기술 스택, 갤러리)
- `/admin/works/[id]/edit` — 기존 작업물 수정
- `/admin/settings` — 사이트 설정 (General, Content, Appearance, Services, Account 5개 탭). Content 탭은 Home/Profile/About/Posts/Works 서브 네비게이션으로 분리. Services 탭에서 이메일 서비스, AI 커버, reCAPTCHA 설정 및 API 키 편집. Account 탭에서 관리자 이메일/비밀번호 변경

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

## 테스트

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

## Components

### StaggerText

텍스트를 개별 문자로 분리하여 호버 시 순차적으로 외곽선 애니메이션을 적용하는 컴포넌트입니다.

**경로**: `src/components/effects/StaggerText`

**기능**:

- 호버 시 첫 글자부터 순차적으로 외곽선(stroke)으로 변경
- 호버 해제 시 마지막 글자부터 역순으로 색상이 채워짐 (stroke 유지)
- 커스텀 스트로크 색상 및 두께 지원
- 글자당 딜레이 시간 조절 가능

**사용법**:

```tsx
import StaggerText from "@/components/effects/StaggerText";

// 기본 사용
<StaggerText>Hello World</StaggerText>

// 커스텀 옵션
<StaggerText
  className={styles.title}
  strokeColor="var(--text-primary)"  // 스트로크 색상
  strokeWidth={2}                     // 스트로크 두께 (기본: 1px)
  delayPerChar={0.05}                 // 글자당 딜레이 (기본: 0.04초)
  hoverEffect={false}                 // 호버 효과 비활성화
>
  Custom Text
</StaggerText>
```

**Props**:

| Prop           | Type      | Default        | Description                          |
| -------------- | --------- | -------------- | ------------------------------------ |
| `children`     | `string`  | (필수)         | 표시할 텍스트                        |
| `className`    | `string`  | -              | 추가 CSS 클래스                      |
| `strokeColor`  | `string`  | `currentColor` | 스트로크 색상 (CSS 변수 또는 색상값) |
| `strokeWidth`  | `number`  | `1`            | 스트로크 두께 (px)                   |
| `delayPerChar` | `number`  | `0.04`         | 글자당 딜레이 (초)                   |
| `hoverEffect`  | `boolean` | `true`         | 호버 효과 활성화 여부                |

---

### BreakpointGuard

뷰포트가 breakpoint 경계(768px, 1024px)를 넘을 때 페이지 콘텐츠를 자동으로 unmount/remount하여 GSAP ScrollTrigger, RAF 기반 애니메이션 등을 재초기화하는 컴포넌트입니다.

**경로**: `src/components/common/BreakpointGuard.tsx`

**기능**:

- 뷰포트 너비 변화를 감지하여 `desktop` (>1024px) / `tablet` (768-1024px) / `mobile` (<768px) 분류
- breakpoint 변경 시 `key` prop을 통해 children을 remount
- Provider(Theme, Language, Lenis)는 상위에 위치하여 상태 유지

**적용 위치**: `src/app/layout.tsx`

```tsx
// root layout.tsx
<ThemeProvider>
  <LanguageProvider>
    <LenisProvider>
      <Navigation /> {/* 유지 */}
      <main>
        <BreakpointGuard>
          {" "}
          {/* breakpoint 변경 시 remount */}
          {children}
        </BreakpointGuard>
      </main>
    </LenisProvider>
  </LanguageProvider>
</ThemeProvider>
```

**Breakpoints**:

| Breakpoint | 범위           | 설명                     |
| ---------- | -------------- | ------------------------ |
| `desktop`  | > 1024px       | 가로 스크롤 레이아웃     |
| `tablet`   | 768px - 1024px | 세로 스크롤, 태블릿 간격 |
| `mobile`   | < 768px        | 세로 스크롤, 모바일 간격 |

---

## Trouble Shooting

### 1. Lenis Scroll Velocity 효과 미작동

#### 문제

Works 섹션의 이미지에 스크롤 속도 기반 패럴랙스 효과가 적용되지 않음

#### 시도한 방법들 (실패)

1. **wheel 이벤트 직접 감지**: 불안정하고 Lenis와 충돌
2. **RAF 폴링으로 scroll delta 계산**: 부정확한 velocity 측정
3. **Lenis velocity 속성 직접 타입 단언**: 스크롤 이벤트 외부에서 접근 시 값이 갱신되지 않음

#### 원인

- RAF 폴링 방식으로 스크롤 위치를 직접 계산하면 프레임 간 delta가 일정하지 않아 velocity 값이 부정확하게 측정됨
- Lenis는 내부적으로 velocity를 계산하여 인스턴스 속성으로 제공하지만, 스크롤 이벤트 핸들러 내에서만 정확한 값에 접근 가능

#### 해결

Lenis의 네이티브 `on('scroll')` 이벤트를 사용하여 인스턴스에서 직접 velocity 속성 접근

```tsx
// ❌ 잘못된 방법 - RAF 폴링
useEffect(() => {
  const updateOffset = () => {
    const currentScroll = lenis.scroll;
    const delta = currentScroll - prevScrollRef.current; // 부정확한 velocity
    prevScrollRef.current = currentScroll;
    rafIdRef.current = requestAnimationFrame(updateOffset);
  };
  rafIdRef.current = requestAnimationFrame(updateOffset);
}, []);

// ✅ 올바른 방법 - Lenis scroll event
useEffect(() => {
  const handleScroll = () => {
    const velocity = (lenis as any).velocity; // 정확한 velocity
    if (Math.abs(velocity) > 0.05) {
      const offset = Math.max(-50, Math.min(50, velocity * 30));
      workImageOffsetY.set(offset);
    }
  };
  lenis.on("scroll", handleScroll);
  return () => lenis.off("scroll", handleScroll);
}, [lenis]);
```

#### 핵심 교훈

Lenis는 내부적으로 velocity를 계산하여 인스턴스 속성으로 제공하므로, 직접 delta를 계산하는 것보다 정확함

---

### 2. Framer Motion transform과 CSS transform 충돌

#### 문제

이미지 중앙 정렬에 CSS `transform: translate(-50%, -50%)`를 사용하면 Framer Motion의 `y` 속성이 작동하지 않음

#### 원인

- Framer Motion의 `style={{ y }}` 속성은 inline `transform: translateY()`를 생성
- CSS의 `transform` 속성이 이미 설정되어 있으면 Framer Motion의 transform이 덮어씌워지거나 충돌

#### 해결

margin 기반 중앙 정렬로 변경하여 CSS transform을 사용하지 않음

```css
/* ❌ 잘못된 방법 - CSS transform 사용 */
.workImageInner {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%); /* Framer Motion과 충돌 */
}

/* ✅ 올바른 방법 - margin 기반 정렬 */
.workImageInner {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 130%;
  height: 130%;
  margin-left: -65%; /* width의 절반 */
  margin-top: -65%; /* height의 절반 */
}
```

#### 핵심 교훈

Framer Motion의 style 속성은 inline transform을 생성하므로, CSS transform과 분리하여 사용해야 함

---

### 3. TypeScript useRef 타입 에러

#### 문제

`useRef<ReturnType<typeof setTimeout>>()`에서 "Expected 1 arguments, but got 0" 타입 에러 발생

#### 원인

- `useRef`는 초기값이 필수 파라미터
- `ReturnType<typeof setTimeout>`은 `null`을 포함하지 않으며, `clearTimeout`은 `null`을 허용하지 않음

#### 해결

`undefined`를 초기값으로 명시적으로 제공하고 타입에 포함

```tsx
// ❌ 잘못된 방법
const resetTimerRef = useRef<ReturnType<typeof setTimeout>>(); // 에러: 초기값 필요
const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null); // clearTimeout 타입 에러

// ✅ 올바른 방법
const resetTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
  undefined,
);
```

#### 핵심 교훈

`clearTimeout`은 `undefined`를 허용하지만 `null`은 허용하지 않음. Timer ref는 `undefined`로 초기화해야 함

---

### 4. GSAP ScrollTrigger 수평 무한 스크롤 구현

#### 문제

Works 페이지의 수평 스크롤이 끝에 도달하면 역방향으로 스크롤되어 무한 스크롤처럼 보이지 않음

#### 시도한 방법들 (실패)

1. **스크롤 위치 텔레포트**: 끝에 도달 시 `window.scrollTo`로 처음으로 이동 → 점프가 눈에 보임
2. **Bridge 섹션 분리**: 별도 섹션으로 Bridge 추가 → 수평에서 수직 스크롤로 전환되어 흐름 깨짐
3. **Lenis infinite + 텔레포트**: Lenis와 ScrollTrigger 동시 제어 시 충돌 발생

#### 원인

- GSAP ScrollTrigger는 `end` 속성으로 정의된 유한한 스크롤 범위를 가짐
- 스크롤 위치를 직접 변경하면 사용자에게 점프가 보임
- 수평 스크롤은 수직 스크롤을 가로 이동으로 변환하는 방식이므로, 별도 섹션 추가 시 수직 스크롤 구간이 생김

#### 해결

스크롤 거리를 매우 길게 설정하고, modulo 연산으로 컨테이너 위치만 순환시킴

```tsx
// 콘텐츠를 3배로 복제
const allProjects = [...projects, ...projects, ...projects];

// 스크롤 거리를 10배로 설정 (사실상 무한)
const scrollDistance = oneSetWidth * 10;

gsap.to(container, {
  scrollTrigger: {
    end: () => `+=${scrollDistance}`,
    onUpdate: (self) => {
      // modulo로 위치 순환 - 스크롤은 계속 진행되지만 시각적으로 루프
      const totalProgress = self.progress * scrollDistance;
      const loopedX = totalProgress % oneSetWidth;
      gsap.set(container, { x: -loopedX });
    },
  },
});
```

#### 핵심 교훈

스크롤 위치 텔레포트보다 긴 스크롤 범위 + 시각적 위치 루프 방식이 더 자연스러운 무한 스크롤 경험 제공

---

### 5. Lighthouse 성능 최적화 — reCAPTCHA 지연 로딩

#### 문제

Lighthouse 모바일 Performance 점수 48점. LCP 17.1초, TTI 18.2초로 심각한 성능 저하

#### 원인 분석

Lighthouse 보고서(Desktop/Mobile)를 분석한 결과 주요 병목:

1. **reCAPTCHA v3 즉시 로딩**: `GoogleReCaptchaProvider`가 앱 전체를 감싸며 초기 로드 시 ~784KB JS를 즉시 다운로드. 메인 스레드 280ms 차단
2. **Preconnect 미설정**: Google 도메인에 대한 사전 연결 없이 요청 시작 → 400ms 지연
3. **색상 대비 미달**: `#6b7280` on `#f8f6f0` (4.47:1, 기준 4.5:1 미달), `#ff4f9d` on `#f8f6f0` (2.83:1)
4. **접근성**: heading 순서 건너뜀 (h1 → h3), aria-label과 표시 텍스트 불일치

#### 해결

**1. reCAPTCHA 지연 로딩** — 가장 큰 영향

유저 인터랙션(scroll/click/touch/keydown) 또는 4초 경과 후에만 reCAPTCHA 스크립트를 로드하도록 변경:

```tsx
// ❌ 기존 - 앱 마운트 시 즉시 로드 (784KB)
<GoogleReCaptchaProvider reCaptchaKey={siteKey}>
  {children}
</GoogleReCaptchaProvider>

// ✅ 개선 - 유저 인터랙션 후 지연 로드
const [shouldLoad, setShouldLoad] = useState(false);

useEffect(() => {
  const load = () => setShouldLoad(true);
  const timer = setTimeout(load, 4000);
  const events = ["scroll", "click", "touchstart", "keydown"] as const;
  const handler = () => { load(); cleanup(); };
  // ...이벤트 리스너 등록 (once: true, passive: true)
}, []);

if (!shouldLoad) return <>{children}</>;
return <GoogleReCaptchaProvider ...>{children}</GoogleReCaptchaProvider>;
```

**2. Preconnect 힌트 추가**

```html
<link rel="preconnect" href="https://www.google.com" />
<link rel="preconnect" href="https://www.gstatic.com" crossorigin="anonymous" />
```

**3. 색상 대비 수정**

| 토큰                          | 변경 전                               | 변경 후                         | 대비 변화       |
| ----------------------------- | ------------------------------------- | ------------------------------- | --------------- |
| `--color-neutral-600`         | `#6b7280`                             | `#656c79`                       | 4.47:1 → ~4.9:1 |
| `--text-accent-secondary-alt` | `var(--color-accent-light)` (#ff4f9d) | `var(--color-accent)` (#d40063) | 2.83:1 → ~4.8:1 |

**4. 접근성 수정**

- ServicesSection: `<h3>` → `<h2>`로 heading 순서 정상화
- 언어 토글: `aria-label`에 표시 텍스트("KO"/"EN") 포함

#### 핵심 교훈

- 서드파티 스크립트(reCAPTCHA, Analytics 등)는 초기 로드에서 제외하고 유저 인터랙션 후 로드하면 LCP/TTI에 큰 영향
- 개발 서버(Turbopack)에서의 Lighthouse 결과는 unminified JS, devtools 등으로 인해 프로덕션보다 훨씬 낮게 측정됨
- `mix-blend-mode: difference` 사용 시 Lighthouse가 blend 전 색상으로 대비를 계산하므로 실제 시각적 결과와 다를 수 있음

---

### 6. reCAPTCHA 배지 z-index 문제

#### 문제

Contact Drawer가 열렸을 때 reCAPTCHA v3 배지가 overlay 아래에 가려져 보이지 않음

#### 원인

- Contact Drawer의 backdrop이 `z-index: var(--z-overlay)` (40)로 fixed 포지셔닝
- Google이 삽입하는 `.grecaptcha-badge` 요소의 z-index가 backdrop보다 낮아 가려짐

#### 해결

Drawer 열릴 때 배지에 `z-index: 9999`를 동적으로 설정, 닫힐 때 제거:

```tsx
badge.style.zIndex = isOpen ? "9999" : "";
```

#### 핵심 교훈

서드파티가 삽입하는 DOM 요소는 커스텀 overlay/modal과 z-index 충돌이 발생할 수 있음. 동적으로 z-index를 관리해야 함

---

### 7. Lighthouse 심화 성능 최적화 — 미사용 폰트 제거 및 리소스 경량화

#### 문제

1차 최적화 후 Lighthouse 모바일 Performance 60점. LCP 7.3초, TTI 13.7초, 페이지 용량 1,489KB, 네트워크 요청 63건

#### 원인 분석

Lighthouse CLI로 프로덕션 빌드를 직접 측정하여 병목 파악:

1. **미사용 폰트 4개 로드**: IBM Plex Mono(5 weights), Bebas Neue, Cormorant Garamond(5 weights), Abril Fatface가 CSS에서 미참조인데도 12개 폰트 파일을 다운로드
2. **reCAPTCHA 4초 타이머**: 지연 로딩에 `setTimeout(4000)` 폴백이 있어 Lighthouse 테스트 중 여전히 ~740KB 로드
3. **scroll 이벤트 트리거**: reCAPTCHA가 scroll 이벤트에도 반응하여 불필요하게 조기 로드
4. **font-display 미설정**: 모든 폰트가 렌더링을 차단
5. **미사용 Preconnect**: reCAPTCHA가 초기 로드에서 제외되었으므로 Google 도메인 preconnect가 "unused" 경고 유발
6. **Inter 과다 가중치**: 7개 가중치(300-900) 중 800, 900은 미사용

#### 해결

**1. 미사용 폰트 제거** — 가장 큰 영향

```tsx
// ❌ 기존 - 9개 폰트 패밀리 (19개 폰트 파일)
import {
  IBM_Plex_Mono,
  Inter,
  Playfair_Display,
  JetBrains_Mono,
  Bebas_Neue,
  Space_Grotesk,
  Cormorant_Garamond,
  Abril_Fatface,
  Instrument_Serif,
} from "next/font/google";

// ✅ 개선 - 5개 폰트 패밀리 (5개 폰트 파일)
import {
  Inter,
  Playfair_Display,
  JetBrains_Mono,
  Space_Grotesk,
  Instrument_Serif,
} from "next/font/google";
```

미사용 확인 방법: CSS 전체에서 `var(--font-ibm-plex)`, `var(--font-bebas)`, `var(--font-cormorant)`, `var(--font-abril)` 검색 → 0건. `useFontMorph.ts`에서 참조하지만 해당 컴포넌트가 어떤 페이지에서도 import되지 않음

**2. font-display: swap 추가**

```tsx
const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"], // 800, 900 제거
  display: "swap", // 폰트 렌더링 차단 해제
});
```

**3. reCAPTCHA 로딩 전략 개선**

```tsx
// ❌ 기존 - 타이머 + scroll 포함
const timer = setTimeout(load, 4000); // Lighthouse 테스트 중 트리거됨
const events = ["scroll", "click", "touchstart", "keydown"];

// ✅ 개선 - 의도적 인터랙션만
const events = ["click", "touchstart", "keydown"]; // 타이머/scroll 제거
```

**4. 미사용 Preconnect 제거**

```html
<!-- ❌ 기존 - reCAPTCHA가 초기 로드에서 제외되어 unused 경고 -->
<link rel="preconnect" href="https://www.google.com" />
<link rel="preconnect" href="https://www.gstatic.com" crossorigin="anonymous" />

<!-- ✅ 개선 - 제거 -->
```

#### 결과 (Lighthouse CLI, 3회 측정 중앙값)

| 메트릭      | Before   | After       | 변화          |
| ----------- | -------- | ----------- | ------------- |
| Performance | 60       | **98**      | **+38점**     |
| FCP         | 2,573ms  | 1,979ms     | -594ms        |
| LCP         | 7,294ms  | **1,979ms** | **-5,315ms**  |
| TBT         | 430ms    | **0ms**     | -430ms        |
| CLS         | 0.012    | 0           | -0.012        |
| TTI         | 13,731ms | **1,979ms** | **-11,752ms** |
| 요청 수     | 63       | 28          | -35           |
| 페이지 용량 | 1,489KB  | **449KB**   | **-70%**      |
| 폰트 파일   | 19개     | 5개         | -14개         |

#### 핵심 교훈

- `next/font/google`로 등록한 폰트는 CSS에서 미참조여도 폰트 파일이 다운로드됨. 정기적으로 실제 사용 여부를 검증해야 함
- 서드파티 지연 로딩의 타이머 폴백은 성능 측정 도구에서 의도치 않게 트리거될 수 있음. 의도적 인터랙션(click/touch/keydown)만 사용하는 것이 안전
- `font-display: swap`은 next/font에서 기본값이 아니므로 명시적으로 설정해야 함

---

### 8. Works 가로 갤러리 양방향 무한 스크롤 래핑

#### 문제

Works 페이지의 가로 스크롤 갤러리에서 프로젝트를 10세트 반복했지만, 끝까지 스크롤하면 흰 화면이 나타나 진정한 무한 스크롤이 아님

#### 시도한 방법들 (실패)

1. **세트 수 증가**: 반복 세트를 더 늘리면 DOM 노드가 과다해져 성능 저하
2. **끝에서 처음으로 텔레포트**: 스크롤 위치 점프가 눈에 보임

#### 원인

- 유한한 반복 세트(10세트)로는 양쪽 방향 모두 끝이 존재
- GSAP의 requestAnimationFrame 루프에서 scrollX가 계속 누적되어 콘텐츠 범위를 벗어남

#### 해결

인트로 요소들의 `offsetLeft` 차이로 한 세트 너비(`oneSetWidth`)를 계산하고, `while` 루프로 scrollX/targetScrollX를 래핑

```tsx
// 한 세트 너비 계산 (연속된 인트로 간 거리)
const introEls = slider.querySelectorAll(`.${styles.intro}`);
let oneSetWidth = 0;
if (introEls.length >= 2) {
  oneSetWidth = introEls[1].offsetLeft - introEls[0].offsetLeft;
}

// 애니메이션 루프에서 양방향 래핑
if (oneSetWidth > 0) {
  while (scrollX > oneSetWidth * 3) {
    scrollX -= oneSetWidth;
    targetScrollX -= oneSetWidth;
  }
  while (scrollX < -oneSetWidth * 3) {
    scrollX += oneSetWidth;
    targetScrollX += oneSetWidth;
  }
}
```

#### 핵심 교훈

콘텐츠 복제 세트 수를 늘리는 것보다, 스크롤 위치 자체를 래핑하는 방식이 DOM 부담 없이 진정한 무한 스크롤을 구현할 수 있음

---

### 9. 언어 전환 시 레이아웃 시프트

#### 문제

Works 인트로 섹션에서 한국어↔영어 전환 시 텍스트 영역의 높이가 변하며 레이아웃이 살짝 움직임

#### 원인

- 한국어와 영어의 텍스트 길이 차이로 줄바꿈 위치가 달라짐
- `justify-content: center`가 적용된 flex 컨테이너에서 자식 높이 변화 시 공간이 재분배됨

#### 해결

`min-height`를 `em` 단위(줄 수 × line-height)로 설정하여 양쪽 언어 모두에서 일관된 공간을 확보

```css
/* 최대 줄 수 기준으로 min-height 예약 */
.introDesc {
  min-height: 4.95em;
} /* 3줄 × 1.65 line-height */
.introDetail {
  min-height: 6.6em;
} /* 4줄 × 1.65 line-height */
.introQuote {
  min-height: 3.3em;
} /* 2줄 × 1.65 line-height */

/* 모바일에서는 세로 스크롤이므로 불필요 */
@media (max-width: 768px) {
  .introDesc,
  .introDetail,
  .introQuote {
    min-height: auto;
  }
}
```

#### 핵심 교훈

다국어 지원 시 텍스트 영역에 `min-height`로 최대 줄 수 기준의 공간을 예약하면 언어 전환 시 레이아웃 시프트를 방지할 수 있음. `em` 단위를 사용하면 font-size 변경에도 자동 대응됨

---

### 10. 언어 전환 시 로딩 화면 재출현

#### 문제

페이지에서 처음으로 언어를 전환하면 로딩 화면이 다시 나타남. 두 번째 전환부터는 정상 동작

#### 원인

- `RecaptchaProvider`가 첫 번째 클릭 이벤트에서 `shouldLoad`를 `false` → `true`로 변경
- 렌더 트리가 `<Fragment>{children}</Fragment>` → `<GoogleReCaptchaProvider>{children}</GoogleReCaptchaProvider>`로 변경됨
- React는 같은 위치에서 컴포넌트 타입이 바뀌면 하위 트리 전체를 unmount → remount함
- `useLoadingScreen()`의 `useState(true)` 초기값으로 인해 로딩 화면이 재출현

#### 해결

모듈 레벨 플래그로 초기 로딩 완료 여부를 추적하여 remount 시 로딩 화면을 건너뜀

```tsx
// 모듈 레벨: 컴포넌트 remount에도 유지됨
let hasCompletedInitialLoad = false;

export function useLoadingScreen() {
  // remount 시 이미 로딩 완료된 세션이면 false로 시작
  const [isLoading, setIsLoading] = useState(() => !hasCompletedInitialLoad);
  const hasCompletedRef = useRef(hasCompletedInitialLoad);

  const completeLoading = () => {
    hasCompletedRef.current = true;
    hasCompletedInitialLoad = true; // 모듈 플래그 동기화
    setIsLoading(false);
  };
}
```

#### 핵심 교훈

서드파티 Provider를 조건부로 렌더링하면(`Fragment` ↔ `Provider`) React가 하위 트리를 remount함. `useState` 초기값에 의존하는 상태는 모듈 레벨 변수로 보완해야 remount에 안전함

---

### 11. GSAP ScrollTrigger가 breakpoint 변경 시 레이아웃 깨짐

#### 문제

데스크톱↔태블릿↔모바일 간 뷰포트 리사이즈 시 GSAP ScrollTrigger pin, RAF counter-translation 등의 애니메이션이 이전 뷰포트 기준으로 고정되어 레이아웃이 깨짐

#### 원인

- GSAP ScrollTrigger의 `start`, `end`, `pin` 설정이 생성 시점의 뷰포트 크기로 계산됨
- RAF 기반 counter-translation도 초기 `extraWidth` 값을 기준으로 동작
- 뷰포트 크기가 변해도 기존 인스턴스가 자동으로 갱신되지 않음

#### 시도한 방법들

1. **개별 컴포넌트에서 breakpoint 추적**: 각 패널에서 resize listener + effect 재실행 → 코드 중복, 일부 패널 누락
2. **ScrollTrigger.refresh()**: 일부 케이스에서 작동하지만, 가로↔세로 레이아웃 전환처럼 근본적인 DOM 구조 변경은 처리 불가

#### 해결

root layout에 `BreakpointGuard` 컴포넌트를 추가하여 breakpoint 변경 시 페이지 콘텐츠 전체를 remount

```tsx
// src/components/common/BreakpointGuard.tsx
function getBreakpoint(): "desktop" | "tablet" | "mobile" {
  const w = window.innerWidth;
  if (w > 1024) return "desktop";
  if (w >= 768) return "tablet";
  return "mobile";
}

export default function BreakpointGuard({ children }) {
  const [bp, setBp] = useState("desktop");

  useEffect(() => {
    const check = () => setBp(getBreakpoint());
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return <div key={bp}>{children}</div>; // key 변경 → children remount
}

// src/app/layout.tsx
<main>
  <BreakpointGuard>{children}</BreakpointGuard>
</main>;
```

Provider(Theme, Language, Lenis) 위에 배치하면 상태가 초기화되므로, Provider 안쪽 `<main>` 내부에 배치하여 Provider 상태는 유지하면서 페이지 콘텐츠만 remount

#### 부수 효과 및 해결

- 비디오 요소가 DOM에서 제거되면서 `play()` Promise가 AbortError로 reject됨 → `.catch(() => {})` 추가
- 모든 컴포넌트의 `useState` 초기값이 리셋됨 → 모듈 레벨 플래그(예: `hasCompletedInitialLoad`)로 보완

#### 핵심 교훈

GSAP ScrollTrigger처럼 생성 시점의 뷰포트에 의존하는 애니메이션은 `ScrollTrigger.refresh()`로 부분 갱신하기보다, React의 `key` prop을 활용한 완전 remount가 더 안정적. Provider를 remount 범위 밖에 배치하면 전역 상태 손실 없이 페이지 단위 재초기화가 가능

---

### 12. 프로젝트 전체 성능 최적화

#### 문제

프로젝트 성능 감사 결과, 다수의 최적화 포인트 발견: 메인 스레드 애니메이션, 60fps React 리렌더, GPU 메모리 누수, 미사용 리소스, CSS 충돌

#### 원인 분석

1. **Hero 타원·마퀴**: Framer Motion/GSAP의 무한 반복 애니메이션이 메인 스레드 RAF로 실행
2. **useMagneticRepel**: `mousemove`마다 `setMagneticOffsets()` → 60fps React state 업데이트 → WorksSection 전체 리렌더
3. **Three.js**: `DoubleSide`로 양면 렌더링, `isMobile` 변경 시 geometry 미해제(GPU 메모리 누수)
4. **미사용 리소스**: paper.png(17MB), grain.png(5.2MB) 미참조, npm 패키지 2개 미사용
5. **CSS 충돌**: `scroll-behavior: smooth`가 Lenis와 이중 스무딩, `cursor: none`이 터치 디바이스에도 적용
6. **useSoundManager**: mount 시 AudioContext 생성 + typing.mp3 즉시 fetch

#### 해결

```
1. Hero 타원/마퀴: CSS animation으로 전환 → 컴포지터 스레드에서 실행
2. useMagneticRepel: useState → useRef + RAF 루프 + el.style.transform 직접 적용
3. Three.js: DoubleSide → FrontSide, useEffect cleanup에서 geometry.dispose()
4. 미사용 이미지 삭제(-22.2MB), npm uninstall react-scroll-parallax react-google-recaptcha-v3
5. scroll-behavior 제거, cursor:none을 @media (pointer: fine)로 제한
6. AudioContext/typing.mp3를 첫 인터랙션 시점으로 지연
7. next.config: poweredByHeader: false, image formats: AVIF+WebP
8. will-change: transform 영구 제거 (GPU 레이어 해제)
```

#### 핵심 교훈

- 단순 무한 반복 애니메이션(rotate, translateX)은 CSS animation이 JS 기반보다 항상 더 효율적 — 컴포지터 스레드에서 메인 스레드 차단 없이 실행됨
- 고빈도 이벤트(mousemove)에서 React state를 업데이트하면 프레임당 전체 컴포넌트 트리가 재조정됨. ref + 직접 DOM 조작이 적절한 패턴
- Three.js의 `useMemo`로 생성한 geometry/material은 React의 GC 대상이지만 GPU 버퍼는 자동 해제되지 않음. 명시적 `dispose()` 필수

---

## 배포

[Vercel Platform](https://vercel.com)을 통해 쉽게 배포할 수 있습니다.

자세한 내용은 [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying)을 참고하세요.

## 커밋 컨벤션

이 프로젝트는 [Conventional Commits](https://www.conventionalcommits.org/ko/v1.0.0/) 규칙을 따릅니다.

### 커밋 메시지 형식

```
<타입>(<범위>): <제목>
```

### 주요 타입

| 타입       | 설명                                  |
| ---------- | ------------------------------------- |
| `feat`     | 새로운 기능 추가                      |
| `fix`      | 버그 수정                             |
| `design`   | 레이아웃·스타일 조정 (기능 변경 없음) |
| `docs`     | 문서 수정                             |
| `style`    | 코드 포맷팅                           |
| `refactor` | 리팩토링                              |
| `perf`     | 성능 개선                             |
| `test`     | 테스트 추가/수정                      |
| `chore`    | 빌드, 설정 변경                       |

### 예시

```bash
feat: 무한 스크롤 기능 추가
fix(animation): 스크롤 애니메이션 깜빡임 수정
design(about): dotNav 간격 조정 + indicator 높이 통일
docs: README 설치 방법 추가
refactor(hooks): 커스텀 훅 분리
```

자세한 내용은 [COMMIT_CONVENTION.md](./COMMIT_CONVENTION.md)를 참고하세요.

---

## 라이선스

MIT License
