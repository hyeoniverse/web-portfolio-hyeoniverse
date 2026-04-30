# 디자인 시스템 규칙

> CSS 네이밍 컨벤션 · 토큰 구조 · 컴포넌트 스타일링 규칙

---

## 1. 토큰 3-레이어 구조

```
Raw Tokens          →  Semantic Tokens       →  Context Tokens
(src/styles/tokens/)   (globals/_semantic.css)   (CSS Module: --_*)
원시값 (숫자/색상)       의미 부여 (역할 이름)         컴포넌트 스코프
```

### Layer 1 — Raw Tokens (`src/styles/tokens/`)

파일별 카테고리:

| 파일 | 접두사 | 예시 |
|------|--------|------|
| `_color.css` | `--color-*` | `--color-accent`, `--color-neutral-50` |
| `_spacing.css` | `--spacing-*`, `--box-*` | `--spacing-md`, `--box-sm-xl` |
| `_typography.css` | `--font-*`, `--font-size-*` | `--font-size-lg`, `--font-weight-medium` |
| `_motion.css` | `--duration-*`, `--ease-*`, `--delay-*` | `--duration-base`, `--ease-material` |
| `_radius.css` | `--radius-*` | `--radius-md`, `--radius-capsule` |
| `_shadow.css` | `--shadow-*` | `--shadow-sm`, `--shadow-glow` |
| `_sizing.css` | `--size-*`, `--breakpoint-*`, `--width-*`, `--icon-*` | `--size-md`, `--breakpoint-lg`, `--width-xl` |
| `_z-index.css` | `--z-*` | `--z-nav` (100), `--z-modal` (8000) |

**박스 토큰 (`--box-*`)**: padding/margin 복합값 (spacing 토큰 참조)
```css
--box-sm:       var(--spacing-sm) var(--spacing-sm);      /* 정사각 */
--box-sm-xl:    var(--spacing-sm) var(--spacing-xl);      /* Y-sm, X-xl */
--box-y-lg:     var(--spacing-lg) 0;                      /* Y축만 */
--box-x-md:     0 var(--spacing-md);                      /* X축만 */
```

### Layer 2 — Semantic Tokens (`src/styles/globals/_semantic.css`)

원시값에 **역할(의미)**을 부여. 다크/라이트 테마 분기 포함.

```css
/* 텍스트 */
--text-primary, --text-secondary, --text-tertiary, --text-muted
--text-accent, --text-inverse, --text-success

/* 배경 */
--bg-primary, --bg-secondary, --bg-tertiary, --bg-surface
--bg-accent, --bg-overlay, --bg-glass

/* 테두리 — Color (shorthand base 이름과 1:1 대응) */
--border-strong-color, --border-default-color, --border-light-color
--border-white-color, --border-black-color, --border-accent-color

/* 테두리 — Width scale */
--border-width-thin (1px), --border-width-default (1.5px), --border-width-thick (2px)
--border-width-thicker (3px), --border-width-thickest (4px)

/* 테두리 — Shorthand (1px 기본; 두께 변경 시 컴포넌트에서 조합) */
--border-strong, --border-default, --border-light
--border-white, --border-inverse, --border-accent

/* Editorial (페이지 레이아웃) */
--editorial-panel-py, --editorial-panel-px
--editorial-fs-hero, --editorial-fs-lead
--editorial-space-section, --editorial-space-block
```

### Layer 3 — Context Tokens (CSS Module 내 `--_*`)

컴포넌트 루트 선택자에 정의. **항상 글로벌 토큰을 참조**.

```css
/* ✓ 올바른 예 */
.section {
  --_panel-py: var(--editorial-panel-py);
  --_color-accent: var(--color-accent);
  --_ease: var(--ease-material);
}

/* ✗ 잘못된 예 — 직접 값 금지 */
.section {
  --_panel-py: 48px;             /* raw value 금지 */
  --_color: var(--color-accent, #d40063);  /* fallback 금지 */
  --_bg: #f5f5f0;                /* hex 직접 사용 금지 */
}
```

**예외**: 컴포넌트 고유 이펙트 색상은 파일당 1–2개 허용 (e.g., CursorTrail `--_color: #3b82f6`).

---

## 2. CSS 클래스 네이밍

### 기본 원칙

