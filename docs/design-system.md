# 디자인 시스템 명세

> 스타일의 **규칙**만 적는다. 토큰 **값**은 [토큰 표](./tokens.md)(CSS 에서 자동 생성), 규칙을 그렇게 정한
> **이유와 이력**은 [결정 기록](./design-system-decisions.md), 공용 컴포넌트 **사용법**은 [components.md](./components.md).

## 읽는 법

규칙마다 상태를 붙인다.

| 표시 | 뜻 |
|---|---|
| **강제** | 이미 지켜지고 있고, lint·테스트가 막는다. 어기면 커밋·CI 가 실패한다 |
| **목표** | 앞으로 지킬 규칙인데, **아직 안 지키는 옛 코드가 남아 있다.** 괄호 안 숫자가 그 남은 곳의 수다 |
| **권장** | 막지 않는다. 리뷰에서 본다 |

**"목표"를 읽는 법** — 예를 들어 `3.7-1. 시간·곡선은 토큰으로. … — 목표(451)` 은
"`transition: 0.3s` 처럼 시간을 숫자로 직접 쓴 곳이 아직 451곳 있다"는 뜻이다(2026-10-01 에 센 수).

- 새로 쓰는 코드는 처음부터 이 규칙을 지킨다.
- 451곳은 [이행 계획](#11-이행-계획)의 해당 단계에서 고쳐 0으로 만든다.
- 그 전까지 이 숫자가 **늘면 안 된다**(새 코드가 규칙을 어겼다는 뜻). 이행 3단계에서 숫자가 늘면 실패하는 테스트를 둔다.
- 0이 되면 lint 규칙으로 바꾸고 "강제"로 올린다.

규칙 번호는 **절 번호-순번**이다 — `3.4-3` 은 §3.4(크기)의 세 번째 규칙.

---

## 1. 기반

| | 정한 것 |
|---|---|
| 스타일 방식 | **CSS Modules + 디자인 토큰** 하나. 유틸리티 클래스(Tailwind)·런타임 CSS-in-JS 는 쓰지 않는다 |
| 파일 | 컴포넌트 하나 ↔ `.module.css` 하나, 같은 폴더 |
| 반복 | 같은 스타일이 3곳 넘게 반복되면 CSS 유틸이 아니라 **React 컴포넌트**로 뽑는다 |
| 지원 브라우저 | `package.json` 의 browserslist — Chrome·Edge·Firefox·Safari **최근 2개 버전**(Safari 18 이상) |

지원 브라우저가 이 범위라서 아래 기능은 **기본으로 쓴다**(폴리필·대체 코드 없이): cascade layer(`@layer`),
nesting, `:has()`, container query, `color-mix()`, `oklch()`, `light-dark()`, media query 범위 문법,
`<dialog>`·Popover API(top layer), View Transitions(같은 문서 안).
CSS anchor positioning 은 Safari 18 이 못 해서 아직 쓰지 않는다 — 떠 있는 요소의 위치는 JS 가 잡는다.

---

## 2. 토큰 구조

```
Raw(원시)                 →  Semantic(역할)               →  Component(컴포넌트)
src/styles/tokens/*.css      globals/_semantic.css           globals/_semantic.css
눈금 · 팔레트                   텍스트·배경·테두리 색, 글자 역할      컨트롤 높이, 버튼·행·모달 여백
테마와 무관                     테마가 여기서 바뀐다                 테마와 무관
```

**2-1. 층은 셋이다.** 네 번째 층을 만들지 않는다. 모듈 안 지역 변수(`--_x`)는 층이 아니라 그 파일의 사정이다.

**2-2. 컴포넌트 CSS 는 Semantic·Component 를 부른다.** Raw 를 직접 부르는 건 그 축에 역할 층이 없을 때만이다
— 간격(`--spacing-*`) · 그림자 · 모션 · z-index. 축별 판정은 §3.

**2-3. Raw 는 테마에 따라 바뀌지 않는다.** — **목표**(Raw 색 토큰 80개가 다크에서 값이 바뀜)
팔레트(`--color-neutral-50` 등)는 어느 테마에서나 같은 색이다. 다크 테마는 Semantic 층이 **다른 단계를
가리켜서** 만든다(`--bg-primary: light-dark(var(--color-neutral-50), var(--color-neutral-950))`).
Raw 를 뒤집으면 "neutral-50 이 어두운 색"이 되어 이름이 거짓말을 한다.

**2-4. 역할 층은 필요한 축에만 만든다.** 같은 값을 여러 자리가 쓰고 **함께 바뀌어야 할 때만** 역할 이름을
만든다. 간격에는 범용 역할을 만들지 않는다(`--space-card-gap` 같은 것). 간격의 역할은 Component 층에 둔다.

**2-5. 이름은 「종류 → 역할 → 정도」.** 같은 종류가 사전순으로 붙는다.

| | |
|---|---|
| ✓ | `--border-color-strong` · `--control-h-md` · `--text-secondary` |
| ✗ | `--border-strong-color`(종류가 뒤) · `--ui-fs-sm`(축약) · `--font-size-14`(값을 이름에) |

**2-6. 눈금은 처음부터 모든 단계를 고르게 만들어 둔다.** 쓰는 곳이 0인 단계도 지우지 않는다 — 중간이 빠지면
눈금이 고르지 않게 되고, 그 크기가 필요해지는 순간 고를 게 없어 숫자를 직접 쓰게 된다. 단계 이름은
`4xs … 6xl` 안에서 짓고, 반 단계(`2xl-plus`)를 새로 만들지 않는다.

**2-7. 토큰은 세 종류이고, 만드는 시점이 다르다.**

| 종류 | 예 | 만드는 시점 |
|---|---|---|
| 눈금 | `--font-size-*` · `--spacing-*` · `--size-*` · 색 팔레트 단계 | 미리 전부(2-6) |
| 역할·컴포넌트 | `--text-secondary` · `--control-h-md` · `--card-p-md` | 그 역할을 하는 자리가 생길 때 추가하고, 없어지면 지운다 |
| 조합 | `--box-xs-md`(= 8px 16px) · 색마다 둔 투명도 단계 | 만들지 않는다 — 눈금 두 개를 나란히 적거나 `color-mix()` 로 |

— **목표**(쓰는 곳이 없는 역할·조합 토큰 67개. 쓰는 곳 없는 눈금 단계 35개는 2-6 에 따라 남긴다)
예외는 테두리 묶음(`--border-default` = 두께 + 색) 하나 — 816곳이 쓰는 사실상의 기본 단위라 DTCG 의
`border` 묶음 타입처럼 취급한다.

**2-8. 토큰 원본은 CSS 다.** 값은 [토큰 표](./tokens.md)에 자동으로 나간다 — **강제**(`tokenDoc.test.ts`).
토큰을 바꾸면 `npm run tokens:doc`.

**2-9. 디자인 토큰에 `var()` 대체값을 쓰지 않는다.** 없는 토큰을 가려서 조용히 깨진다 — **강제**(stylelint).

---

## 3. 축별 규칙

### 3.1 색

| 층 | 토큰 |
|---|---|
| Raw | `--color-neutral-0 … 999`, `--color-accent(-dark/-light)`, 상태색(`--color-success` 등) |
| Semantic | `--text-*` · `--bg-*` · `--border-color-*` (테마는 여기서) |

- **3.1-1. 색 값은 토큰 파일 안에만 쓴다.** 컴포넌트 CSS 는 `var()` 또는 `color-mix()` 로만 색을 만든다.
  `background`·`box-shadow`·`border`·`filter`·`mask-image` 같은 묶음 속성 안의 색도 같다.
  — **목표**(hex 17 · `rgb()/hsl()/oklch()` 60 · 지역 변수에 색 16). 지금 lint 는 `color` 등 다섯 속성의 hex 만 본다.
- **3.1-2. 반투명은 `color-mix()` 하나로 만든다.** 투명도별 토큰을 두지 않는다.
  ```css
  background: color-mix(in oklch, var(--color-accent) 20%, transparent);
  ```
  — **목표**(투명도 토큰 82개, 269곳 사용). 같은 색의 20%·30%·40% 를 토큰으로 두면 단계마다 토큰이 는다.
- **3.1-3. 테마 전환은 `color-scheme` 와 `light-dark()` 로 한다.** — **목표**(`color-scheme` 0곳)
  ```css
  :root { color-scheme: light; }
  :root[data-theme="dark"] { color-scheme: dark; }
  --bg-primary: light-dark(var(--color-neutral-50), var(--color-neutral-950));
  ```
  `color-scheme` 가 없으면 다크 테마에서도 스크롤바·기본 폼 컨트롤·자동완성 배경이 밝게 남는다.
  테마를 고르는 건 지금처럼 `ThemeProvider` 가 `data-theme` 로 한다(OS 설정을 따르되 사용자가 바꿀 수 있다).

### 3.2 간격

- 눈금: `--spacing-*` = `1 · 2 · 4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48 · 64 · 80 · 96 · 112 · 128px`.
- **3.2-1. 여백·간격의 px/rem 숫자는 눈금 토큰으로 쓴다.** 두 값이 필요하면 토큰 두 개를 나란히 적는다. — **강제**
- **3.2-2. 반복되는 컴포넌트 종류는 Component 층의 여백 토큰을 쓴다** — `--button-p-*`, `--row-p-*`,
  `--badge-p-*`, `--modal-p-*`, `--card-p-*`, `--field-p-*`, `--cell-p-*`, `--input-p`, `--textarea-p`.
- `em`·`vw`·`vh`·`%`·`calc()`·음수는 막지 않는다 — 글자나 화면에 비례하라고 쓴 값이다.
- 긴 글 지면의 리듬은 Semantic 의 `--panel-py` · `--space-section/block/divide/line`.

### 3.3 글자

| 역할 토큰 | 크기 | 쓰는 자리 |
|---|---|---|
| `--font-size-body` | 14 | UI 본문·입력값·목록 |
| `--font-size-label` | 13 | 필드 라벨·버튼 |
| `--font-size-hint` | 12 | 보조 설명·메타·뱃지·카운터 — **가장 작은 글자** |
| `--font-size-title-sm/md/lg` | 16/18/20 | 카드·섹션·화면 제목 |
| `--font-size-body-lg/xl` | 16/18 | 긴 글 본문·리드 |
| `--font-size-2xl … 6xl` | 24 이상 | 제목·디스플레이(단계가 곧 역할) |
| `--font-size-hero/lead/subhead/prose*` | 화면 비례 | 지면 제목·본문 |

- **3.3-1. 14px 이하 단계 이름(`sm/xs/2xs`)은 컴포넌트에서 쓰지 않고 역할 이름으로.** 12px 미만을 숫자로 쓰지 못한다. — **강제**
- **3.3-2. 가장 작은 글자는 12px 이다. 11px 단계는 두지 않는다.** — **목표**(`--font-size-micro` 를 쓰는 곳 103)
  1px 차이로 단계를 하나 더 두면 "어느 쪽을 고를지"의 기준이 흐려진다. 달력 칸처럼 조밀한 자리는 글자를 줄이지
  않고 여백·줄 수·말줄임으로 푼다. 103곳을 `--font-size-hint` 로 옮긴 뒤 `--font-size-micro` 와 눈금 `3xs`(11px)를 지운다.
- **3.3-3. 글자 크기는 토큰으로.** px/rem 숫자 금지. — **목표**(56)
- **3.3-4. 16px 이상에서 단계 이름(`md`·`lg`·`xl`)을 그대로 쓰지 않는다** — `title-*`·`body-*` 로. — **목표**(129)
- **3.3-5. 화면 비례 글자는 가운데 값에 rem 을 섞는다.** 브라우저 확대(zoom)에도 커져야 한다(WCAG 1.4.4).
  ```css
  /* ✗ 가운데가 화면 단위뿐 — 확대해도 안 커진다 */
  font-size: clamp(2rem, min(9vw, 18vh), 10rem);
  /* ✓ */
  font-size: clamp(2rem, 1.5rem + 4vw, 10rem);
  ```
  — **목표**(토큰 정의 11 · 직접 쓴 곳 150). 간격·크기의 화면 비례 값은 해당하지 않는다.
- **3.3-6. 줄간격은 단위 없는 숫자로.** px 금지(글자 크기를 따라가지 않는다). — **목표**(21)
- **3.3-7. 자간은 `em` 으로.** 글자 크기를 따라가야 한다. 토큰은 두지 않는다. — **권장**
- 글꼴: `--font-sans`(Inter) · `--font-grotesk`(Space Grotesk) · `--font-display`/`--font-serif`(Playfair) ·
  `--font-mono`(JetBrains Mono). `--font-instrument` 는 `layout.tsx` 의 next/font 변수다.

### 3.4 크기

**컨트롤 높이** — 버튼·입력·셀렉트·칩처럼 한 줄에 나란히 놓이는 것. Component 층 `--control-h-*` 하나가 정한다.

| 단계 | 2xs | xs | sm | md | lg | xl |
|---|---|---|---|---|---|---|
| 높이 | 20 | 24 | 28 | **32** | 36 | **40** |

- **3.4-1. 4px 간격 눈금 하나.** — **목표**: `xl` 을 38→40 으로(지금 Button `xl` 은 토큰 대신 40px 를 직접 씀),
  `2xl`(46) 은 컨트롤 눈금에서 뺀다.
- **3.4-2. 컨트롤 높이는 `--control-h-*` 로만.** px 숫자 금지, Raw `--size-*` 금지.
  — **목표**(단추·입력 선택자에 직접 쓴 높이 89 · `--size-*` 로 컨트롤 높이를 준 곳 3)
- **3.4-3. 누르는 것은 24×24 이상.** WCAG 2.2(2.5.8). `2xs`(20) 는 누르지 않는 것(뱃지·표시)에만 쓰거나,
  누르는 것이면 `::before` 로 누르는 영역을 24 이상으로 넓힌다. — **목표**(`2xs` 를 쓰는 14곳 확인)
- **3.4-4. 같은 이름 = 같은 높이.** 공용 컴포넌트의 `size` prop 은 위 눈금 이름을 그대로 따른다
  (`size="sm"` 이면 어느 컴포넌트든 28). — **목표**: CloseButton 이 한 칸 밀려 있다(xs 20 · sm 24 · lg 38).

**떠 있는 단추** — 이미지 뷰어·배너 넘김처럼 화면 위에 떠 있는 원형 단추. 줄에 나란히 놓이지 않으므로
컨트롤 눈금이 아니라 Component 토큰 `--float-btn-sm`(38) · `--float-btn-md`(46) 을 쓴다. — **목표**(새 토큰)

**그 밖의 사각형** — 아이콘·아바타·썸네일은 Raw `--size-*`(4 … 112px).

### 3.5 모서리

| 층 | 토큰 |
|---|---|
| 눈금 | `--radius-2xs` 2 · `xs` 4 · `sm` 6 · `md` 8 · `lg` 12 · `xl` 16 · `2xl` 24 · `circle` 50% · `capsule` 9999px |
| 역할 | 아래 넷 |

| 역할 토큰 | 값 | 자리 |
|---|---|---|
| `--radius-control` | capsule | 버튼·칩·뱃지·입력·hover/선택 배경 하이라이트 |
| `--radius-surface` | 2xl(24) | 카드·패널·모달처럼 면이 있는 것 |
| `--radius-round` | circle | 아바타·아이콘 버튼 등 정원 |
| `--radius-mark` | xs(4) | 각진 것 자체가 의미인 자리 — 체크박스·다중선택 마커(단일은 원, 다중은 네모)·컬러피커 SV 사각형·`shape="square"` |

- **3.5-1. 컴포넌트는 역할 토큰만 쓴다.** 눈금(`--radius-2xl` 등)은 역할 토큰을 정의할 때만 쓴다. 글자 크기(§3.3)와 같은 구조다.
  — **목표**(눈금 이름을 직접 쓴 곳 1176 — 이름만 바뀌고 보이는 건 그대로 · 예외 주석 19)
  같은 성격의 카드가 6px 과 12px 로 갈리는 걸 막는 건 "눈금이 셋뿐"이 아니라 "고를 수 있는 역할이 넷뿐"이다.
- **3.5-2. 모서리는 토큰으로.** `50%`·`9999px` 은 **강제**로 막는다. `2px` 같은 숫자는 **목표**(21). 각지게 하려면 `0`.
- **3.5-3. 안쪽 요소의 모서리는 바깥 모서리 − 사이 여백**(동심원)으로 맞춘다. 같은 값을 겹쳐 쓰면 안쪽이 더 둥글어 보인다.
  이때는 눈금에서 가장 가까운 단계를 쓴다(예: 바깥 24 · 여백 8 → 안쪽 16 = `xl`. 바깥 24 · 여백 10 → 14 는 눈금에 없으니 가까운 `xl` 16). — **권장**

### 3.6 테두리·그림자·투명도

- 테두리 두께는 `--border-width-*`, 테두리 묶음은 `--border-*`(2-7 예외). 숫자로 쓴 테두리 — **목표**(46)
- 그림자는 `--shadow-*`. 그림자 값을 직접 쓰지 않는다 — **목표**(29)
- 투명도(`opacity`)는 토큰을 두지 않는다. 비활성 상태는 공용 컴포넌트가 정한 값을 따른다.

### 3.7 모션

| 토큰 | 값 | 자리 |
|---|---|---|
| `--duration-instant` | 100ms | 즉각 피드백(토글) |
| `--duration-fast` | 150ms | 호버 |
| `--duration-base` | 300ms | 기본 전환 |
| `--duration-slow` | 500ms | 패널 슬라이드 |
| `--duration-slower` | 800ms | 페이지 전환 |
| `--ease-material` | `cubic-bezier(.4,0,.2,1)` | 범용 |
| `--ease-out-expo` | `cubic-bezier(.16,1,.3,1)` | 등장 |
| `--ease-bounce` | `cubic-bezier(.34,1.56,.64,1)` | 탄성 |

- **3.7-1. 시간·곡선은 토큰으로.** `transition`·`animation` 에 `0.3s` 같은 숫자를 쓰지 않는다. — **목표**(451)
- **3.7-2. 움직임 줄이기 설정은 토큰에서 한 번에 처리한다.** `prefers-reduced-motion: reduce` 이면 `:root` 에서
  `--duration-*` 을 0 에 가깝게 바꾼다. 시간 토큰을 쓴 곳은 따로 처리하지 않아도 된다. 큰 이동·시차 효과는
  모듈에서 따로 끈다. — **목표**
- **3.7-3. 테마 전환에 전역 transition 을 걸지 않는다.** — **목표**(전역 규칙 1 · 그걸 이기려고 붙인 특이도 보정·주석 91 ·
  `!important` transition 6) 지금은 `html[data-theme-ready] *` 가 모든 요소에 transition 을 걸어 컴포넌트의
  transition 을 덮는다. 테마를 바꿀 때는 View Transitions(`document.startViewTransition`)로 화면 전체를 한 번에
  바꾸고, 지원하지 않거나 움직임 줄이기 설정이면 즉시 바꾼다.

### 3.8 쌓임

- **3.8-1. 화면 위에 뜨는 것은 top layer 에 올린다.** 모달은 `<dialog>` + `showModal()`, 팝오버·툴팁·셀렉트 목록·
  날짜/색/이모지 선택기는 Popover API(`popover` 속성). top layer 는 z-index 와 무관하게 맨 위라
  "모달 안의 셀렉트가 모달 뒤로 숨는" 문제가 구조적으로 없다. — **목표**(`createPortal` 을 쓰는 파일 52)
- **3.8-2. 페이지에 고정된 UI 의 층은 `--z-*` 토큰으로.**

| 토큰 | 값 | 자리 |
|---|---|---|
| `--z-below` | -1 | 배경(영상 배경 등) |
| `--z-content` | 10 | 페이지 콘텐츠 |
| `--z-nav` | 100 | 고정 내비게이션 |
| `--z-float` | 200 | 내비 위 고정 UI |
| `--z-top` | 10000 | 페이지 전환 |

  모달·오버레이·드롭다운·팝오버·툴팁 층(`--z-modal` 등)은 3.8-1 이 끝나면 지운다.
- **3.8-3. 컴포넌트 안의 겹침은 `isolation: isolate` 로 쌓임 맥락을 만들고 `0 … 3` 만 쓴다.** 그보다 큰 숫자 —
  **목표**(85)

### 3.9 레이아웃·반응형

- **3.9-1. 작은 화면이 기본이다.** 큰 화면에서 덧붙인다(`min-width`). — **목표**(`max-width` 미디어 쿼리 210)
- **3.9-2. 미디어 쿼리는 범위 문법으로, 기준값은 셋.** `var()` 는 미디어 쿼리에 못 쓰므로 값을 직접 적는다.
  ```css
  @media (width >= 480px)  { … }  /* 큰 휴대폰 */
  @media (width >= 768px)  { … }  /* 태블릿 */
  @media (width >= 1024px) { … }  /* 데스크톱 */
  ```
  JS 가 같은 기준을 읽어야 하면 `_sizing.css` 의 `--mobile` · `--tablet` · `--pc` 를 쓴다(값을 셋에 맞춘다). — **목표**
- **3.9-3. 컴포넌트의 반응형은 container query 로.** 화면 폭이 아니라 놓인 자리의 폭을 따른다. 미디어 쿼리는
  페이지 골격에만. — **권장**(지금 6곳)
- **3.9-4. 등분 grid 는 `--grid-cols-*`**(`repeat(N, minmax(0, 1fr))`). `1fr` 만 쓰면 자식이 트랙을 밀어 넘친다.
  카드·타일 grid 는 `repeat(auto-fit, minmax(min(100%, 220px), 1fr))`. — **권장**
- 재사용 레이아웃에 `id` 선택자를 쓰지 않는다(페이지 골격 하나만 예외).

---

## 4. 우선순위와 순서 — cascade layer

**4-1. 전역 CSS 는 층에 넣고, 컴포넌트 CSS(Modules)는 층 밖에 둔다.** — **목표**(`@layer` 0곳)

```css
/* src/styles/global.css 맨 위 — 층 순서 선언 */
@layer reset, vendor, tokens, base, utilities;
```

| 층 | 내용 |
|---|---|
| `reset` | 브라우저 기본값 정리(`sanitize.css`) |
| `vendor` | 서드파티 CSS(에디터·KaTeX·코드 하이라이트)와 그 덮어쓰기 |
| `tokens` | `tokens/*`, `_semantic.css` |
| `base` | 요소 기본 스타일, 스크롤 |
| `utilities` | `.sr-only` 같은 전역 클래스 |

층 밖의 스타일은 **어느 층보다도 이긴다** — 특이도와 상관없다. 그래서 전역 규칙을 이기려고 클래스를 두 번
적거나(`.x.x`) `!important` 를 붙이던 일이 없어진다. `!important` 는 층에서 거꾸로 동작하므로(앞 층이 이긴다)
전역 CSS 에 쓰지 않는다.

**4-2. 컴포넌트 CSS 끼리는 층이 해결하지 못한다.** 두 모듈의 단일 클래스가 한 요소에서 겨루면 승자는 번들
순서인데, 개발 서버와 배포 빌드에서 순서가 다르다(#632). 그래서:

- 다른 파일의 클래스를 `composes` 로 가져오지 않는다. 필요한 선언은 그 모듈에 쓴다. — **권장**
- 같은 파일 안 `composes` 는 한 단계까지(Turbopack 이 두 단계째를 안 붙인다).
- `className` 을 받는 공용 컴포넌트는 이길 쪽을 정해 둔다 — 이겨야 하면 `.x.x`(0,2,0), 져야 하면 `:where(.x)`(0,0,0).

---

## 5. 컴포넌트

**누르는 것은 `Button` 아니면 `Pressable`.** 맨 `<button>` 은 쓰지 않는다.

| | 주는 것 | 언제 |
|---|---|---|
| `Pressable` | 동작만 — `type="button"`·사운드·disabled·누를 때 축소·UA 스타일 초기화 | 생김새가 그 자리 사정을 따르는 것 |
| `Button` | 동작 + 생김새(`variant` `size` `tone` `shape`) | 버튼처럼 생긴 버튼 |

MUI `ButtonBase`, React Aria `useButton` 과 같은 분리다. 생김새를 `Button` 에 다 담으려고 prop 을 늘리지 않는다.

**인라인 `style` 금지** — 단, 동적 값을 토큰으로 넘기는 것은 된다: `style={{ "--_h": "var(--control-h-sm)" }}`.
**강제**(eslint 가 인라인 스타일·직렬화 문자열의 모서리·글자 크기 리터럴을 막는다).

## 6. 클래스 이름

- CSS Modules 라 이름은 해시된다. **camelCase**, BEM(`__`·`--`) 쓰지 않는다. 계층은 nesting·자식 선택자로.
- 이름은 생김새가 아니라 역할로: 루트 `.card` `.panel` · 래퍼 `.row` `.group` · 글 `.title` `.meta` ·
  상태 `.isActive` `.isOpen`.
- JS 로 상태 클래스를 붙일 때는 해시된 이름을 쓴다: `el.classList.toggle(styles.isActive, on)`.

## 7. 접근성

- **`:focus-visible` 링을 없애지 않는다.** `outline: none` 을 쓰면 같은 규칙에 대신할 링을 준다. — **목표**(`outline: none` 69곳 확인)
- 누르는 것 24×24 이상(3.4-3), 글자 확대(3.3-5), 움직임 줄이기(3.7-2), 다크 테마의 기본 컨트롤(3.1-3).
- 화면에 안 보이고 읽어 주기만 할 글은 `.sr-only`.

## 8. 쓰지 않는 것

| | 이유 | 상태 |
|---|---|---|
| Tailwind·유틸리티 클래스 | 두 방식이 섞이면 같은 레이아웃이 두 모양으로 갈린다 | 강제(의존성 없음) |
| 런타임 CSS-in-JS | RSC 와 안 맞고 런타임 비용 | 강제(의존성 없음) |
| 디자인 토큰의 `var()` 대체값 | 없는 토큰을 가린다 | 강제 |
| `-webkit-backdrop-filter` | 빌드(Lightning CSS)가 접두어·표준을 같은 속성으로 보고 **뒤에 적힌 하나만 남긴다.** 흔한 순서(표준 → 접두어)로 쓰면 접두어만 남아 크롬에서 블러가 사라진다. 지원 범위(Safari 18+)는 접두어 없이 되므로 필요도 없다 | 강제 |
| `id` 선택자로 재사용 레이아웃 | 특이도가 튀고 재사용이 안 된다 | 권장 |

## 9. 지금 막고 있는 것(lint)

| 막는 것 | 어디서 |
|---|---|
| `color`·`background-color`·`border-color`·`fill`·`stroke` 의 hex | stylelint |
| 14px 이하 단계 이름의 글자 크기 · 12px 미만 숫자 | stylelint + eslint |
| 사이 단계 모서리 토큰(`md` 등) · `50%` · `9999px` | stylelint + eslint |
| 여백·간격의 px/rem 숫자 | stylelint |
| 디자인 토큰의 `var()` 대체값 | stylelint |
| `-webkit-backdrop-filter` | stylelint |
| 토큰 표와 CSS 의 차이 | `tokenDoc.test.ts` |

"목표" 규칙은 옮기는 동안 개수가 늘지 않게 막는 테스트를 두고(§11), 다 옮긴 뒤 stylelint 규칙으로 바꾼다.

## 10. 파일

```
src/styles/
├── global.css         진입점 — 층 순서 선언 · 아래 파일 import
├── tokens/            Raw — _color _spacing _typography _sizing _radius _shadow _motion _z-index (+ _index)
└── globals/
    ├── _semantic.css  Semantic + Component
    ├── _base.css      리셋 · 요소 기본
    ├── _layout.css    페이지 골격
    ├── _animations.css  @keyframes
    ├── _utilities.css   전역 클래스(.sr-only 등)
    ├── _scroll.css      스무스 스크롤
    ├── _hljs.css _poll.css _tabs.css _sheet.css   에디터·본문 공용 블록(전역 클래스)
    └── _overrides.css   서드파티 덮어쓰기
docs/tokens.md         토큰 값 — 자동 생성(npm run tokens:doc)
```

토큰과 공용 컴포넌트는 `/design-system` 화면에서 직접 볼 수 있다.

---

## 11. 이행 계획

순서대로 한다. 각 단계는 PR 하나, 보이는 게 바뀌는 단계는 전후 스크린샷을 붙인다.

| 단계 | 내용 | 규칙 | 남은 곳 | 보이는 변화 |
|---|---|---|---|---|
| 1 | 이 명세 · 토큰 표 자동 생성 | 2-8 | — | 없음 |
| 2 | 안 쓰는 역할·조합 토큰 지우기 | 2-7 | 67 | 없음 |
| 3 | 이행 감시 테스트 — "목표" 숫자가 늘면 실패 | §9 | — | 없음 |
| 4 | `@layer` 도입 · 전역 테마 transition 제거(View Transitions) | 4-1 · 3.7-3 | 98 | 테마 전환 모습 |
| 5 | Raw 테마 분리 · `color-scheme` · `light-dark()` | 2-3 · 3.1-3 | 80 | 다크의 스크롤바·폼 |
| 6 | 반투명은 `color-mix()` · 색 리터럴 정리 | 3.1-1 · 3.1-2 | 82 + 93 | 거의 없음 |
| 7 | 컨트롤 높이 눈금 · 떠 있는 단추 토큰 · CloseButton 이름 · 24px 타깃 | 3.4-1–3.4-4 | 89 + 14 | 1–4px |
| 8 | 글자: 11px 없애기 · rem 섞은 유동 크기 · 토큰화 · 줄간격 | 3.3-2–3.3-6 | 103 + 161 + 56 + 129 + 21 | 11px 이던 곳 +1px(달력·카운터 등) · 확대 시 크기 |
| 9 | 모션 토큰화 · 움직임 줄이기 | 3.7-1 · 3.7-2 | 451 | 없음 |
| 10 | top layer(`<dialog>`·Popover) | 3.8-1 · 3.8-2 | 52 | 없음(겹침 버그 해소) |
| 11 | z-index · 모서리(역할 토큰으로 이름 바꾸기 · 숫자) · 테두리 · 그림자 정리 | 3.8-3 · 3.5-1 · 3.5-2 | 85 + 1176 + 21 + 46 + 29 | 거의 없음(모서리는 이름만) |
| 12 | 작은 화면 기본 · 범위 문법 미디어 쿼리 | 3.9-1 · 3.9-2 | 210 | 없어야 함(화면별 확인) |
| 13 | 다 옮긴 규칙을 stylelint 로 | §9 | — | 없음 |
