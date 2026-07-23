# 디자인 시스템 규칙

> CSS 네이밍 컨벤션 · 토큰 구조 · 컴포넌트 스타일링 규칙

> **관련 문서** — [리팩토링 방법론](./refactoring-guide.md)
> — 컴포넌트를 어느 폴더에 둘지: [컴포넌트 배치 기준](./refactoring-guide.md#배치-기준)
> — "CSS 모듈은 담당 컴포넌트와 1:1" 등 리팩토링 시 코드 기준: [코드 기준선](./refactoring-guide.md#3-코드-기준선)
> — 공용 컴포넌트 **사용법**(SearchCapsule·Tooltip·MenuDots 등): [components.md](./components.md)

---

## 1. 토큰 4-레이어 구조

```
Raw Tokens           →  Semantic Tokens          →  Component Tokens         →  Context Tokens
(src/styles/tokens/)    (globals/_semantic.css)     (globals/_semantic.css)     (CSS Module: --_*)
원시값 (숫자/색상)         역할 기반, 컴포넌트 무관        컴포넌트 typing (일관성 레일)    컴포넌트 내부 local 변수
```

| Layer | 위치 | 예시 | 역할 |
|---|---|---|---|
| Raw | `tokens/` | `--size-sm: 32px`, `--color-neutral-900` | 원시 값 |
| Semantic | `_semantic.css` (Layer 2) | `--text-primary`, `--border-default`, `--bg-accent` | 의미/역할 부여, 컴포넌트 무관 |
| Component | `_semantic.css` (Layer 3) | `--button-h-sm`, `--control-h-md`, `--button-p-lg` | 컴포넌트별 spec (실수 방지 레일) |
| Context | CSS Module `--_*` | `--_h: var(--button-h-sm)`, `--_color: var(--text-accent)` | module 내부 local 변수 (variant 처리) |

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

### Layer 3 — Component Tokens (`_semantic.css` 안, 컴포넌트 typing)

컴포넌트 타입을 이름에 박은 토큰. **일관성 레일** 역할 — 컴포넌트 CSS 에서 raw `--size-*` 를 직접 쓰지 않고
이 토큰을 거치면 다른 사이즈 골라서 일관성 깨지는 실수를 방지함. Carbon / Primer 등 실무 DS 의 흔한 패턴.

```css
/* Control heights — 두 갈래다. 원/사각 아이콘 버튼은 padding 으로 높이를 못 잡으므로
   --button-h-* 를 별도로 두고, capsule 형 컨트롤은 --control-h-* 를 쓴다. */
--button-h-xs: var(--size-2xs);  /* 20 — icon-only xs */
--button-h-sm: var(--size-xs);   /* 24 — icon-only sm */
--button-h-md: var(--size-md);   /* 38 — icon-only md */
--button-h-lg: var(--size-lg);   /* 46 — icon-only lg */

/* capsule controls (Button/Input/Select/SegmentedControl…) — Button size 와 1:1 대응 */
--control-h-xs: 24px;
--control-h-sm: 28px;
--control-h-md: 32px;            /* Input/Select 기본 */
--control-h-lg: 36px;

/* padding 계열 — --button-p-*, --input-p, --textarea-p, --skeleton-h-* 도 이 Layer 3 에 있다 */
```

**사용 규칙**:
- 버튼·인풋·셀렉트 등 컨트롤은 raw `--size-*` 직접 X → Component 토큰 사용
- 컴포넌트 사이 정책을 독립 조정 가능 (예: button 만 키우고 싶을 때 `--button-h-sm` 만 수정)
- 새 컴포넌트가 등장하면 `--*-h-*`, `--*-padding` 형태로 추가

### Layer 4 — Context Tokens (CSS Module 내 `--_*`)

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
| 에러 상태 | `.fieldLabelError`, `.editorLabelError`, `.sectionTitleError` |

> **CSS Modules + 상태 클래스 주의**: JS로 동적 클래스를 추가할 때는 반드시 `styles.isActive`(해시된 이름)를 사용. 일반 문자열 `'isActive'`로 `classList.add` 하면 해시된 클래스와 불일치해 적용 안 됨.
> ```tsx
> // ✓ 올바른 예
> el.classList.toggle(styles.isActive, condition);
> // ✗ 잘못된 예
> el.classList.toggle('isActive', condition);
> ```

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
| `--z-below` | -1 | 배경 레이어 (video bg 등) |
| `--z-content` | 10 | 페이지 콘텐츠 |
| `--z-nav` | 100 | 고정 네비게이션 |
| `--z-float` | 200 | nav 위 고정 UI (dot nav, credits footer) |
| `--z-dropdown` | 500 | 드롭다운/셀렉트 (페이지 레벨) |
| `--z-popover` | 600 | 팝오버 (드롭다운 위) |
| `--z-tooltip` | 700 | 툴팁 (팝오버 위) |
| `--z-modal` | 8000 | 모달, 이미지 뷰어 |
| `--z-overlay` | 9000 | 전체화면 오버레이 (drawer, LoadingScreen) |
| `--z-fullscreen` | 9500 | 에디터 블록 전체화면 (playground/diagram/mermaid) |
| `--z-top` | 10000 | 최상위 (페이지 전환) |

> 페이지 레벨의 dropdown/popover/tooltip 은 오버레이 아래지만, 모달 안에서는
> `PortalContainerContext` 로 모달 layer 에 portal 돼 자동으로 모달 위에 뜬다.

---

## 7. 타이포그래피 토큰 선택 기준

| 상황 | 사용 토큰 |
|------|----------|
| 본문 텍스트 | `--font-size-sm` ~ `--font-size-lg` |
| 제목 (고정) | `--font-size-2xl` ~ `--font-size-5xl` |
| 제목 (반응형) | `--fluid-font-size-2xl` ~ `--fluid-font-size-6xl` |
| 에디토리얼 히어로 | `--editorial-fs-hero` |
| 코드/모노 | `--font-mono` (JetBrains Mono) |
| 디스플레이 세리프 | `--font-display` (Playfair Display) · 본문 세리프는 `--font-serif` (동일 Playfair 폴백 스택) |
| UI 산세리프 | `--font-grotesk` (Space Grotesk) · 기본 산세리프는 `--font-sans` (Inter) |

> `--font-instrument`(Instrument Serif)는 `layout.tsx` 에서 next/font 로 로드되는 별도 변수다.
> family 토큰(`--font-*`)에는 없고 특정 컴포넌트에서 직접 `var(--font-instrument)` 로 쓴다.

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

## 10. 파일 위치 참조

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
    ├── _utilities.css      # 유틸리티 클래스
    ├── _hljs.css           # Shiki 코드블록 하이라이팅 (richtext)
    ├── _poll.css           # 투표 블록 (에디터 + reader 공용, 글로벌 클래스)
    ├── _tabs.css           # 탭 블록 (에디터 + reader 공용, 글로벌 클래스)
    ├── _sheet.css          # Bottom Sheet 공통 시각 패턴 (Popover/CoverImagePicker)
    ├── _scroll.css         # Lenis 스무스 스크롤
    └── _overrides.css      # 커스텀 스크롤바 등 서드파티 override
```

디자인 시스템 미리보기: `/design-system` 라우트에서 토큰/컴포넌트 확인 가능.
