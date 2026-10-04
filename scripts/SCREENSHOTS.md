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

### 빠진 파일만 캡처

이미 존재하는 파일은 그대로 두고, **아직 캡처 안 된 파일만** 채우고 싶을 때:

```bash
node scripts/screenshots.mjs --missing
```

각 (device, page, theme) 조합에 대해 `public/images/screenshots/{device}/{page}-{theme}.png` 의 존재 여부를 확인 → 이미 있으면 skip, 없으면 캡처. 다른 옵션 (`--device`, `--pages`, `--dark` 등) 과 자유롭게 조합 가능:

```bash
# 모바일 누락분만
node scripts/screenshots.mjs --missing --device=mobile

# Works 6종 중 빠진 것만 PC 다크
node scripts/screenshots.mjs --missing --device=pc --dark --pages=works,works-fullscreen,works-cinematic,works-grid,works-split,works-cylinder
```

> 모든 대상이 이미 존재하면 `Nothing to capture — all targets already exist.` 출력 + 즉시 종료 (browser launch 도 안 함).

### 재시도 비활성화

기본 동작: 캡처 끝나고 실패한 파일이 있으면 목록을 출력하고 `Retry N failed captures? (Y/n)` 프롬프트 — Enter 또는 `y` 면 실패한 것만 다시 시도, `n` 이면 종료.

CI / 비대화형 환경 (stdin/stdout 이 TTY 가 아닌 경우) 에서는 프롬프트 없이 실패 목록 + 개별 재시도 명령어를 출력하고 종료. `--no-retry` 플래그로도 강제 비활성화 가능:

```bash
node scripts/screenshots.mjs --no-retry
```

실패 목록 출력 예시:
```
❌ 3 failed:
  • tablet/design-system-light.png
    └─ page.goto: Timeout 30000ms exceeded
  • mobile/works-cylinder-dark.png
    └─ page.screenshot: Target closed
  • pc/post-detail-dark.png
    └─ page.goto: net::ERR_CONNECTION_REFUSED

↻  Retry 3 failed captures? (Y/n):
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

## CMS 캡처 — `scripts/screenshots-cms.ts`

README "관리자 · CMS" 절의 그림은 로그인 세션이 필요하고 화면 안에서 단추를 눌러 상태를 만든 뒤 찍어야 해서 별도 스크립트로 둡니다. 연속 동작(갤러리 재생 · 미리 듣기 · 녹음 편집 · PPTX 변환 · 자동 번역)은 `.webm` 으로 녹화하고, ffmpeg 가 있으면 README 본문에 들어가는 `.gif` 도 만듭니다(장면마다 정한 핵심 구간만, 10fps · 960px → 1.1~1.5MB).

```bash
# 1. .env.local 에 E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD (e2e/auth.setup.ts 주석)
# 2. 빌드 산출물로 서버를 띄운다 — dev 서버는 HMR 오버레이가 찍힌다.
#    3000 에 dev 서버가 떠 있으면 다른 포트로 띄우고 --base 로 넘긴다
npm run build && npx next start -p 3100
# 3. 로그인 세션 저장 (최초 1회 기기 승인 필요)
npx playwright test --project=setup
# 4. 캡처
npx tsx scripts/screenshots-cms.ts --base=http://localhost:3100 \
  --work=<갤러리·대본·음성이 있는 작업물 id> --work-slug=<그 작업물 slug> \
  --draft-work=<번역·PPTX 들이기를 해 볼 초안 작업물 id> \
  --pptx=scripts/fixtures/newpick-intro.pptx
