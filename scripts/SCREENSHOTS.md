# Screenshots 자동 캡처

README 및 문서용 스크린샷을 Playwright로 자동 캡처하는 스크립트.

## 사전 준비

```bash
# 1. Playwright Chromium 설치 (최초 1회)
npx playwright install chromium
# ~/.cache/ms-playwright/ 에 설치됨 — 프로젝트/시스템 Chrome에 영향 없음
# 삭제: npx playwright uninstall

# 2. dev 서버 실행 (별도 터미널)
npm run dev
```

## 기본 사용

```bash
node scripts/screenshots.mjs
```

14페이지 × 3디바이스 × 2테마 = **84장** 캡처.

출력 경로: `public/images/screenshots/`

> README 의 모든 `<img src="public/images/screenshots/...">` 참조가 이 경로를 가리킴.

## 출력 디렉토리 구조

```
public/images/screenshots/
├── pc/                          # 1440×900 @2x (Retina)
│   ├── home-light.png
│   ├── home-dark.png
│   ├── works-light.png          # default = flow layout
│   ├── works-dark.png
│   ├── works-fullscreen-light.png
│   ├── works-fullscreen-dark.png
│   ├── works-cinematic-light.png
│   ├── works-cinematic-dark.png
│   ├── works-grid-light.png
│   ├── works-grid-dark.png
│   ├── works-split-light.png
│   ├── works-split-dark.png
│   ├── works-cylinder-light.png
│   ├── works-cylinder-dark.png
│   ├── posts-light.png
│   ├── posts-dark.png
│   ├── profile-light.png
│   ├── profile-dark.png
│   ├── about-light.png
│   ├── about-dark.png
│   ├── design-system-light.png
│   ├── design-system-dark.png
│   ├── privacy-light.png
│   ├── privacy-dark.png
│   ├── work-detail-light.png
│   ├── work-detail-dark.png
│   ├── post-detail-light.png
│   └── post-detail-dark.png
├── tablet/                      # 768×1024 @2x
│   └── (동일 구조)
└── mobile/                      # 390×844 @3x
    └── (동일 구조)
```

## 옵션

### 테마 필터

```bash
# 다크 모드만
node scripts/screenshots.mjs --dark

# 라이트 모드만
node scripts/screenshots.mjs --light
```

### 디바이스 필터

```bash
# PC만
node scripts/screenshots.mjs --device=pc

# 모바일만
node scripts/screenshots.mjs --device=mobile

# PC + 태블릿
node scripts/screenshots.mjs --device=pc,tablet
```

### 페이지 필터

```bash
# 홈만
node scripts/screenshots.mjs --pages=home

# 홈 + works (default = flow)
node scripts/screenshots.mjs --pages=home,works

# works 6개 레이아웃 한 번에
node scripts/screenshots.mjs --pages=works,works-fullscreen,works-cinematic,works-grid,works-split,works-cylinder

# 상세 페이지 제외 (목록 페이지만)
node scripts/screenshots.mjs --no-detail
```

사용 가능한 페이지 이름:
`home`, `works`, `works-fullscreen`, `works-cinematic`, `works-grid`, `works-split`, `works-cylinder`,
`posts`, `profile`, `about`, `design-system`, `privacy`, `work-detail`, `post-detail`

### 풀페이지 캡처

```bash
# 뷰포트가 아닌 전체 스크롤 영역 캡처
node scripts/screenshots.mjs --full
```

### 출력 경로 변경

```bash
node scripts/screenshots.mjs --out=./my-screenshots
```

### dev 서버 주소 변경

```bash
node scripts/screenshots.mjs --base=http://localhost:4000
```

## 조합 예시

```bash
# 빠른 테스트: PC 다크 모드로 홈만
node scripts/screenshots.mjs --device=pc --pages=home --dark

# README용: PC 라이트/다크만
node scripts/screenshots.mjs --device=pc

# 반응형 비교: 홈 페이지를 3디바이스로
node scripts/screenshots.mjs --pages=home

# Works 6개 레이아웃 PC 다크
node scripts/screenshots.mjs --device=pc --dark --pages=works,works-fullscreen,works-cinematic,works-grid,works-split,works-cylinder

# 풀페이지 모바일 캡처
node scripts/screenshots.mjs --device=mobile --full

# 목록 페이지만 전 디바이스
node scripts/screenshots.mjs --no-detail
```

## 디바이스 스펙

| 디바이스 | 뷰포트 | Scale Factor | 실제 이미지 해상도 |
|---------|--------|-------------|------------------|
| pc | 1440×900 | 2x | 2880×1800 |
| tablet | 768×1024 | 2x | 1536×2048 |
| mobile | 390×844 | 3x | 1170×2532 |

## 캡처 대상 페이지

| 이름 | 경로 | 대기 시간 | 비고 |
|-----|------|----------|------|
| home | `/` | 3.5초 | 인트로 애니메이션 대기 |
| works | `/works` | 3.5초 | Flow 레이아웃 (default) — 가로 스크롤 갤러리 |
| works-fullscreen | `/works?layout=fullscreen` | 3.5초 | Fullscreen 레이아웃 — 배경 crossfade |
| works-cinematic | `/works?layout=cinematic` | 3.5초 | Cinematic 레이아웃 — parallax 영화관 |
| works-grid | `/works?layout=grid` | 3초 | Grid 레이아웃 — bento grid |
| works-split | `/works?layout=split` | 3초 | Split 레이아웃 — 좌측 메타 + 우측 스크롤 |
| works-cylinder | `/works?layout=cylinder` | 4초 | Cylinder 레이아웃 — Three.js 3D 실린더 |
| posts | `/posts` | 2.5초 | 블로그 목록 (Bento Masonry) |
| profile | `/profile` | 2.5초 | 프로필 |
| about | `/about` | 3초 | 가로 스크롤 문서 (6개 패널) |
| design-system | `/design-system` | 2.5초 | 토큰/컴포넌트 프리뷰 |
| privacy | `/privacy` | 1.5초 | 개인정보 처리방침 |
| work-detail | `/works/1` | 2.5초 | 작업물 상세 (`--no-detail` 로 제외 가능) |
| post-detail | `/posts/1` | 2.5초 | 게시물 상세 (`--no-detail` 로 제외 가능) |

> 대기 시간은 페이지 로드 후 애니메이션 완료까지 기다리는 시간.
> Supabase 데이터가 없으면 posts, post-detail, work-detail 은 fallback 정적 데이터로 캡처됨 (없으면 빈 페이지).
> `works-cylinder` 는 Three.js 초기화 + 카메라 진입 모션 때문에 다른 레이아웃보다 wait 가 조금 길게 잡혀 있음.

## 트러블슈팅

**Playwright 미설치**
```
Error: browserType.launch: Executable doesn't exist
```
→ `npx playwright install chromium` 실행

**dev 서버 미실행**
```
Error: page.goto: net::ERR_CONNECTION_REFUSED
```
→ 별도 터미널에서 `npm run dev` 먼저 실행

**타임아웃**
```
Error: page.goto: Timeout 30000ms exceeded
```
→ 페이지 로드가 느린 경우. 서버가 정상 동작 중인지 확인

**Playwright 삭제**
```bash
npx playwright uninstall
# ~/.cache/ms-playwright/ 디렉토리 제거됨
```