- **CSS Modules** 사용 — 모든 클래스는 자동으로 해시됨
- **camelCase** — BEM(`__`, `--`) 미사용
- **의미 기반** 이름 — 시각적 설명보다 역할/용도 우선

### 클래스 분류별 컨벤션

| 분류 | 예시 |
|------|------|
| 루트/컨테이너 | `.section`, `.container`, `.card`, `.panel` |
| 레이아웃 래퍼 | `.track`, `.content`, `.body`, `.wrapper`, `.group`, `.row` |
| 패널 변형 | `.panelWide`, `.panelNarrow`, `.panelExtraWide`, `.panelCompact` |
| 타이포그래피 | `.title`, `.titleLine`, `.label`, `.description`, `.meta` |
| 인터랙티브 | `.button`, `.link`, `.toggle`, `.badge` |
| 상태 (JS 연동) | `.isActive`, `.isOpen`, `.isLoading` |
| 애니메이션 트리거 | `.animate`, `.animateVisible` |

> **CSS Modules + 상태 클래스 주의**: JS로 동적 클래스를 추가할 때는 반드시 `styles.isActive`(해시된 이름)를 사용. 일반 문자열 `'isActive'`로 `classList.add` 하면 해시된 클래스와 불일치해 적용 안 됨.
> ```tsx
> // ✓ 올바른 예
> el.classList.toggle(styles.isActive, condition);
> // ✗ 잘못된 예
> el.classList.toggle('isActive', condition);
> ```
| 에러 상태 | `.fieldLabelError`, `.editorLabelError`, `.sectionTitleError` |

### 계층 표현

중첩은 CSS의 자식 선택자로, 별도 클래스 없이 처리:

```css
/* ✓ 올바른 예 — 자식 선택자 */
.card .image { ... }
.actions .primaryButton { transition: ...; }  /* 특이도 (0,2,0) 확보 */

/* ✗ 지양 — BEM 스타일 */
.card__image { ... }
.card--active { ... }
```

---

## 3. CSS 특이도 주의사항

### 글로벌 테마 트랜지션

`src/styles/globals/_base.css`에 전역 transition 규칙이 있음:

```css
html[data-theme-ready] *,
html[data-theme-ready] *::before,
*::after {
  transition: background-color 0.3s, border-color 0.3s, color 0.3s,
              fill 0.3s, stroke 0.3s, box-shadow 0.3s;
}
```

**특이도: `(0,1,1)`** — 단일 클래스 선택자 `(0,1,0)`을 이김.

`transition` shorthand는 지정된 속성 외의 모든 트랜지션을 **덮어씀**.
`opacity`, `transform`, `max-height`, `padding` 등은 컴포넌트에서 직접 정의해도 무시됨.

**해결 방법**: 복합 선택자 `(0,2,0)` 사용:

```css
/* ✓ 글로벌 규칙을 이기는 방법 */
.actions .primaryButton {
  transition: background-color 0.3s ease, color 0.3s ease;
}

/* 또는 !important (최후 수단) */
.loadingScreen {
  transition: opacity 0.5s cubic-bezier(0.4, 0, 0.2, 1) !important;
}
```

전역 테마 트랜지션이 커버하는 속성: `background-color`, `border-color`, `color`, `fill`, `stroke`, `box-shadow`.

---

## 4. 다크/라이트 테마

```css
/* _semantic.css 패턴 */
:root {
  --bg-primary: var(--color-neutral-50);   /* light: 밝은 배경 */
}

[data-theme="dark"] {
  --bg-primary: var(--color-neutral-950);  /* dark: 어두운 배경 */
}
```

컴포넌트에서는 `--bg-primary`, `--text-primary` 등 semantic 토큰만 사용 → 테마 전환 자동 적용.

---

## 5. 반응형 & 유동 값

**모바일 vw 토큰**: `_sizing.css`에 480px 이하 전용 토큰 있음 — `--m-sm` (2.1vw), `--m-md` (4.2vw), `--m-lg` (5vw). 모바일에서 px 대신 vw 기반 여백/크기 조정 시 사용.

**Fluid tokens**: 뷰포트에 따라 자동 스케일 (clamp 기반)

```css
--fluid-font-size-2xl: clamp(1.25rem, 2.5vw, 2rem);
--fluid-spacing-section: clamp(2rem, 5vw, 5rem);
```