```

| 옵션 | 뜻 |
|---|---|
| `--only=1,3,14` | 번호로 고른 장면만(실패하면 끝에 다시 돌릴 번호를 알려 준다) |
| `--theme=dark` | 다크로 (기본 light) |
| `--presets=Forest,Twilight,Arctic` | 14번 홈에 입힐 프리셋 |
| `--sample-image=<png>` | 13번 "이미지에서" 에 올릴 그림(기본 `screenshots/pc/editor-color-light.png` — 색이 여럿이어야 후보가 여럿 나온다) |
| `--post=<slug>` · `--post-untranslated=<slug>` | 11 · 10 을 글 상세로 찍을 때. 없으면 `--work-slug` 작업물로 찍는다 |
| `--summary-file=<json>` | 11 — 작업물에 저장된 요약이 없을 때 `{ "summary_ko", "summary_en" }` 을 미리보기 폼에만 넣는다 |
| `--no-video` | 영상 생략 |
| `--base` · `--out` | 서버 주소 · 출력 폴더(기본 `public/images/screenshots/cms`) |

출력 파일(`-light` 자리에 테마 이름):

```
cms/01-gallery-captions-light.png      + 01-gallery-playing-light.webm / .gif / .mp4(소리)
cms/02-narration-editor-light.png
cms/03-narration-preview-light.png     + 03-narration-preview-light.webm / .gif
cms/04-lexicon-light.png
cms/05-recording-editor-light.png      + 05-recording-split-light.webm / .gif
cms/06-pptx-progress-light.png         + 06-pptx-import-light.webm / .gif
cms/07-pptx-thumbnails-light.png
cms/08-translate-editor-light.png      + 08-translate-editor-light.webm / .gif
cms/09-settings-services-light.png
cms/10-translate-banner-light.png
cms/11-ai-summary-light.png
cms/12-theme-presets-light.png · 12-theme-contrast-light.png
cms/13-theme-wheel-light.png · 13-theme-from-image-light.png
cms/14-home-forest-light.png · 14-home-twilight-light.png · 14-home-arctic-light.png
cms/15-relation-picker-light.png
cms/16-seo-checklist-light.png
```

서버에는 아무것도 쓰지 않습니다:
- 저장 단추는 어디서도 누르지 않고, 편집기 자동저장(`POST /api/revisions` · 떠날 때 `sendBeacon`)은 막아 둡니다 — 캡처하려고 폼을 건드린 것이 다음 편집 때 "복원할까요" 로 나오지 않게.
- **6 · 7(PPTX)의 업로드는 브라우저 안에서 가로채 `data:` 주소로 돌려줍니다** — Storage 에 올라가지 않습니다. 변환과 발표자 노트 → 대본 매핑은 전부 클라이언트 일이라 화면은 실제와 같습니다. `scripts/fixtures/newpick-intro.pptx` 는 `content/works/newpick.md` 의 문장과 그림으로 만든 NewPick 소개 6장(장마다 발표자 노트)입니다 — 떨어뜨리는 `--draft-work` 가 NewPick 이라 내용을 맞췄습니다. 다른 작업물에 떨어뜨릴 거면 그 작업물 내용의 덱을 쓰세요.
- 2 · 3 은 이미 만든 음성을 재생만 하고(3 은 그 장에 음성이 있어야 합니다), 8 은 번역 API 를 부르되 폼에만 넣습니다. 8 은 KO/EN 전환으로 번역이 돌지 않으면(영어 칸이 하나라도 차 있으면) 같은 코드를 부르는 "재번역 › 전체" 로 돕니다.
- 5(녹음)는 Chromium 의 가짜 마이크로 녹음하고 끝에 "취소"를 눌러 올리지 않습니다.
- 1 의 `.mp4` 는 소리가 있습니다. Playwright 녹화에는 소리가 없어, 페이지의 `HTMLMediaElement.play` 를 가로채 갤러리가 튼 TTS 파일 주소와 실제 재생 시작(`playing` 이벤트) 시각을 받아 두고, 그 파일을 내려받아 영상 시각에 맞춰 입힙니다(h264 · aac, 1440px). GitHub README 는 저장소 mp4 를 인라인 재생하지 않으므로 링크로 두되, 파일 페이지에서는 재생됩니다.
- 11 은 `--post` 가 없으면 `--work` 작업물의 관리자 미리보기(저장 전 폼을 `sessionStorage` 로 받는 화면)를 씁니다. 요약은 발행 때 서버가 만들어 DB 에 쓰므로, 저장된 요약이 없는 작업물은 `--summary-file` 로 넣어야 상자가 보입니다.
- 14(홈 프리셋)는 설정을 바꾸지 않고, ThemeProvider 가 테마 색을 CSS 변수로 옮기는 규칙(`src/lib/themeColors.ts`)을 그대로 써서 홈에 입힌 뒤 찍습니다.
- 15 는 글 편집기(새 글)의 "관련 프로젝트" 선택기를 찍습니다 — 작업물 쪽 "관련 글" 과 같은 RelationPicker 인데, 글이 하나도 없는 사이트에서도 목록이 채워집니다.

함정:
- 페이지로 들어가는 코드(`addInitScript`)는 **문자열로** 넘깁니다. 함수로 넘기면 tsx(esbuild) 가 함수 안의 `const f = () => {}` 를 `__name()` 헬퍼로 감싸는데, 직렬화돼 들어간 쪽엔 그 헬퍼가 없어 스크립트가 통째로 죽습니다(14 번이 기본색으로만 찍히던 원인).
- 사이트의 커스텀 커서(CursorTrail)는 마지막 마우스 자리에 분홍 점으로 남고, "BGM을 켤 수 있어요" 말풍선은 로드 2초 뒤 5초간 뜹니다 — 둘 다 스타일로 숨깁니다.
- `scrollIntoViewIfNeeded` 는 가운데 정렬이라 긴 카드가 잘립니다 — 요소 위쪽을 고정 네비 아래로 보내는 `scrollTopTo` 를 씁니다.
- webm → gif 를 기본 옵션으로 돌리면 전체가 노랗게 뜹니다 — `palettegen` / `paletteuse` 2단계로 변환합니다. 구간은 `recorded(..., { gif: { start, duration } })` 에 적습니다(앞머리의 로딩 화면 · 스크롤은 뺀다). GitHub README 는 저장소의 `.webm`/`.mp4` 를 `<video>` 로 재생하지 않으므로 본문 재생은 gif 뿐입니다.
