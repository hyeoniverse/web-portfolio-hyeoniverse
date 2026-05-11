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

## 페이지 추가 / 제거 / 수정 (개인 프로젝트 커스터마이징)

스크립트는 단일 파일 (`scripts/screenshots.mjs`) 의 `PAGES` 배열 하나로 캡처 목록을 관리합니다. 본인 프로젝트에 맞춰 자유롭게 항목을 추가/제거/수정하세요.

### 페이지 추가

`scripts/screenshots.mjs` 의 `PAGES` 배열에 한 줄 추가:

```js
const PAGES = [
  // ...기존 항목들
  { name: "contact", path: "/contact", wait: 2000 },
  { name: "blog-archive", path: "/blog/archive", wait: 2500 },

  // 쿼리 파라미터 / 동적 라우트도 그대로 사용 가능
  { name: "posts-tagged", path: "/posts?tag=react", wait: 2500 },
  { name: "post-detail", path: "/posts/my-first-post", wait: 2500, detail: true },
];
```

필드 의미:
- `name` — 출력 파일 이름 (`{name}-{theme}.png`)
- `path` — dev 서버에서 접근할 경로 (쿼리/해시 포함 가능)
- `wait` — 페이지 로드 후 캡처 전 대기 시간 (ms). 애니메이션이 끝날 때까지 충분히 줘야 함
- `detail` (optional) — `true` 면 `--no-detail` 옵션으로 일괄 제외됨 (상세 페이지 관리용)

추가 후 그냥 다시 실행하면 됨:
```bash
node scripts/screenshots.mjs --pages=contact   # 새로 추가한 페이지만 빠르게 검증
```

### 페이지 제거

`PAGES` 배열에서 해당 항목 한 줄을 지우면 끝. **이미 캡처된 파일은 자동으로 안 지워짐** — 필요하면 직접 삭제:

```bash
# 특정 페이지 파일만 한 번에 정리
rm public/images/screenshots/*/contact-*.png
```

README 에서 해당 이미지를 참조하고 있었다면 그쪽도 같이 수정/삭제.

### 디바이스 추가 / 변경

`DEVICES` 배열을 수정하면 됨. 예) 4K + iPad Pro 추가:

```js
const DEVICES = [
  { name: "pc", width: 1440, height: 900, scale: 2 },
  { name: "tablet", width: 768, height: 1024, scale: 2 },
  { name: "mobile", width: 390, height: 844, scale: 3 },
  { name: "4k", width: 2560, height: 1440, scale: 1 },
  { name: "ipad-pro", width: 1024, height: 1366, scale: 2 },
];
```

새 디바이스 디렉토리 (`public/images/screenshots/4k/` 등) 가 자동 생성됨. README 의 반응형 비교 표에 컬럼을 추가하거나 별도 섹션으로 빼면 됨.

### 대기 시간 조정

캡처 결과에서 인트로 애니메이션이 잘려 보이거나 로딩 placeholder 가 찍히면 해당 페이지의 `wait` 값을 늘리세요. 반대로 너무 길어서 답답하면 줄이면 됨.

```js
{ name: "home", path: "/", wait: 5000 },   // 3.5초 → 5초로 증가
```

### 테마/모드 셀렉터가 다른 프로젝트라면

`setTheme` 함수가 이 프로젝트의 테마 시스템 (`data-theme` 속성 + `localStorage.theme`) 에 맞춰져 있습니다. 다른 방식 (Tailwind `class="dark"` 등) 을 쓴다면 함수 본문만 수정:

```js
async function setTheme(page, theme) {
  await page.evaluate((t) => {
    // 예) Tailwind dark mode (class strategy)
    document.documentElement.classList.toggle("dark", t === "dark");
    localStorage.setItem("theme", t);
  }, theme);
  await page.waitForTimeout(600);
}
```

### 출력 경로 변경

README 에서 다른 디렉토리를 가리키고 싶으면 `OUT_DIR` 기본값을 바꾸거나 `--out` 옵션으로 매번 지정:

```js
const OUT_DIR = resolve(args.out || "public/screenshots");   // 기본값 변경
```

```bash
node scripts/screenshots.mjs --out=docs/assets   # 1회성 변경
```

> README 의 `<img src="...">` 경로도 같이 바꿔야 함.

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