**Breakpoint**: CSS 미디어 쿼리는 `var()` 미지원 → `--breakpoint-*` 토큰을 직접 쓸 수 없음. 미디어 쿼리에서는 직접 값 사용:

```css
@media (max-width: 1024px) { ... }   /* tablet */
@media (max-width: 768px) { ... }    /* mobile */
```

`--breakpoint-*` 토큰은 JS에서만 활용 가능:
```ts
getComputedStyle(document.documentElement).getPropertyValue('--breakpoint-md') // "768px"
```

> **`--pc` / `--tablet` / `--mobile`**: `_sizing.css`에 별도 Device Breakpoint 세트도 존재 (`--pc: 1025px`, `--tablet: 768px`, `--mobile: 378px`). 미디어 쿼리 기준값으로는 이 세 값을 사용.

---

## 6. z-index 레이어

| 토큰 | 값 | 용도 |
|------|----|------|
| `--z-below` | -1 | 배경 요소 |
| `--z-content` | 10 | 일반 콘텐츠 |
| `--z-nav` | 100 | 네비게이션 |
| `--z-float` | 200 | 플로팅 버튼 |
| `--z-dropdown` | 500 | 드롭다운 |
| `--z-tooltip` | 700 | 툴팁 |
| `--z-modal` | 8000 | 모달 |
| `--z-overlay` | 9000 | 오버레이 (LoadingScreen) |
| `--z-top` | 10000 | 최상위 |

---

## 7. 타이포그래피 토큰 선택 기준

| 상황 | 사용 토큰 |
|------|----------|
| 본문 텍스트 | `--font-size-sm` ~ `--font-size-lg` |
| 제목 (고정) | `--font-size-2xl` ~ `--font-size-5xl` |
| 제목 (반응형) | `--fluid-font-size-2xl` ~ `--fluid-font-size-6xl` |
| 에디토리얼 히어로 | `--editorial-fs-hero` |
| 코드/모노 | `--font-mono` |
| 디스플레이 세리프 | `--font-display` (Instrument Serif) |
| UI 산세리프 | `--font-grotesk` (Space Grotesk) |

---

## 8. 모션 토큰 사용

```css
/* ✓ 토큰 활용 */
.image {
  transition: transform var(--duration-slow) var(--ease-material);
}

.overlay {
  transition: opacity var(--duration-base) var(--ease-out-expo);
  animation-duration: var(--duration-slower);
  animation-delay: var(--delay-base);
}
```

| 토큰 | 값 | 적합한 용도 |
|------|----|------------|
| `--duration-instant` | 100ms | 즉각 피드백 (토글) |
| `--duration-fast` | 150ms | 호버 효과 |
| `--duration-base` | 250ms | 기본 전환 |
| `--duration-slow` | 400ms | 패널 슬라이드 |
| `--duration-slower` | 600ms | 페이지 전환 |
| `--ease-material` | cubic-bezier(.4,0,.2,1) | 범용 |
| `--ease-bounce` | cubic-bezier(.34,1.56,.64,1) | 탄성 효과 |
| `--ease-out-expo` | cubic-bezier(.16,1,.3,1) | 등장 애니메이션 |

---

## 9. 금지 사항

```css
/* ✗ hex/rgba 직접 사용 (예외: 컴포넌트 고유 이펙트 색상은 파일당 1–2개 허용) */
color: #1a1a1a;
background: rgba(0,0,0,0.5);

/* ✗ var() fallback */
color: var(--text-primary, #333);

/* ✗ 글로벌 토큰 우회 */
--_bg: #f5f5f0;

/* ✗ 매직 넘버 z-index */
z-index: 9999;

/* ✗ BEM 클래스 */
.card__title { }
.card--active { }
```

---

## 10. 공용 UI 컴포넌트

### SearchCapsule (`src/components/ui/SearchCapsule/`)

캡슐형 검색 입력. 정렬·태그 캡슐 버튼과 톤 / padding 을 통일해 한 줄에 같이 놓을 수 있음.

- **`searchType` prop optional** — 지정 시 좌측에 type select(예: 제목 / 본문) 노출, 미지정 시 단순 입력 캡슐
- **padding `var(--spacing-2xs) var(--spacing-sm)`** — 태그 / sort 캡슐과 동일한 슬림 사이즈
- **`compact` prop** — 더 작은 height 가 필요한 자리에서 사용
- 내부 Select trigger 의 `min-height: var(--size-sm)` 을 `0 !important` 로 override 해서 캡슐 높이에 정렬

```tsx
<SearchCapsule
  value={query}
  onChange={setQuery}
  placeholder={t("posts.searchPlaceholder")}
  // 옵션 — 검색 타입 셀렉트 동시 노출
  searchType={searchType}
  onSearchTypeChange={setSearchType}
  searchTypes={[{ value: "all", label: t("posts.searchAll") }, { value: "title", label: t("posts.searchTitle") }]}
/>
```

> **이전 위치**: `src/components/admin/SearchCapsule/` (admin 전용으로 시작) → 일반 UI 로 승격하면서 `components/ui/` 로 이동. PostsClient · `/admin/comments` 등 모든 인라인 검색 input 이 이 컴포넌트로 통일됨.

### Tooltip + `<T>` 합성

번역 가능한 텍스트 + 짧은 설명을 같은 hover 에 노출하기 위해 두 컴포넌트를 합성하는 표준 패턴:

```tsx
import T from "@/components/ui/T";
import Tooltip from "@/components/ui/Tooltip";

<Tooltip content={t("posts.sortDateTooltip")}>
  <T ko="최신순" en="Latest" />
</Tooltip>
```

- `<T>` — short hover(< 600ms) 시 현재 언어, long hover(>= 600ms) 시 반대 언어 노출
- `<Tooltip>` — 같은 hover 에 짧은 설명(rule of thumb: 한 문장) 노출
- 두 트리거가 같은 hover 영역을 공유하므로 사용자에게는 "한 번 hover → 번역 + 설명 동시 표시" 로 보임. 모바일은 터치 토글로 동일 결과
- **언제 쓰나** — capsule 버튼·아이콘 only 트리거·축약된 라벨 등 시각만으로 의미가 즉시 전달되지 않는 자리에 의무화

### 캡슐형 정렬 버튼 패턴 (sortBtn)

`/posts` 의 정렬 컨트롤 — 같은 정렬 키를 다시 누르면 방향(asc / desc) toggle.

- 활성 상태에서만 `sortDirIcon` 화살표(▲ / ▼) 노출, `transform: rotate(180deg)` + transition 으로 부드러운 회전
- `display: inline-flex; white-space: nowrap` 으로 화살표가 줄바꿈으로 떨어지는 사고 방지
- hover indicator 는 Framer Motion `layoutId` 로 캡슐 사이를 슬라이드
- "랜덤" 처럼 방향 개념이 없는 정렬은 **별도 Shuffle 아이콘 버튼** 으로 분리(같은 컨트롤 row 의 마지막에 배치)

### Shuffle 버튼 패턴

랜덤 정렬은 누를 때마다 새 시드로 셔플되는 동작이 본질이므로 `sortBtn` 의 toggle 의미와 충돌. 별도 캡슐 아이콘 버튼으로 분리:

- `<Shuffle />` 아이콘 + 활성 시 accent border + 가벼운 회전 hint
- `Tooltip` 로 "임의 순서로 섞기, 누를 때마다 새로 셔플" 설명 명시
- 시드는 `Date.now()` 또는 페이지 키로 — mulberry32 셔플로 같은 시드 / 같은 페이지 = 같은 결과(페이지 이동 시 안정성)

---

## 11. 파일 위치 참조

```
src/styles/
├── tokens/
│   ├── _index.css          # 배럴 (모든 토큰 import)
│   ├── _color.css
│   ├── _spacing.css
│   ├── _typography.css
│   ├── _motion.css
│   ├── _radius.css
│   ├── _shadow.css
│   ├── _sizing.css
│   └── _z-index.css
└── globals/
    ├── _base.css           # reset + 글로벌 테마 transition
    ├── _semantic.css       # Layer 2: 의미 토큰 + 다크테마
    ├── _layout.css         # 공통 레이아웃
    ├── _animations.css     # @keyframes
    └── _utilities.css      # 유틸리티 클래스
```

디자인 시스템 미리보기: `/design-system` 라우트에서 토큰/컴포넌트 확인 가능.
