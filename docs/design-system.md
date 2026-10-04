# 디자인 시스템 명세

> 이 문서는 스타일을 **어떻게 써야 하는지**를 정한다. 지금 코드가 다르게 되어 있어도 규칙은 이 문서가 기준이고,
> 지금 코드와의 차이는 규칙마다 "남은 곳"으로만 적는다.
>
> 토큰 **값**은 [토큰 표](./tokens.md)(CSS 에서 자동 생성), 규칙을 이렇게 정한 **이유와 이력**은
> [결정 기록](./design-system-decisions.md), 공용 컴포넌트 **사용법**은 [components.md](./components.md).

## 0. 읽는 법

### 0-1. 규칙의 상태

| 표시 | 뜻 |
|---|---|
| **강제** | lint·테스트가 막는다. 어기면 커밋이나 CI 가 실패한다 |
| **목표(N)** | 지켜야 하는 규칙인데, 아직 지키지 않는 옛 코드가 **N곳** 남아 있다. 새 코드는 처음부터 지킨다 |
| **권장** | 도구로 막지 않는다. 리뷰에서 본다 |

- N 은 감시 테스트(`src/__tests__/styleRatchet.test.ts`)가 세는 수다. 무엇을 세는지는 `scripts/lib/styleRatchet.ts` 에
  항목마다 적혀 있고, 이 문서의 숫자는 2026-10-02 기준선(`scripts/style-ratchet.baseline.json`)의 합계다.
- N 이 늘면 테스트가 실패하고, 어느 파일에서 늘었는지 보여 준다. 파일 사이에 옮기기만 한 것은 통과한다.
- N 이 줄면 테스트가 기준선을 내리라고 실패한다 — `npm run style:ratchet` 으로 기준선을 다시 만들어 잠근다.
  그래야 고친 곳이 다시 늘지 못한다.
- N 이 0 이 되면 lint 로 막고 "강제"로 올린다.
- 규칙 번호는 `절-순번`이다. `3.2-4` 는 §3.2(글자)의 네 번째 규칙.

### 0-2. 용어

| 용어 | 뜻 | 예 |
|---|---|---|
| 토큰 | CSS 사용자 정의 속성(`--x`)으로 둔 디자인 값 | |
| **원시 토큰** | 값 자체에 붙인 이름. 팔레트와 눈금 | `--color-neutral-900` · `--spacing-16` |
| **역할 토큰** | 쓰는 **자리**에 붙인 이름. 원시 토큰을 가리킨다 | `--text-primary` → `--color-neutral-900` |
| **컴포넌트 토큰** | 특정 컴포넌트 묶음(컨트롤 · 카드 · 모달 등)에만 쓰는 역할 토큰 | `--control-height-md` |
| 눈금 | 한 축의 원시 토큰을 크기 순으로 늘어놓은 것 | 간격 눈금 `--spacing-0 … 128` |
| 묶음 토큰 | 늘 함께 바뀌는 값 여러 개를 한 이름에 담은 것 | 글자 역할 = 굵기 + 크기 + 줄간격 + 글꼴 |

업계 문서의 primitive · semantic · component 가 각각 원시 · 역할 · 컴포넌트다.

---

## 1. 기반

**1-1. 스타일은 CSS Modules + 디자인 토큰 하나로 쓴다.** 유틸리티 클래스(Tailwind)와 런타임 CSS-in-JS 는 쓰지 않는다.
두 방식이 섞이면 같은 모양이 두 가지로 쓰여 어느 쪽이 기준인지 사라진다(D1). — **강제**(의존성 없음)

**1-2. 컴포넌트 하나에 `.module.css` 하나, 같은 폴더에 둔다.** — 권장

**1-3. 같은 스타일 묶음이 세 곳 넘게 반복되면 CSS 유틸 클래스가 아니라 React 컴포넌트로 뽑는다.** — 권장

**1-4. 지원 브라우저는 `package.json` 의 browserslist 다.** Chrome · Edge · Firefox · Safari 각 최근 2개 버전 —
2026-10 기준 Chrome·Edge 150+, Firefox 153+, Safari 26.5+.

**1-5. 새 CSS·HTML 기능은 [Baseline](https://web.dev/baseline)(주요 브라우저 모두 지원) 시점으로 고른다.**
browserslist 에는 iOS Safari 가 없고, 실제 방문자에는 업데이트를 미룬 iPhone 이 있다. 그래서 "지원 범위에서 된다"만으로는 쓰지 않는다.

| 기준 | 기능 |
|---|---|
| **그냥 쓴다** — Baseline 이 된 지 1년 넘음 | cascade layer(`@layer`) · nesting · `:has()` · container query · `color-mix()` · `oklch()` · media query 범위 문법 · `<dialog>` · `light-dark()`(2024-05) · Popover API(2025-01) |
| **없어도 괜찮을 때만 쓴다** — 1년 안 됨 | View Transitions(같은 문서, 2025-10) — 없으면 애니메이션 없이 바로 바뀐다 |
| **아직 안 쓴다** | CSS anchor positioning(2026-01) — 없으면 팝업 위치가 깨진다. 2027-01 에 다시 본다 |

"1년"은 이 프로젝트가 정한 선이다. Safari 메이저 버전 하나가 퍼지는 기간을 잡았다.

---

## 2. 토큰 체계

### 2-1. 층은 셋이다

```
원시                          →  역할                              →  컴포넌트
src/styles/tokens/*.css          src/styles/globals/_semantic.css      src/styles/globals/_component.css
팔레트 · 눈금                       글자색 · 배경 · 테두리 · 글자 묶음 · 그림자     컨트롤 높이 · 카드 여백 · 떠 있는 단추
테마와 상관없이 값이 하나             테마·화면 폭에 따라 값이 바뀐다               역할 토큰을 가리킨다
```

- 네 번째 층을 만들지 않는다. 모듈 안 지역 변수(`--_x`)는 층이 아니라 그 파일 안의 계산용이다.
- 역할 토큰은 `_semantic.css`, 컴포넌트 토큰은 `_component.css` 에 둔다.

### 2-2. 컴포넌트 CSS 가 쓰는 토큰은 축마다 정해져 있다

| 축 | 컴포넌트가 쓰는 것 | 쓰지 않는 것 | 상태 |
|---|---|---|---|
| 색 | 역할 `--text-*` · `--bg-*` · `--border-color-*` | 팔레트 `--color-*` | 강제(감시 테스트: 0) |
| 글자 | 역할 묶음 `--font-*`(§3.2) | 크기·줄간격·굵기·글꼴을 따로 고르기 | 목표(§3.2) |
| 간격 | 눈금 `--spacing-*` | 숫자 | 강제 |
| 크기 | 눈금 `--size-*`, 컨트롤은 컴포넌트 토큰 `--control-*` | 숫자 | 목표(§3.4) |
| 모서리 | 역할 `--radius-control` · `-surface` · `-mark`, 원은 `--radius-full` | 그 밖의 눈금 | 목표(§3.5) |
| 테두리 | 묶음 `--border-*`, 또는 두께 눈금 + 색 역할 | 숫자 | 목표(§3.6) |
| 그림자 | 역할 `--shadow-raised` · `-floating` · `-overlay` · `-inset`, 강조 빛 `--shadow-glow` | 값 직접 · 크기 이름 | 완료(§3.7) |
| 투명도 | 역할 `--opacity-disabled` | 비활성에 숫자 | 완료(§3.8) |
| 모션 | `--duration-*` · `--ease-*`(지연 · `linear` 제외) | 숫자 | 완료(§3.9) |
| 쌓임 | `--z-index-*` | 4 이상 숫자 | 목표(§3.10) |

**축마다 다른 이유.**
- 색과 글자는 같은 값이 여러 뜻으로 쓰인다. 같은 회색이 보조 글자색이기도 하고 테두리색이기도 하다. 그래서 이름이
  값이 아니라 뜻을 말해야, 한쪽만 바꿀 수 있다. Material · Primer · Atlassian · Polaris 모두 색은 팔레트와 역할을 나눈다.
- 간격과 크기는 값이 곧 뜻이다. "8px 여백"에 역할 이름을 붙여도 정보가 늘지 않는다. Atlassian(`space.100`) ·
  Polaris(`space-400`) · Carbon(`spacing-05`)도 컴포넌트가 간격 눈금을 바로 쓴다.
- 모서리 · 그림자 · 투명도는 "같은 종류는 같은 값"을 지키려고 역할을 둔다. 눈금에서 고르게 하면 같은 카드가
  6px 과 12px 로 갈린다.

### 2-3. 이름 짓기

**2-3-1. 앞에서부터 넓은 것 → 좁은 것 순서로 붙인다.** 같은 종류가 사전순으로 모인다.

| | |
|---|---|
| ✓ | `--border-color-strong` · `--control-height-md` · `--text-secondary` · `--opacity-disabled` |
| ✗ | `--border-strong-color`(종류가 뒤에) · `--strong-border` |

**2-3-2. 원시 토큰은 값을 이름에 쓴다.**

| 축 | 이름 | 예 |
|---|---|---|
| 길이 눈금(간격·크기·모서리·글자 크기·테두리 두께·블러) | px 값 | `--spacing-16` · `--size-24` · `--radius-8` · `--font-size-14` |
| 색 팔레트 | 색상-단계. 단계 숫자가 클수록 어둡다 | `--color-neutral-900` · `--color-accent-500` |
| 굵기 | CSS 표준 이름 | `--font-weight-regular`(400) · `--font-weight-semibold`(600) |

- 이름이 값이므로 **원시 토큰의 값은 바꾸지 않는다.** 다른 값이 필요하면 역할 토큰이 다른 원시 토큰을 가리키게 한다.
- 단계가 많은 눈금에 크기 이름(`xs … 6xl`)을 쓰면 이름이 모자라 `2xl-plus` 같은 반 단계가 생긴다. 숫자 이름에는 그런 일이 없다.
- 간격 눈금은 Primer(`base-size-16`) · Tailwind(`--spacing-4`) · Atlassian(`space-100`) · Polaris(`space-400`) 모두 숫자다.
  모서리처럼 단계가 적은 눈금은 단어로 짓는 곳도 있다(Atlassian `radius-small`). 여기는 길이 눈금을 모두 숫자로 맞춘다.
- 시간 · 곡선 · 쌓임은 원시와 역할을 나누지 않는 한 층이라 단어로 짓는다(§3.9 · §3.10).

**2-3-3. 역할·컴포넌트 토큰은 단어로 짓고, 값을 쓰지 않는다.** 정도는 `xs · sm · md · lg · xl`(넘으면 `2xl`).
`--font-size-14` 는 원시 이름이다. 역할로 쓰면 14가 아니게 되는 순간 이름이 틀린다.

**2-3-4. 단어는 줄이지 않는다.** `height` · `padding` · `button` · `z-index` · `columns`. 예외는 `bg` 하나다. background 의 업계 공통 표기다
(Primer `bgColor`, Polaris `color-bg`).

**2-3-5. 속성 부분에는 CSS 속성 이름을 쓴다.** `--control-padding-inline-md` · `--card-padding-md` · `--row-gap`.

— 2-3: 원시 눈금 이름과 줄인 단어는 이행 3단계(2026-10-02)에서 바꿨다. 남은 것:
- 모서리를 역할이 아니라 눈금으로 쓴 곳 — 3.5-1
- 글자 크기 눈금을 바로 쓴 곳 — 3.2-1
- 480px 이하 전용 `--m-*` — 3.3-3
- 눈금 밖 값 `--size-38` · `--font-size-11` · `--radius-circle` — 3.4 · 3.2-2 · 3.5-2

**2-3-6. 저장되는 글이 쓰는 토큰 이름을 바꿀 때는 옛 이름을 별칭으로 남긴다.**
- 에디터가 저장하는 글 HTML 은 토큰 이름을 인라인 style 에 담는다(`plateSerializer` — 열 그룹 `gap:var(--spacing-8)`,
  파일 블록 `border-radius:var(--radius-24)` 등). 글은 DB 에 있으므로, 이름만 바꾸면 이미 저장된 글에서 그 값이 사라진다.
- 그래서 바꾼 원시 눈금(간격 · 모서리 · 글자 크기 · 크기 · 블러)의 옛 이름을 `globals/_legacy-aliases.css` 에 새 토큰을 가리키는
  별칭으로 둔다. 코드에서 옛 이름을 쓰면 stylelint · eslint 가 막는다 — **강제**.
- 별칭은 DB 의 글을 새 이름으로 옮긴 뒤 지운다.
- 저장된 글은 색 역할(`--bg-tertiary` · `--border-color-light` · `--text-secondary`)과 글꼴(`--font-space-grotesk` · `--font-family-code`)도 쓴다.
  이행 7단계에서 이 이름을 바꿀 때도 같은 방식을 따른다.
- 이행 6단계에서 지운 옛 팔레트 이름 중 에디터가 글에 쓰던 것(콜아웃 바탕 `--color-info-soft` 등, 캘린더 상태 · 라벨색,
  `--color-accent`, 파일 블록의 `--color-neutral-alpha-5`)도 같은 파일에서 역할로 잇는다.
- 에디터의 글자색 · 형광펜은 예전에 정의되지 않은 이름에 대체값을 붙여 저장했다(`var(--color-red-500, #ef4444)`).
  팔레트에 같은 이름이 생겨 이 글들은 이제 팔레트 색으로 보인다(D24). 새로 고르는 색은 `--editor-text-*` · `--editor-highlight-*` 로 저장된다.

### 2-4. 언제 만들고 언제 지우나

| 종류 | 만드는 때 | 지우는 때 |
|---|---|---|
| 원시 눈금 | 처음에 모든 단계를 고르게 만든다 | 지우지 않는다(쓰는 곳이 0이어도) |
| 역할 토큰 | 두 곳 이상에서 **같은 뜻**으로 쓰이고, **함께 바뀌어야** 할 때 | 쓰는 곳이 없어지면 |
| 컴포넌트 토큰 | 같은 종류 컴포넌트 여럿이 값을 맞춰야 할 때(버튼·입력·셀렉트의 높이) | 쓰는 곳이 없어지면 |
| 묶음 토큰 | 늘 함께 바뀌는 값(글자 묶음 · 테두리 · 그림자 · 전환) — DTCG 2025.10 의 composite 타입 | 위와 같음 |

- 눈금에 없는 값이 필요하면 **사이 단계를 만들지 않고** 디자인을 눈금에 맞춘다. 사이 단계가 하나 생기면 "어느 쪽을 고를지"의
  기준이 흐려진다(11px 과 12px, D15).
- 컴포넌트 하나만 쓰는 값은 토큰이 아니라 그 모듈의 지역 변수(`--_x`)다.
- 역할 없이 값만 묶은 토큰은 만들지 않는다. `--box-xs-md`(= 8px 16px)는 "왜 그 여백인지"를 말하지 않는다(D3).
- 정의만 있고 아무도 부르지 않는 토큰(눈금 단계 제외)은 지운다 — 지금 0. 안 쓰는 눈금 단계 31개는 남긴다.
  투명도 단계 토큰(`--color-*-alpha-*`)은 JS(`themeColors.ts` · `/design-system`)가 이름을 만들어 쓰므로 하나씩 지우지 않고 3.1-3 에서 통째로 없앤다.

### 2-5. 테마

**2-5-1. 팔레트는 테마와 상관없이 값이 하나다. 테마는 역할 토큰이 `light-dark()` 로 정한다.**
```css
/* tokens/_color.css — 원시: 어느 테마에서나 같은 색 */
--color-neutral-50: oklch(97.3% 0.008 91);
--color-neutral-950: oklch(21.8% 0.004 85);

/* globals/_semantic.css — 역할: 테마마다 다른 원시를 가리킨다 */
--bg-primary: light-dark(var(--color-neutral-50), var(--color-neutral-950));
```
- 팔레트를 테마마다 뒤집는 방식(Primer · Radix)도 있다. 하지만 그러면 원시 토큰의 값이 테마마다 달라져 2-3-2(이름 = 값)와
  맞지 않고, 테마 정의가 원시·역할 두 층에 흩어진다. Material · Atlassian · Polaris · Tailwind 처럼 팔레트는 고정하고
  역할에서 테마를 정한다(D20).
- 그림자도 테마마다 진하기가 달라서 역할 토큰이다(§3.7).
- 그림자도 같다. 값 안의 색을 `light-dark()` 로 고르고, 다크에서 모양(퍼짐)까지 다르면 두 벌을 겹친 뒤 테마마다 한 벌을
  `transparent` 로 둔다(`--shadow-inset`).
- 색이 아닌 값(`filter` · `mix-blend-mode` 등)은 `light-dark()` 가 받지 않는다. 이런 값은 `globals/_semantic.css` 의 테마
  블록에서만 `:root[data-theme="dark"]` 로 다시 정한다. 한 곳만 쓰는 값이어도 여기 둔다 — 테마 선택자를 한 파일에 모으는
  쪽이 2-4(한 곳만 쓰는 값은 토큰으로 만들지 않는다)보다 앞선다. 예: `--filter-mono-logo`.
- 다크 테마에서 값을 다시 정의하는 원시 토큰 — **강제**(감시 테스트: 색 0 · 그림자 0)
- 사이트 설정의 테마 색(관리자 화면)도 팔레트가 아니라 역할을 덮어쓴다(`themeColors.ts` — 강조 면 셋, 무채색 역할,
  `--text-contrast`). 반투명 역할은 `color-mix()` 로 이 역할에서 만들어지므로 따라온다.

**2-5-2. 루트의 `color-scheme` 을 테마와 같이 바꾼다.**
```css
:root { color-scheme: light; }
:root[data-theme="dark"] { color-scheme: dark; }
```
`light-dark()` 는 이 값을 보고 고른다. 스크롤바·기본 폼 컨트롤·자동완성 배경도 이 값을 따른다.
테마를 고르는 건 `ThemeProvider` 가 `data-theme` 로 한다(OS 설정이 기본, 사용자가 바꿀 수 있음).
이 선언과 2-5-1 의 색이 아닌 값은 `globals/_semantic.css` 맨 위 테마 블록에 있다. 토큰 파일 밖에는 `[data-theme]` 선택자가 없다(2-5-4).

**2-5-3. 테마와 상관없이 늘 어두운 영역(이미지 위 캡션 띠 등)은 그 영역에 `color-scheme: dark` 를 준다.**
역할 토큰의 `light-dark()` 는 토큰을 **쓰는 요소**의 `color-scheme` 으로 풀리므로, 그 안의 글자·테두리 역할이 다크 값이 된다
(2026-10-02 Chromium 에서 확인). 그 영역 전용 색 토큰을 따로 만들지 않는다. — 권장

**2-5-4. 컴포넌트 CSS 는 테마로 갈라 쓰지 않는다.** `[data-theme]` 선택자와 `prefers-color-scheme` 미디어 쿼리를 쓰지 않는다.
테마마다 다른 값은 역할 토큰으로 만든다. `prefers-color-scheme` 은 사용자가 고른 테마가 아니라 OS 설정을 보므로,
사이트를 라이트로 바꾼 사용자에게 다크 스타일이 섞인다. — **강제**(감시 테스트: `[data-theme]` 모듈 0 · 전역 CSS 0 · `prefers-color-scheme` 모듈 0)
- 여러 곳이 같은 뜻으로 쓰면 역할 토큰(`--bg-highlight`), 한 컴포넌트 묶음이 쓰면 컴포넌트 토큰(`--code-syntax-*`),
  한 곳만 쓰면 그 자리에서 `light-dark()` 를 쓴다(2-4).
  ```css
  border-color: light-dark(transparent, var(--border-color-light)); /* 다크에서만 윤곽선 */
  ```
- 모양이 다른 장식(라이트의 꽃잎 · 다크의 별)은 둘 다 그리고 테마에 맞지 않는 쪽의 색을 `transparent` 로 둔다.
  여러 겹 배경도 같은 방법으로 겹 수를 맞춘다.

### 2-6. 원본은 CSS 다

토큰 값은 CSS 에만 쓴다. [토큰 표](./tokens.md)는 `npm run tokens:doc` 이 CSS 에서 만들고, 둘이 다르면
`tokenDoc.test.ts` 가 실패한다. — **강제**

### 2-7. 토큰에 `var()` 대체값을 쓰지 않는다

`var(--spacing-16, 16px)` 처럼 쓰면 토큰 이름을 잘못 적어도 대체값이 가려서 조용히 넘어간다. — **강제**(stylelint)

---

## 3. 축별 규칙

### 3.1 색

| 층 | 토큰 |
|---|---|
| 원시 | 무채색 `--color-neutral-50 … 950` · `--color-white` · `--color-black`, 브랜드 `--color-accent-50 … 950`, 색상별 `red` · `orange` · `amber` · `yellow` · `green` · `blue` · `indigo` · `violet` 의 `50 … 950` |
| 역할 | 글자 `--text-*` · 배경 `--bg-*` · 테두리 `--border-color-*` · 상태(`--text-error` · `--bg-success-soft` 등) · 포커스 `--focus-ring-color` |
| 컴포넌트 | 캘린더 라벨 `--calendar-label-*` · 에디터 글자색 `--editor-*` · 코드 하이라이트 `--code-syntax-*` · 그림 색(아래 3.1-2) |

- **3.1-1. 팔레트는 색상마다 같은 단계 수로 만든다.** 색상마다 50 … 950 의 11단계이고, 역할이 그 단계를 가리킨다.
  - 브랜드 · 상태색의 이행 전 값(라이트 · 다크)이 그대로 단계가 되고, 그 사이만 명도 사다리로 채웠다(D24).
    예: 라이트 강조 `accent-700`, 다크 강조 `accent-500`.
  - 단계를 새로 쓸 일이 생기면 사다리 간격(50 ≈ L 97.5 … 950 ≈ L 29)을 따라 만든다. — **강제**(팔레트 파일 하나)
- **3.1-2. 컴포넌트 CSS 는 역할 색만 쓴다.** 팔레트(`--color-*`)와 색 값(hex · `rgb()` · `oklch()` 등)을 쓰지 않는다.
  - 테마마다 다른 값은 역할이 정한다. 한 곳만 다르게 써야 하면 그 자리에서 역할끼리 `light-dark()` 로 고른다(2-5-4).
  - 그림(일러스트 · 장식)의 색과 컬러 피커가 그리는 색 공간은 UI 색이 아니라 그림의 일부다. 팔레트에 맞추지 않고 값을 그대로 두되,
    컴포넌트 토큰으로 `globals/_component.css` 에 모은다(예: `--works-dome-*`, `--code-window-dot-*`, `--picker-hue-stops-*`).
  - 마스크(`mask-image`)의 색은 알파만 쓰므로 세지 않는다.
  - — 팔레트 · hex · 지역 변수 색은 **강제**(감시 테스트: 0). 색 함수는 **목표**(71 — 전부 그림자 값 안의 색이다. 그림자를
    토큰으로 옮기는 이행 9단계에서 함께 없어진다). 지금 lint 는 `color` 등 다섯 속성의 hex 만 막는다.
- **3.1-3. 반투명은 `color-mix()` 로 만든다.** 투명도 **단계** 토큰을 두지 않는다.
  ```css
  background: color-mix(in oklch, var(--bg-accent) 20%, transparent);
  ```
  - 예전 토큰(`--color-accent-alpha-20` 등)은 "그 색 × N%" 라서 `color-mix()` 와 결과가 같았고, 색마다 13단계씩 늘었다.
    Tailwind v4 도 투명도를 `color-mix()` 로 만든다.
  - 여러 곳이 같은 뜻으로 쓰는 반투명(모달 뒤 막, 선택된 행 배경)은 역할 토큰으로 두고, 값만 `color-mix()` 로 정의한다.
  - 섞는 바탕은 역할이다 — 강조는 `--bg-accent-solid`, 무채색 틴트는 `--text-contrast`(배경과 대비가 가장 큰 글자색),
    흰 · 검정 막은 `--bg-white` · `--bg-black`.
  - — **강제**(감시 테스트: 투명도 단계 토큰 0)
- **3.1-4. 글자와 배경의 대비는 WCAG 2.2 를 지킨다.**
  - 글자 4.5:1. 큰 글자(24px 이상, 또는 굵게 18.66px 이상)는 3:1(1.4.3).
  - 컨트롤의 경계와 포커스 표시는 3:1(1.4.11).
  - 역할 토큰 쌍(글자색 × 배경색)을 **두 테마 모두**에서 잰다. [토큰 표](./tokens.md)의 "대비" 표를 `npm run tokens:doc` 이 만든다
    (Atlassian 도 역할 쌍의 대비를 생성해 검사한다).
  - — **목표**(미달 3: 라이트의 성공 배지 글 4.38 · 정보 배지 글 4.06 · 경고 점 2.35. 값을 바꾸면 보이는 변화라 미리보기로 정한다)
- **3.1-5. 색만으로 뜻을 전하지 않는다.** 오류·성공 같은 상태는 아이콘이나 글자도 함께 쓴다(WCAG 1.4.1). — 권장

### 3.2 글자

글자 토큰은 세 층이고, **층마다 이름 규칙이 하나**다(D31). 컴포넌트는 3층 묶음만 쓴다.

| 층 | 이름 규칙 | 예 | 누가 쓰나 |
|---|---|---|---|
| 1층 원재료 | `--{속성}-{값}` | `--font-size-13` · `--line-height-160` · `--font-instrument` | 토큰끼리만 |
| 2층 역할 | `--font-{속성}-{역할}-{단계}` | `--font-size-body-sm` · `--font-family-code` | 3층 묶음 · 사이트 설정 |
| 3층 묶음 | `--font-{역할}-{단계}` | `--font-body-sm` · `--font-code-xs` | 컴포넌트 |

역할은 **display · heading · body · code · meta · prose**, 단계는 **xs · sm · md · lg · xl** 이다.
"코드 글꼴로 작게" → `--font-code-sm` 처럼 이름만 보고 고른다.

**1층 · 원재료** (`tokens/_typography.css`)

| 종류 | 토큰 |
|---|---|
| 글꼴 | `--font-instrument` · `--font-playfair` · `--font-space-grotesk` · `--font-jetbrains-mono`(한글 폴백 포함). Pretendard 스택은 2층 `--font-family-body` 에 바로 있다 |
| 크기 | `--font-size-12 · 13 · 14 · 16 · 18 · 20 · 22 · 24 · 28 · 32 · 34 · 40 · 48 · 64` |
| 줄간격 | `--line-height-090 · 100 · 125 · 135 · 160 · 180` — 이름이 값이다(1.25 → 125) |
| 굵기 | `--font-weight-light · regular · medium · semibold · bold · black`(300 · 400 · 500 · 600 · 700 · 900) |

**2층 · 역할** (`globals/_semantic.css`)

| 토큰 | 값 | 쓰는 자리 |
|---|---|---|
| `--font-family-body` | Pretendard | 본문 · UI 전체(라벨 · 버튼 · 메뉴 · 입력 · 설명, 글 · 작업물 본문) |
| `--font-family-heading` | Instrument Serif + 나눔명조 | 제목 · 장식 글자(히어로 · 공개 글 · 시리즈 · 작업물 제목) |
| `--font-family-code` | JetBrains Mono | 숫자 · 메타 · 배지 · 코드 |
| `--font-family-nav` | Space Grotesk | 상단 네비게이션 · 메뉴 · 알림 팝업(D29) |
| `--font-family-accent` | Playfair Display | 일부 히어로 · 상세 제목. 제목 글꼴 설정과 상관없이 고정 |
| `--font-size-body-xs · sm · md · lg · xl` | 12 · 13 · 14 · 16 · 18 | UI · 본문. **12 가 가장 작은 글자**다 |
| `--font-size-heading-xs · sm · md · lg · xl` | 18 · 20 · 22 · 28 · 34 | 제목 |
| `--font-size-display-sm · md · lg · xl` | 화면 비례(3.2-4) — 폰 24 · 32 · 44 · 67 → 데스크톱 28 · 59 · 96 · 141 | 히어로 · 대표 숫자 · 페이지 제목 |
| `--font-size-prose-xs · sm · md · lg` | 화면 비례 12 ~ 24 | About 같은 지면 본문 |

- **본문 · UI 는 Pretendard 하나**다. 한글이 주 언어라 한글과 영문이 한 글꼴이어야 높이 · 굵기가 맞는다.
- **제목은 세리프다 — 영문 Instrument Serif, 한글 나눔명조, 보통 굵기**(D27). 관리 화면은 페이지 · 모달 제목만 같고, 구획(섹션) 이름은 UI 라벨이라 Pretendard 다(D27 범위 조정, 2026-10-03).
  Instrument Serif 는 400 하나뿐이라 굵게 쓰지 않는다.
  - 예외 — 글 · 작업물 **본문 안의** 제목(h1~h4)은 본문 글꼴을 굵게 쓴다. 표 열 이름 · 목록 항목 · 라벨 크기(14px 이하)의 "제목"은 UI 글자다.
- 사이트 설정의 본문 · 제목 · 코드 글꼴이 `--font-family-body` · `-heading` · `-code` 를 덮는다. 3층 묶음은 그대로 따라간다.
- 저장된 글 HTML 이 쓰는 옛 이름(`--font-mono` · `--font-size-xs` 등)은 `_legacy-aliases.css` 에 이어 둔다(2-3-6).

**3층 · 묶음** — 굵기 · 크기 / 줄간격 · 글꼴을 `font` 단축 속성 값 하나로 묶는다.
Atlassian(`--ds-font-body: normal 400 0.875rem/1.25rem …`) · Primer(`--text-body-shorthand-medium`) · Material 3(type scale) ·
Carbon(type token)이 모두 이렇게 한다.

| 묶음 | 굵기 · 크기 / 줄간격 · 글꼴 | 쓰는 자리 |
|---|---|---|
| `--font-display-xl · lg · md · sm` | 400 · 화면 비례 / 1.0 · accent | 히어로 · 대표 숫자 · 페이지 제목(Typography h1 ~ h3). 글꼴은 제목 설정과 상관없이 Playfair(D34) |
| `--font-heading-xl` | 400 · 34 / 1.25 · heading | 페이지 제목 · 글 h1 |
| `--font-heading-lg` | 400 · 28 / 1.25 · heading | 섹션 제목 · 글 h2 |
| `--font-heading-md` | 400 · 22 / 1.25 · heading | 패널 · 모달 제목 · 글 h3 |
| `--font-heading-sm` | 400 · 20 / 1.25 · heading | 하위 제목 |
| `--font-heading-xs` | 400 · 18 / 1.25 · heading | 카드 · 목록 제목 · 글 h4 |
| `--font-body-xl` | 400 · 18 / 1.6 · body | 리드 문단 · 인용 |
| `--font-body-lg` | 400 · 16 / 1.6 · body | 긴 글 본문 |
| `--font-body-md` | 400 · 14 / 1.6 · body | UI 본문 · 입력값 · 목록 |
| `--font-body-sm` | 400 · 13 / 1.6 · body | 필드 라벨 · 버튼 |
| `--font-body-xs` | 400 · 12 / 1.6 · body | 보조 설명 · 메타 · 배지 · 카운터 |
| `--font-code-lg · md · sm · xs` | 400 · 16 · 14 · 13 · 12 / 1.6 · code | 코드 · 숫자 · 버전 · 시간 |
| `--font-meta-md · sm · xs` | 300 · 14 · 13 · 12 / 1.6 · code | About · Profile 의 라벨 · 분류 · 날짜 · 수치(얇은 코드 글꼴) |
| `--font-prose-lg · md · sm · xs` | 300 · 화면 비례 12 ~ 24 / 1.6 · code | About · Profile 패널의 화면 비례 글자 — 크기만 유동인 메타(D34) |

- 안 쓰는 토큰은 두지 않는다(2-4). 표의 묶음은 컴포넌트가 처음 쓸 때 같은 이름 · 같은 모양으로 `_semantic.css` 에 더한다.
  지금은 전체 세트가 다 정의돼 있다 — `--font-display-sm ~ xl` · `--font-heading-xs ~ xl` · `--font-body-xs ~ xl` · `--font-code-xs ~ xl` · `--font-meta-xs ~ md` · `--font-prose-xs ~ lg`.
- 네비게이션은 `--font-body-*` 뒤에 `font-family: var(--font-family-nav)` 를 덧쓴다(한 파일뿐이라 묶음을 따로 두지 않는다).
- 제목 단계는 Apple(Large Title 34 · Title 1 28 · Title 2 22 · Title 3 20)을 따른다. 가장 작은 제목은 본문 16 과 구분되게 18 이다
  (Apple Headline 17 은 본문 17 기준이다). 예전 24 는 22, 32 는 34, 제목으로 쓰던 16 은 18 로 옮겼다.
- 제목은 보통 굵기 · 줄간격 1.25, 본문 · UI · 코드 · 메타는 줄간격 1.6(D25 · D27). 메타만 Light(300)이다(D32).
- 로고 글자는 글자 역할이 아니다. `Logo` 컴포넌트가 정한다.

**규칙**

- **3.2-1. 컴포넌트는 글자를 역할 묶음으로 쓴다.**
  ```css
  .title { font: var(--font-heading-sm); }
  .title { font: var(--font-heading-sm); font-weight: var(--font-weight-semibold); } /* 한 값만 바꿀 때는 뒤에 덧쓴다 */
  ```
  - 크기·줄간격·굵기·글꼴을 따로 고르지 않는다. 따로 고르면 같은 "카드 제목"이 자리마다 다른 조합이 된다.
    지금 `h1` 은 세 크기다 — 전역 24 · 글 본문 32 · `Typography` 64.
  - `font` 단축 속성은 `font-variant-*` · `font-feature-settings` · `font-kerning` 을 초기값으로 되돌린다.
    `tabular-nums` 같은 설정은 `font` 보다 **뒤에** 적는다.
  - 크기만 바꾸는 변형(미디어 쿼리 안 · `:hover` · `.btn` 에 덧붙는 `.size-sm` 같은 클래스)은 묶음을 다시 쓰지 않고 `font-size` 한 값만 덧쓴다.
    묶음을 다시 쓰면 기본 규칙이 덧쓴 굵기 · 줄간격이 지워진다.
  - — **목표**(컴포넌트 CSS 의 선언: `font-size` 458 · `line-height` 494 · `font-weight` 824 · `font-family` 305. 이행 전 2229 · 546 · 900 · 1339.
    남은 선언은 대부분 묶음 뒤에 한 값만 덧쓴 것이다. 글자 크기 눈금 `--font-size-16` 등을 바로 쓴 곳 35 — 로고 2곳 · 변형 규칙의 역할 크기 토큰 · `!important` 1곳).
    지금 lint 는 14px 이하 눈금 이름과 12px 미만 숫자만 막는다.
- **3.2-2. 가장 작은 글자는 12px 이다.**
  - 숫자로 쓰는 12px 미만 — **강제**(stylelint)
  - 11px 토큰 `--font-size-micro` — 없앴다(이행 7-1, 쓰던 곳은 12px)
  - 11px 을 두는 시스템도 있다(Material 3 label-small · Polaris body-xs). 이 프로젝트는 Atlassian · Primer 처럼 12px 을 하한으로 둔다.
    조밀한 자리는 글자를 줄이지 않고 여백 · 줄 수 · 말줄임으로 푼다(D15).
- **3.2-3. 글자 크기를 px · rem 숫자로 쓰지 않는다.** — **완료**(남은 4곳은 글자가 아니라 도형 — 스위치 ON/OFF 7 · 9 · TOC 장식 숫자 150 · About 배지 별 30)
- **3.2-4. 화면 폭에 비례하는 글자는 브라우저 확대에도 커져야 한다**(WCAG 1.4.4 — 200% 까지).
  - `clamp()` 의 가운데 값에 rem 을 섞는다. 화면 단위(`vw` · `vh`)만 있으면 확대해도 글자가 안 커진다.
  - 최댓값을 최솟값의 **2.5배 이하**로 둔다. 그러면 어느 브라우저에서도 200% 확대가 보장된다(Maxwell Barvian, Smashing 2023).
    넘으면 실제로 확대해 확인한다.
  ```css
  /* ✗ 가운데가 화면 단위뿐 · 최대가 최소의 5배 */
  font-size: clamp(2rem, min(9vw, 18vh), 10rem);
  /* ✓ */
  font-size: clamp(2rem, 1.25rem + 3vw, 5rem);
  ```
  — **목표**(가운데가 화면 단위뿐인 것: 토큰 정의 7 · 직접 쓴 곳 153)
- **3.2-5. 루트 글자 크기를 px 로 정하지 않는다.** 지금 `html { font-size: 16px }` 이 브라우저의 "기본 글자 크기" 설정을 무시한다.
  지우면 기본값이 16px 이라 보이는 건 같고, 글자를 크게 설정한 사용자에게는 rem 값이 함께 커진다. — **완료**(이행 7-1)
- **3.2-6. 줄간격은 단위 없는 숫자로.** px 로 쓰면 글자 크기를 바꿔도 줄간격이 따라오지 않는다. — **완료**(남은 2곳은 높이를 정수로 맞추려는 관리자 셀 · 20px 원형 뱃지 — 8단계에서 높이 토큰으로)
- **3.2-7. 줄간격 눈금에서 `relaxed`(1.65)를 없앤다.** `normal`(1.6)과 0.05 차이라 고르는 기준이 없다. — **완료**(이행 7-1)
- **3.2-8. 자간은 `em` 으로.** 글자 크기를 따라가야 한다. 역할 묶음이 자간을 정하면 컴포넌트는 따로 쓰지 않는다. — 권장
- **3.2-9. 표 · 카운터 · 시간처럼 자릿수가 바뀌는 숫자에는 `font-variant-numeric: tabular-nums`.** 숫자가 바뀔 때 폭이 흔들리지 않는다. — 권장

### 3.3 간격

- 눈금: `--spacing-0 · 1 · 2 · 4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48 · 64 · 80 · 96 · 112 · 128`(px). 4px 단위이고, 1 · 2 는 가는 선 보정용이다.
- **3.3-1. 여백 · 간격(`padding` · `margin` · `gap`)의 px · rem 숫자는 눈금 토큰으로 쓴다.** 두 값이 필요하면 토큰 두 개를 나란히 적는다.
  — **강제**(stylelint). `em` · `%` · `vw` · `vh` · `calc()` · 음수는 막지 않는다. 글자나 화면에 비례하라고 쓴 값이다.
- **3.3-2. 같은 종류 컴포넌트가 반복되는 여백은 컴포넌트 토큰으로 쓴다** — `--card-padding-*` · `--row-padding-*` ·
  `--modal-padding-*` · `--badge-padding-*` · `--cell-padding-*` · `--textarea-padding`. 컨트롤(버튼 · 입력)은 3.4-2.
- **3.3-3. 페이지 리듬은 역할 토큰으로** — 페이지 좌우 여백 `--spacing-page-inline`, 긴 글 리듬 `--spacing-section` ·
  `-block` · `-divide` · `-line`. 이 값들은 화면 폭에 따라 미디어 쿼리 안에서 값이 바뀐다. 컴포넌트는 같은 이름만 쓴다.
  — **목표**: 480px 이하에서만 정의되는 `--m-sm/md/lg` 를 이 역할들로 옮긴다(컴포넌트에서 17).

### 3.4 크기

- 눈금: `--size-4 · 8 · 12 · 16 · 20 · 24 · 28 · 32 · 36 · 40 · 48 · 56 · 64 · 72 · 80 · 96 · 112 · 128`(px).
  40 까지는 4px, 80 까지는 8px, 그 위는 16px 간격. 아이콘 · 아바타 · 썸네일 같은 사각형에 쓴다.
  — **완료**(이행 8-1): 눈금 밖 값 `--size-38`(옛 컨트롤 높이)을 40 으로 옮기고 지웠다.

**컨트롤** — 버튼 · 입력 · 셀렉트 · 칩 · 탭처럼 한 줄에 나란히 놓이고 누르는 것.

| | xs | sm | md | lg | xl |
|---|---|---|---|---|---|
| `--control-height-*` | 24 | 28 | **32** | 36 | 40 |
| `--control-padding-inline-*` | 16 | 16 | 20 | 20 | 24 |
| 글자 | `--font-label` | `--font-body` | `--font-body` | `--font-body` | `--font-body` |

Primer(24 · 28 · 32 · 40 · 48)처럼 24 에서 시작한다 — 가장 작은 단계가 누르는 크기 하한(3.4-4)과 같다. 단계 사이는 4px 이다.
좌우 여백 · 글자 배정은 지금 Button 의 값에서 가져왔다.

- **3.4-1. 컨트롤 높이는 `--control-height-*` 로만 정한다.** 숫자도, `--size-*` 도 쓰지 않는다.
  — **완료**(이행 8-1, D36): 눈금을 24 … 40 으로 맞췄다 — `xl` 38 → 40, `2xl` 46 은 떠 있는 단추 48 로, `2xs` 20 은 누르는 것이면 xs 24 · 뱃지면 `--badge-height`. 컨트롤 선택자에 높이를 숫자로 쓴 곳은 8-2 에서 센다.
- **3.4-2. 컨트롤 높이를 세로 여백으로 만들지 않는다.** 높이 + 좌우 여백 + `align-items: center` 로 만든다.
  세로 여백과 글자 크기로 높이를 만들면 같은 `md` 가 글꼴에 따라 26px 도 32px 도 된다.
  — **완료**(이행 8-2, D37): 세로 여백을 담은 컨트롤 여백 토큰 `--button-padding-*` · `--input-padding` · `--field-padding-*` 를 쓰던 57곳을 높이 + `--control-padding-inline-*` 로 바꾸고 토큰을 지웠다.
- **3.4-3. 공용 컴포넌트의 `size` prop 이름은 위 표의 단계 이름을 그대로 따른다.** `size="sm"` 이면 어느 컴포넌트든 28.
  — **완료**(이행 8-1): CloseButton 을 표대로 맞췄다(xs 24 · sm 28 · md 32 · lg 36).
- **3.4-4. 누르는 영역은 24×24 이상.** WCAG 2.2 의 2.5.8(AA).
  - 생김새가 더 작아야 하면 `::before` 로 누르는 영역만 넓힌다.
  - 이웃과 충분히 떨어져 있으면(24px 원이 겹치지 않으면) 작아도 된다 — WCAG 의 간격 예외.
  - 손가락 입력(`@media (pointer: coarse)`)에서는 44 이상으로 넓힌다 — 권장. Apple 44pt · Material 48dp · Primer `minTarget.coarse` 44.
  - 누르지 않는 작은 것(뱃지 20px 등)은 컨트롤이 아니다. 높이는 그 컴포넌트 토큰(`--badge-height`)으로 둔다.
  - — **완료**(이행 8-1): 20px 컨트롤 높이 `--control-height-2xs` 와 Button · HelpButton 의 `size="2xs"` 를 없앴다. 누르는 것은 xs 24, 뱃지 · 트랙은 `--badge-height` · `--size-20`.

**떠 있는 단추** — 이미지 뷰어 · 배너 넘김처럼 화면 위에 떠 있는 원형 단추. 한 줄에 나란히 놓이지 않으므로
컨트롤 높이 대신 컴포넌트 토큰 `--float-button-size-sm`(40) · `-md`(48)을 쓴다. — **완료**(이행 8-1): 46 이던 것을 `-md` 48 로. `-sm` 은 쓰는 곳이 생길 때 더한다(2-4).

**레이아웃 치수** — 페이지 최대 폭 · 본문 줄 길이 같은 값은 자리마다 하나씩 정하는 값이라, 여러 단계 중에 고르는 눈금이 필요 없다. 역할 토큰으로 둔다
(`--width-page-max` · `--width-prose` · `--header-height` · `--side-nav-width`).
- 페이지 콘텐츠 최대 폭은 `--width-page-max`, 골격 치수는 `--header-height` 등으로 `_component.css` 에 있다.
  한 자리만 쓰는 폭(골격 2400px · 홈 인트로 720px)은 그 파일 안의 값이다(2-4).

### 3.5 모서리

| 층 | 토큰 |
|---|---|
| 원시 | `--radius-2 · 4 · 6 · 8 · 12 · 16 · 24` · `--radius-full`(9999px). `--radius-circle`(50%)은 없앴다(3.5-2, 이행 9-1) |
| 역할(`globals/_semantic.css`) | `--radius-control` = full — 버튼 · 칩 · 뱃지 · 입력 · 선택 배경 하이라이트 |
| | `--radius-surface` = 24 — 카드 · 패널 · 모달 · 팝오버처럼 면이 있는 것 |
| | `--radius-mark` = 4 — 각진 것이 뜻인 자리: 체크박스 · 다중선택 마커 · 컬러피커 사각형 |

- **3.5-1. 컴포넌트는 역할 토큰을 쓴다. 원(아바타 · 원형 아이콘 단추 · 점)만 `--radius-full` 을 바로 쓴다.** 원은 모양이지 역할이 아니다.
  - 같은 성격의 카드가 6px 과 12px 로 갈리는 걸 막는 건 "고를 수 있는 역할이 셋뿐"이라는 점이다.
  - — **완료**(이행 9-1, D38): 눈금 1,182곳 · 숫자 27곳을 역할로. `circle` 301 → `full`, `24` 263 → `surface`, `full` 중 알약 430 → `control`(원 · 가는 막대 96 은 `full` 유지), 작은 눈금 2 · 4 · 6 → `mark`, 8 · 12 · 16 → `surface`.
    유기적 모양(`62% 38% …` 블롭 3곳)은 그래픽이라 그대로다. 감시는 `--radius-full` 을 빼고 눈금 · `circle` 만 센다.
- **3.5-2. 원 · 알약 모양은 `50%` 가 아니라 `--radius-full`(9999px) 하나로.**
  - 정사각형에서는 둘 다 원이다.
  - 직사각형에서는 `50%` 가 타원, 9999px 이 알약이 된다. 의도한 건 거의 항상 알약이다.
  - Material 3(`corner-full`) · Atlassian(`radius-full`) 모두 9999px 하나다.
  - `50%` · `9999px` 숫자 — **강제**(stylelint). 눈금 `--radius-2 ~ 24` · `-circle` 직접 사용도 **강제**(이행 9-1)
- **3.5-3. 안쪽 요소의 모서리는 바깥 모서리 − 사이 여백(동심원)으로 계산한다.** 같은 값을 겹쳐 쓰면 안쪽이 더 둥글어 보인다.
  ```css
  .inner { border-radius: max(0px, calc(var(--radius-surface) - var(--spacing-8))); }
  ```
  계산식으로 쓰면 바깥 역할의 값이 바뀌어도 따라간다. — 권장

### 3.6 테두리

- 두께 눈금 `--border-width-1 · 2 · 3 · 4`. 색은 역할 `--border-color-*`. 자주 쓰는 조합은 묶음 역할 `--border-default` · `--border-strong` 등.
- **3.6-1. 테두리는 묶음 역할로 쓰거나, 두께 눈금과 색 역할을 함께 쓴다.** 두께를 숫자로 쓰지 않는다.
  — **완료**(D39). 남은 숫자 3곳은 삼각형 꼼수(투명 테두리로 그린 화살표) — 선이 아니라 도형이라 예외.
- **3.6-4. 테두리를 `box-shadow` 로 흉내 내지 않는다.** 선이면 `border`(`box-sizing: border-box` 라 크기가 안 변한다), 상태(hover · focus · 선택)에 따라 생기는 링이면 `outline` + `outline-offset`(안쪽은 음수). 틈을 둔 두 겹 링은 `outline-offset` 이 틈이다.
  — **완료**(D39). 남은 것은 자동 완성 배경을 지우는 `-webkit-box-shadow: 0 0 0 1000px … inset` 1곳(브라우저 꼼수)뿐.
- **3.6-2. 두께에 1px 미만이나 소수(1.5px)를 쓰지 않는다.** 화면 배율에 따라 흐리거나 두께가 들쭉날쭉하다.
  — 지금 0(1.5px 토큰은 이행 3단계에서 지웠다).
- **3.6-3. 입력칸처럼 테두리가 유일한 경계인 컨트롤은 테두리색 대비 3:1**(3.1-4). — **목표**

### 3.7 그림자 · 블러

- **3.7-1. 그림자는 높이 역할로 쓴다.**

  | 역할 | 자리 |
  |---|---|
  | `--shadow-raised` | 페이지 위에 살짝 뜬 것 — 카드 hover · 떠 있는 단추 |
  | `--shadow-floating` | 내용 위에 뜬 것 — 메뉴 · 팝오버 · 툴팁 · 드롭다운 |
  | `--shadow-overlay` | 화면을 덮는 것 — 모달 · 드로어 |
  | `--shadow-inset` | 안으로 들어간 것 |

  - Atlassian(`elevation.shadow.raised/overlay`) · Material 3(elevation level)과 같은 방식이다.
  - 값 안의 색은 `light-dark()` 로 테마마다 진하기를 바꾼다(다크에서 더 진해야 보인다).
  - 강조색 번짐(선택 · 현재 · 활성 표시)은 높이가 아니라 **`--shadow-glow`** 하나다. 한쪽 선을 `inset` 그림자로 그리지 않는다(3.6-4).
  - — **완료**(D40). 크기 이름 `--shadow-xs … 2xl` · `-inner` 는 지웠다. 남은 직접 값 2곳은 예외 — 플레이그라운드 시작 코드(iframe 안에서 돌아 사이트 토큰이 닿지 않는 사용자 내용).
- 글자 그림자는 `--text-shadow-subtle` · `--text-shadow-strong`(이미지 위 글자), 양각(글자 위쪽에 받는 빛)은 `--text-shadow-highlight`. — **완료**(D40).
- 블러 눈금은 `--blur-2 · 4 · 8 · 12 · 16 · 24 · 40 · 60`, 유리 효과는 역할 `--blur-glass`.
  `backdrop-filter` 에 `-webkit-` 접두어를 붙이지 않는다(§7).

### 3.8 투명도

- **3.8-1. 비활성 상태의 투명도는 `--opacity-disabled`(0.5) 하나로.** "함께 바뀌어야 하는 같은 뜻"이라 역할 토큰이다(2-4).
  — **완료**(D41). 남은 숫자 2곳은 비활성이어도 흐리게 하지 않는 자리(만드는 중인 단추 `opacity: 1`)와 숨기는 자리(꺼진 커서의 장식 `0`).
- 그 밖의 `opacity` 는 장식이라 토큰을 두지 않는다.

### 3.9 모션

**토큰.** 시간과 곡선은 원시와 역할을 나누지 않고 한 층으로 둔다. 움직임 줄이기(3.9-3)가 시간 토큰의 값을 바꾸는데,
값이 이름인 원시 토큰(`--duration-300`)을 0 으로 바꾸면 이름이 거짓이 되기 때문이다.

| 시간 | 값 | 자리 |
|---|---|---|
| `--duration-instant` | 100ms | 누름 · 토글 피드백 |
| `--duration-fast` | 150ms | 호버 · 색 변화 |
| `--duration-base` | 300ms | 펼침 · 작은 요소 등장 |
| `--duration-slow` | 500ms | 패널 · 큰 요소 이동 |
| `--duration-slower` | 800ms | 페이지 전환 |

| 곡선 | 값 | 자리 |
|---|---|---|
| `--ease-standard` | `cubic-bezier(.4, 0, .2, 1)` | 자리 안에서 바뀌는 것 |
| `--ease-enter` | `cubic-bezier(.16, 1, .3, 1)` | 들어오는 것 — 빠르게 시작해 감속 |
| `--ease-exit` | `cubic-bezier(.4, 0, 1, 1)` | 나가는 것 — 가속하며 사라짐 |
| `--ease-spring` | `cubic-bezier(.34, 1.56, .64, 1)` | 탄성 |

곡선은 출처(material · expo)가 아니라 쓰는 자리로 이름 짓는다. Primer(`enter` · `exit` · `move`) · Material 3(standard · emphasized)도 그렇다.

- **3.9-1. 시간 · 곡선은 토큰으로 쓴다.** `transition` · `animation` 에 `0.3s` · `ease` 같은 값을 직접 쓰지 않는다. — **완료**(D43)
  - 지속 시간은 다섯 토큰으로(0.1 이하 instant · 0.22 이하 fast · 0.4 이하 base · 0.7 이하 slow · 1s 이하 slower). 곡선은 `ease` · `ease-in-out` → standard, `ease-out` → enter, `ease-in` → exit, 탄성 베지어 → spring.
  - **지연(delay)은 토큰이 아니다** — 시차 연출의 수치라 그 자리에서 정한다(Primer · Material 도 지연 토큰이 없다). `linear` · `steps()` 는 곡선이 아니라 그대로.
  - **반복하거나 1초를 넘는 애니메이션**(스피너 · 마퀴 · 광택 · 숨 쉬기 · 긴 등장)은 눈금에 맞지 않는 한 자리의 장식이라 그 규칙의 지역 변수(`--_<이름>-duration`)로 둔다. 장식이면 `animation-play-state: var(--motion-play)` 로 멈출 수 있게 한다(3.9-4).
  - 남은 숫자 1곳: 자동 완성 배경을 막는 `5000s` 전환(브라우저 꼼수). 눈금 밖의 긴 전환(1.2s · 1.8s `clip-path`)은 지역 변수로.
- **3.9-2. 토큰을 정리한다.** — **완료**(D42)
  - `--duration-moderate`(350ms)는 `base`(300ms)와 50ms 차이라 고르는 기준이 없다 → `base` 로 합쳤다(31).
  - `--duration-slowest`(1.5s) · `--delay-*` 는 한 자리의 장식이다 → 그 모듈의 지역 변수(`--_flash-duration` · `--_sheen-duration` · `--_stagger-step`)로.
  - `--ease-in-out` 은 이름과 달리 CSS `ease` 곡선이다 → `--ease-standard` 로.
  - 곡선 이름을 출처에서 자리로 — `material` → `standard`, `out-expo` → `enter`, `bounce` → `spring`, `exit` 추가. stylelint 가 옛 이름을 막는다.
- **3.9-3. 움직임 줄이기 설정(`prefers-reduced-motion: reduce`)은 `:root` 에서 시간 토큰을 `0.01ms` 로 바꿔 한 번에 처리한다.**
  - 0 이 아니라 `0.01ms` 인 이유: 0 이면 `transitionend` 가 오지 않아, 그걸 기다리는 코드가 멈춘다.
  - 스피너 · 진행 표시처럼 움직임이 곧 정보인 것은 시간 토큰 대신 컴포넌트 토큰(`--spinner-duration`)을 써서 이 설정을 피한다.
  - 시간 토큰을 쓰지 않는 큰 이동 · 시차 효과(스크롤 연동, JS 애니메이션) · 자동 재생은 모듈에서 따로 끈다.
  - — **완료**(D42, `tokens/_motion.css`). 시간 토큰을 쓰는 전환은 이 설정에서 모두 멈춘다. 숫자를 직접 쓴 전환(3.9-1)은 10-2 에서 토큰으로 옮기면서 같이 들어온다.
- **3.9-4. 5초 넘게 저절로 움직이는 것(마퀴 · 자동 넘김 · 배경 영상)은 멈출 수 있어야 한다**(WCAG 2.2.2). — **완료**(D44)
  - 메뉴의 멈춤 단추 하나가 전부를 멈춘다. 상태는 `motionStore`(localStorage `motion-paused`, 탭 간 공유) → `<html data-motion="paused|running">` → 토큰 `--motion-play`(`tokens/_motion.css`). 저장값이 없으면 움직임 줄이기 설정을 따른다.
  - 장식 반복 애니메이션은 `animation` 바로 뒤에 `animation-play-state: var(--motion-play);` 를 둔다(단축 속성이 play-state 를 되돌리므로 뒤에). 멈추면 그 자리에서 선다.
  - 저절로 반복 재생되는 영상은 `<LoopVideo>`(`components/ui`)로 — 멈추면 `autoplay` 를 꺼 둔 채 `pause()`, 다시 움직이면 `play()`.
  - JS 로 도는 것은 `useMotionPaused()`(렌더) 또는 `useMotionStore.getState().isPaused`(프레임 루프)를 본다 — 배너 자동 넘김 · 스크롤 안내 줄 · 태그 구름의 저절로 도는 회전 · 코드 데모 시계 · 굴뚝 연기 · 떠다니는 몽이의 흐름 · 회전 · 출렁임 · 표정 돌리기. 사용자가 그 자리의 재생 단추를 누르면 그것은 다시 돈다.
  - 멈추지 않는 것: 움직임이 곧 정보인 스피너 · 진행 표시 · 불러오는 중 광택 · 올리는 중 · 녹음 · 저장 중, 다음 조작까지만 깜빡이는 안내(SEO 항목 · 알림에서 온 항목 · 달력 하이라이트), 글자 커서, hover 하는 동안만 움직이는 것.
- **3.9-5. `transition: all` 을 쓰지 않는다.** 바꿀 생각이 없던 속성까지 전환되고, 레이아웃 속성이 섞이면 매 프레임 다시 계산한다.
  움직이는 속성을 적는다. 가능하면 `transform` · `opacity` 만 움직인다. — **완료**(D42). 17곳 중 7곳(Split 레이아웃의 글)은 바뀌는 속성이 없어 전환 자체를 지웠다.
- **3.9-6. 테마 전환은 View Transitions 로 한다.**
  - `ThemeProvider` 가 `document.startViewTransition()` 으로 화면을 한 번에 바꾼다(교차 페이드, `--duration-base`).
    지원하지 않거나 움직임 줄이기 설정이면 즉시 바꾼다.
  - 모든 요소에 색 transition 을 거는 방식(예전 `html[data-theme-transitioning] *`)은 쓰지 않는다. 그 규칙이 컴포넌트의
    transition 을 덮어서, 컴포넌트마다 특이도를 올리거나 `!important` 를 붙여 피해야 했다.
  - — **강제**(감시 테스트: `!important` 를 붙인 transition 0)

### 3.10 쌓임

- **3.10-1. 화면 위에 뜨는 것은 top layer 에 올린다.**
  - 모달 · 드로어는 `<dialog>` + `showModal()`.
  - 팝오버 · 툴팁 · 셀렉트 목록 · 날짜/색/이모지 선택기는 Popover API(`popover` 속성).
  - top layer 는 z-index 와 상관없이 맨 위다. "모달 안의 셀렉트가 모달 뒤로 숨는" 문제가 구조적으로 생기지 않는다.
  - top layer 는 z-index 를 이긴다. 그래서 모달보다 위에 있어야 하는 것(커스텀 커서 · 로딩 화면 · 페이지 전환)도 top layer 에 올린다.
    나중에 연 것이 위로 가므로, 커서는 `popover="manual"` 로 두고 모달이 열릴 때마다 다시 연다.
  - 떠 있는 요소의 위치는 아직 JS 가 잡는다(1-5, anchor positioning 은 아직 안 씀).
  - — **목표**(`createPortal` 을 쓰는 파일 53)
- **3.10-2. 페이지에 붙어 있는 UI 의 층은 `--z-index-*` 로.** top layer 로 옮긴 뒤 남는 것은 넷이다.

  | 토큰 | 자리 |
  |---|---|
  | `--z-index-below` | 배경(영상 배경 등) |
  | `--z-index-content` | 페이지 콘텐츠 |
  | `--z-index-nav` | 고정 내비게이션 |
  | `--z-index-float` | 내비 위에 고정된 UI |

  지금 있는 `--z-dropdown` · `-popover` · `-tooltip` · `-modal` · `-overlay` · `-fullscreen` · `-loading` · `-top` · `-cursor` 는
  3.10-1 이 끝나면 지운다.
- **3.10-3. 컴포넌트 안의 겹침은 `isolation: isolate` 로 쌓임 맥락을 만들고 `0 … 3` 만 쓴다.**
  컴포넌트 밖의 층과 겨루지 않게 된다. — **목표**(4 이상 숫자 83 · 39파일)

### 3.11 반응형

- **3.11-1. 작은 화면 스타일이 기본이고, 큰 화면에서 덧붙인다(`min-width`).** — **목표**(`max-width` 미디어 쿼리 206 · 130파일)
- **3.11-2. 미디어 쿼리는 범위 문법으로, 기준값은 셋이다.**
  ```css
  @media (width >= 480px)  { … }  /* 큰 휴대폰 */
  @media (width >= 768px)  { … }  /* 태블릿 */
  @media (width >= 1024px) { … }  /* 데스크톱 */
  ```
  - 미디어 쿼리 안에는 `var()` 를 쓸 수 없어서(CSS 규격) 값을 직접 적는다.
  - 지금 쓰는 값: 768(95) · 1024/1025(100) · 480(23) · 640(19) · 그 밖 900 · 560 · 992 등(16).
  - 1024 와 1025 가 짝으로 있는 건 `max-width: 1024px` / `min-width: 1025px` 로 경계를 1px 띄워야 했기 때문이다.
    범위 문법(`<` · `>=`)에서는 그럴 필요가 없다.
  - 640 과 그 밖의 값은 이행 때 가까운 기준으로 옮기고 화면별로 확인한다.
  - 원시 파일의 `--mobile` · `--tablet` · `--pc` 는 CSS · JS 어디서도 읽지 않는다 → 지운다.
  - — **목표**
- **3.11-3. 컴포넌트의 반응형은 container query 로.** 화면 폭이 아니라 놓인 자리의 폭을 따른다. 미디어 쿼리는 페이지 골격에만. — 권장(지금 5곳)
- **3.11-4. 화면 높이를 꽉 채울 때는 `100vh` 대신 `100dvh`.** 모바일 브라우저는 주소창이 접혔다 펴지면서 보이는 높이가 바뀐다.
  `100vh` 는 주소창이 접힌 높이라 화면 아래가 가려진다. — **목표**(65 · 30파일)
- **3.11-5. 등분 grid 는 `repeat(N, minmax(0, 1fr))`(`--grid-columns-*`).** `1fr` 만 쓰면 자식의 최소 폭이 트랙을 밀어 넘친다.
  카드 grid 는 `repeat(auto-fit, minmax(min(100%, 220px), 1fr))`. — 권장

---

## 4. 우선순위 — cascade layer

**4-1. 전역 CSS 와 공용 컴포넌트 CSS 는 층에 넣고, 페이지 · 기능 컴포넌트의 CSS 는 층 밖에 둔다.**

| 층(앞 → 뒤) | 내용 |
|---|---|
| `reset` | 브라우저 기본값 정리(`sanitize.css`) |
| `vendor` | 서드파티 CSS(KaTeX · React Flow · Pretendard)와 그 덮어쓰기(`_overrides.css`) |
| `tokens` | 원시 · 역할 · 컴포넌트 토큰 |
| `base` | 요소 기본 스타일 · 페이지 골격 · `@keyframes` · 스크롤(`_base` · `_layout` · `_animations` · `_scroll`) |
| `components` | 공용 컴포넌트(`src/components/ui`)의 CSS Module · 에디터 · 본문 블록의 전역 클래스(`_hljs` · `_poll` · `_tabs` · `_sheet`) |
| `utilities` | `.sr-only` 같은 전역 클래스(`_utilities`) |
| (층 밖) | 페이지 · 기능 컴포넌트의 CSS Module |

- 뒤 층이 앞 층을 이기고, **층 밖은 모든 층을 이긴다** — 특이도와 상관없다.
- `!important` 는 반대로 앞 층이 이긴다. 층 안의 `!important` 는 인라인 style 이나 모든 커서처럼 **반드시 이겨야 하는**
  자리에만 쓴다(지금 전역 CSS 의 28곳이 그렇다).
- 층 배정은 `src/styles/global.css` 의 `@import … layer(…)` 가 정한다. — **강제**(감시 테스트: 층에 안 들어간 공용 컴포넌트 0)

**4-2. 층 순서 선언은 그 한 줄만 담은 `src/styles/layers.css` 에 두고, 루트 `layout.tsx` 에서 가장 먼저 import 한다.**
```css
@layer reset, vendor, tokens, base, components, utilities;
```
- 층 순서는 각 층 이름이 **처음 나온 순서**로 정해진다. 그래서 이 선언이 모든 CSS 보다 먼저 나와야 한다.
- 레이아웃이 import 한 CSS 는 import 순서대로 첫 묶음(root 청크)에 들어간다. 이 파일을 첫 import 로 두면 선언이 맨 앞에 온다
  (2026-10-02 개발 서버에서 root 청크 첫 줄 확인).
- 선언을 `global.css` 안에 두지 않는다. Turbopack 은 `@import` 로 가져온 내용을 그 파일의 다른 내용보다 앞에 놓아,
  가져온 층이 선언보다 먼저 나온다. 그래서 `@import` 가 없는 파일로 따로 둔다.
- 루트 레이아웃의 인라인 `<style>` 은 쓰지 않는다. React 19 가 `<style precedence>` 를 Next 의 스타일시트와 어떤 순서로
  `<head>` 에 넣을지 보장하지 않는다(Next 는 CSS 파일마다 precedence 그룹을 따로 만든다).

**4-3. 서드파티 CSS 는 JS 에서 바로 import 하지 않고, 층을 단 CSS 파일을 거친다.**
```css
/* src/styles/vendor/katex.css — 쓰는 화면에서 이 파일을 import 한다(코드 분할은 그대로) */
@import "katex/dist/katex.min.css" layer(vendor);
```
- JS 에서 바로 import 한 CSS 는 층 밖이라 모든 전역 규칙과 `vendor` 층의 덮어쓰기를 이긴다.
- Turbopack 이 이 형태를 `@layer vendor { … }` 로 감싸는 것을 확인했다(2026-10-02, 개발 서버).
- 지금 래퍼: `src/styles/vendor/katex.css` · `xyflow.css` · `pretendard.css`. — JS 에서 바로 import 하는 곳 0(감시 테스트)

**4-4. 공용 컴포넌트의 CSS Module 은 `@layer components { … }` 로 감싼다.**
```css
/* src/components/ui/Button.module.css */
@layer components {
  .root { … }
}
```
- 쓰는 쪽이 `className` 으로 넘긴 클래스는 층 밖이라, **번들 순서와 특이도에 상관없이** 공용 컴포넌트의 스타일을 이긴다.
- 확인한 것(2026-10-02, 개발 서버): 쓰는 쪽 CSS 가 번들 앞에 오고 공용 쪽 특이도가 (0,3,0)이어도 쓰는 쪽이 이겼다.
- 그래서 공용 컴포넌트를 덮으려고 `.x.x` 로 특이도를 올리거나 `!important` 를 붙이는 편법이 필요 없다.
- 두 모듈의 단일 클래스가 겨룰 때 승자가 번들 순서라서 개발 서버와 배포가 다르게 보이던 문제(#632)도 이 경우에는 사라진다.
- 공용 컴포넌트 63개를 모두 감쌌다 — **강제**(감시 테스트).
- **4-4-1. 남은 편법을 걷어 낸다.** 이미 있는 `.x.x`(197)와 `!important`(321) 중 공용 컴포넌트를 덮으려던 것은 이제 필요 없다.
  다만 페이지 모듈끼리 겨루는 곳(#632)에서는 아직 필요해서 하나씩 확인해야 한다. 그 파일을 고칠 때 함께 걷어 낸다. — **목표**(197 · 321)
  예전 테마 전환 규칙(3.9-6)을 이기려던 복합 선택자(`.a .b`)도 남아 있다. 이유가 사라졌으니 그 파일을 고칠 때 단일 클래스로 되돌린다.

**4-5. 다른 파일의 클래스를 `composes` 로 가져오지 않는다.** 가져온 클래스의 순서가 번들 순서에 따라 바뀐다(#632).
필요하면 공용 컴포넌트로 뽑는다(1-3). 같은 파일 안 `composes` 는 한 단계까지만 — Turbopack 이 두 단계째를 붙이지 않는다.
— **목표**(13 · 4파일)

---

## 5. 컴포넌트 작성

**5-1. 누르는 것은 `Button` 아니면 `Pressable`.** 맨 `<button>` 은 쓰지 않는다.

| | 주는 것 | 언제 |
|---|---|---|
| `Pressable` | 동작만 — `type="button"` · 사운드 · disabled · 누를 때 축소 · 브라우저 기본 스타일 초기화 | 생김새가 그 자리 사정을 따르는 것 |
| `Button` | 동작 + 생김새(`variant` · `size` · `tone` · `shape`) | 버튼처럼 생긴 버튼 |

MUI `ButtonBase` 와 `Button`, React Aria `useButton` 과 같은 분리다. 생김새를 `Button` 에 다 담으려고 prop 을 늘리지 않는다.
— **완료**(이행 8-3): 남아 있던 JSX `<button>` 5곳(테마 제안 카드 · 되돌리기 · 이미지 드롭, 디자인 시스템의 코드 블록 데모 2)을 `Pressable` 로. lint 는 아직 `type` 이 빠진 `<button>` 만 막는다 — 16단계에서 올린다.

**5-2. 상태는 그 상태를 뜻하는 속성으로 스타일한다.**
- 접근성 속성이 있으면 그것을 쓴다: `[aria-expanded="true"]` · `[aria-selected="true"]` · `[aria-current]` · `[aria-pressed]` · `:disabled`.
- 없으면 `data-*` 를 쓴다: `[data-state="open"]`.
- 화면 낭독기가 읽는 상태와 보이는 상태가 어긋나지 않는다. Radix · React Aria 가 이렇게 한다.
- 상태 클래스(`.isActive`)는 그런 속성이 없을 때만 쓴다.
- — 권장

**5-3. 인라인 `style` 은 JS 가 계산한 값에만 쓴다.**
- 위치 · 크기 · 진행률 · 드래그 좌표처럼 렌더마다 바뀌는 값이 대상이다.
- 넘길 때는 CSS 변수로 넘기고 CSS 가 쓰게 한다: `style={{ "--_x": `${x}px` }}`.
- 고정된 생김새는 CSS 에 쓴다.
- — 권장. 지금 `style={{…}}` 950곳 대부분이 동적 값이라 lint 로 고정값만 골라 막을 수 없다.

**5-4. 아이콘을 글자(`×` · `▸`)로 만들지 않는다.** 아이콘 컴포넌트를 쓴다. 글자 아이콘은 글꼴에 따라 크기 · 위치가 달라지고,
화면 낭독기가 문자 이름("곱하기")으로 읽는다. — 권장

**5-5. 클래스 이름.**
- CSS Modules 가 이름을 해시하므로 충돌을 피하려는 접두어 · BEM(`__` · `--`)을 쓰지 않는다. **camelCase** 로 쓴다.
- 이름은 생김새가 아니라 역할로 짓는다: 루트 `.root` · 래퍼 `.row` `.group` · 글 `.title` `.meta`. `.redText` · `.bigBox` ✗.
- 계층은 nesting 이나 자식 선택자로 표현하고, 특이도는 낮게 둔다.
- JS 로 클래스를 붙일 때는 해시된 이름을 쓴다: `el.classList.toggle(styles.isActive, on)`.
- — 권장

## 6. 접근성

- **6-1. 포커스 표시는 `:focus-visible` 에 `outline` 으로 준다.**
  - `outline: none` 을 쓰면 같은 규칙에 대신할 표시를 준다.
  - `box-shadow` 만으로 그린 포커스 링은 Windows 고대비(forced colors)에서 그림자가 지워져 사라진다.
  - 모양을 그림자로 그려야 하면 `outline: 2px solid transparent` 를 같이 둔다. 평소에는 안 보이고, 고대비에서는 보이는 색으로 바뀐다.
  - 포커스 링의 색 · 두께 · 간격은 역할 토큰 `--focus-ring-color` · `-width` · `-offset`. 대비 3:1(3.1-4).
  - — **목표**(`outline: none/0` 69 · 포커스를 그림자로만 그린 규칙 10)
- 그 밖의 접근성 규칙은 각 축에 있다:
  - 대비 3.1-4 · 색만으로 전하지 않기 3.1-5
  - 확대 3.2-4 · 루트 글자 크기 3.2-5 · 누르는 크기 3.4-4
  - 움직임 줄이기 3.9-3 · 자동으로 움직이는 것 3.9-4
  - 다크의 기본 컨트롤 2-5-2 · 상태 속성 5-2 · 글자 아이콘 5-4
- 화면에 안 보이고 읽어 주기만 할 글은 `.sr-only`.

## 7. 쓰지 않는 것

| | 이유 | 상태 |
|---|---|---|
| Tailwind · 유틸리티 클래스 | 두 방식이 섞이면 같은 모양이 두 가지로 쓰인다 | 강제(의존성 없음) |
| 런타임 CSS-in-JS | 서버 컴포넌트에서 못 쓰고 런타임 비용이 든다 | 강제(의존성 없음) |
| 토큰의 `var()` 대체값 | 없는 토큰을 가린다(2-7) | 강제 |
| `-webkit-backdrop-filter` | 빌드(Lightning CSS)가 접두어와 표준을 같은 속성으로 보고 **뒤에 적힌 하나만 남긴다.** 흔한 순서(표준 → 접두어)로 쓰면 접두어만 남아 크롬에서 블러가 사라진다. Safari 18 부터 접두어 없이 되므로 필요도 없다(D17) | 강제 |
| `id` 선택자로 재사용 스타일 | 특이도가 튀고 한 페이지에 하나만 쓸 수 있다 | 권장 |

## 8. 지금 도구가 막는 것

| 막는 것 | 도구 |
|---|---|
| `color` · `background-color` · `border-color` · `fill` · `stroke` 의 hex | stylelint |
| 글자 크기의 14px 이하 눈금(`--font-size-11 … 14`) · 12px 미만 숫자 | stylelint(CSS) · eslint(인라인 style · 문자열) |
| 모서리의 `full` · `circle` · `24` 밖 눈금(`--radius-2 … 16`) · `50%` · `9999px` | stylelint · eslint(인라인 style · 문자열) |
| 저장된 글을 위한 옛 토큰 이름(`--spacing-md` · `--radius-2xl` 등, 2-3-6) | stylelint · eslint |
| `padding` · `margin` · `gap` 의 px · rem 숫자 | stylelint |
| 토큰의 `var()` 대체값 | stylelint |
| `-webkit-backdrop-filter` | stylelint |
| 토큰 표와 CSS 의 차이 | `tokenDoc.test.ts` |
| 정의되지 않은 토큰을 대체값 없이 쓰기(선언 전체가 조용히 무효가 된다) | `cssTokens.test.ts` |
| "목표" 숫자가 늘어나기 | `styleRatchet.test.ts`(0-1) |

- stylelint 는 원시 토큰 파일(`src/styles/tokens/**`)과 별칭 파일(`_legacy-aliases.css`)을 보지 않는다.

## 9. 파일

```
src/styles/
├── layers.css            층 순서 선언 한 줄 — layout.tsx 의 첫 CSS import(4-2)
├── global.css            진입점 — 아래 파일을 층에 넣어 import(4-1)
├── tokens/               원시 — _color _spacing _size _radius _typography _border _shadow _motion _z-index
├── vendor/               서드파티 CSS 를 층에 넣는 얇은 파일(4-3)
└── globals/
    ├── _semantic.css     역할 토큰 — 테마 · 화면 폭에 따라 값이 바뀐다
    ├── _component.css    컴포넌트 토큰 — 그림 색 · 컬러 피커 색 공간도 여기(3.1-2)
    ├── _legacy-aliases.css  저장된 글을 위한 옛 토큰 이름(2-3-6)
    ├── _base.css         요소 기본 스타일
    ├── _layout.css       페이지 골격
    ├── _animations.css   @keyframes
    ├── _utilities.css    전역 클래스(.sr-only 등)
    ├── _scroll.css       스무스 스크롤
    ├── _hljs.css _poll.css _tabs.css _sheet.css   에디터 · 본문 블록(전역 클래스)
    ├── _overrides.css    서드파티 덮어쓰기
docs/tokens.md            토큰 값 — 자동 생성(npm run tokens:doc)
```

토큰과 공용 컴포넌트는 `/design-system` 화면에서 직접 볼 수 있다.

---

## 10. 이행 계획

순서대로 한다. 각 단계는 PR 하나. 보이는 게 바뀌는 단계는 바뀌는 화면의 전후 스크린샷을 붙이고, 값을 정해야 하는 것은 미리보기로 먼저 고른다.

| 단계 | 내용 | 규칙 | 남은 곳 | 보이는 변화 |
|---|---|---|---|---|
| 1 | 이 명세 | — | — | 없음 |
| 2 | 감시 테스트 — "목표" 숫자를 같은 기준으로 세고, 늘면 실패 — **완료** | 0-1 | — | 없음 |
| 3 | 이름 체계: 원시 눈금 숫자 이름 · 줄인 단어 풀어 쓰기 · 안 쓰는 토큰 삭제 · 역할/컴포넌트 파일 분리 · 레이아웃 치수 정리 · lint 이름 갱신 · 저장된 글 별칭 — **완료** | 2-3 · 2-4 · 3.4 · 3.6-2 | — | 없음(계산값 비교로 확인) |
| 4 | 층: 순서 선언 · 서드파티 CSS · 공용 컴포넌트 `components` 층 — **완료**. 남은 편법(`.x.x` · `!important`)과 다른 파일 `composes` 는 그 파일을 고칠 때(4-4-1 · 4-5) | 4-1–4-5 | 197 + 321 + 13 | 없음(계산값 비교로 확인) |
| 5 | 테마: `light-dark()` · `color-scheme` · 컴포넌트의 테마 분기 제거 · View Transitions — **완료**. 팔레트 고정은 6단계로 옮겼다(2-5-1, D23) | 2-5 · 3.9-6 | — | 다크의 스크롤바 · 폼, 테마 전환 모습 |
| 6 | 색: 색상별 팔레트 단계 · 컴포넌트는 역할 색만 · 팔레트 고정 · 반투명은 `color-mix()` · 대비 표 자동 생성 — **완료**. 대비 미달 3곳은 따로 정한다(3.1-4) | 3.1 · 2-5-1 | — | 라이트 오류 글 한 단계 진하게, 강조 반투명 · 밝은 강조 ΔL 1 미만 |
| 7 | 글자: 7-1 글꼴 역할(Pretendard) · 제목 단계(Apple 기준) · 묶음 도입 · 11px 없애기 · 루트 크기 · `relaxed` — **완료**. 7-2 세리프 제목 정리 — **완료**(D26 → D27 로 바꿈: 제목은 모두 세리프) · 7-3 숫자 크기(눈금과 같은 값 55곳 → 토큰) · px 줄간격(19곳 → 비율) — **완료**. 지면 글자 7토큰을 rem 섞은 값으로(D28) — **완료**. 눈금에 없는 숫자 크기 37곳 → 가장 가까운 단계(스위치 ON/OFF · 장식 숫자 · 별 기호 4곳은 그래픽이라 예외) — **완료**. 컴포넌트에 직접 쓴 유동 크기 148곳 → rem 섞은 값(D30, 예외 3곳) — **완료**. 글자 토큰 세 층 · 이름 규칙 정리(D31) — **완료**. 컴포넌트를 묶음으로 — 역할 크기 토큰을 쓰던 규칙 1,500여 곳(D33) · 눈금을 바로 쓴 규칙 · 지면 크기 규칙 170여 곳(D34) · 1층 `--fluid-font-size-*` 38곳 → 전시 묶음(D35, fluid 토큰 삭제) **완료**. 남은 것: 로고 2곳 · `!important` 1곳(글자 역할이 아니거나 예외) | 3.2 | 선언 2220 · 62 + 160 + 21 | 7-1: 글꼴 Pretendard, 11px → 12px, 제목 크기 |
| 8 | 컨트롤 · 크기: 8-1 높이 눈금 24 … 40 · 24px 타깃 · `size` 이름 · 떠 있는 단추 · `--size-38` · px 줄간격 2곳 — **완료**(D36). 8-2 세로 여백으로 만든 높이 57곳 → 높이 + 좌우 여백 — **완료**(D37). 8-3 맨 `<button>` 5곳 → `Pressable` — **완료**. 8단계 끝 | 3.4 · 5-1 | 307 + 57 + 27 + 5 | 1–4px |
| 9 | 모서리 · 테두리 · 그림자(안의 색 71 포함) · 투명도: 9-1 모서리 역할 3개 · `circle` 삭제 · 눈금 1,182 + 숫자 27 → 역할 — **완료**(D38). 9-2 테두리 숫자 두께 222 → 눈금 · 묶음, 테두리 흉내 `box-shadow` 92 → `border` · `outline` — **완료**(D39). 9-3 그림자 값 60 + 크기 이름 62 → 역할 — **완료**(D40). 9-4 비활성 투명도 44 → `--opacity-disabled` 0.5 — **완료**(D41). 9단계 끝 | 3.5 – 3.8 · 3.1-2 | 1182 + 27 · 222 · 143 + 62 + 71 · 49 | 비활성 투명도 통일, 그림자(미리보기) |
| 10 | 모션: 10-1 곡선 이름(자리로) · 토큰 정리 39 · 움직임 줄이기 · `transition: all` 17 — **완료**(D42). 10-2 지속 시간 880 · 곡선 1,055 → 토큰, 반복 · 긴 애니메이션 103 → 지역 변수 — **완료**(D43). 10단계 끝 | 3.9 | 744 + 39 + 17 | 350 → 300ms, 0.2 → 0.15s · 0.4 → 0.3s |
| 11 | 자동으로 움직이는 것 멈추기: 11-1 멈춤 단추 · 상태 · `--motion-play`, 장식 반복 애니메이션 58 · 배경 영상 8 — **완료**(D44). 11-2 JS 루프 9곳(배너 자동 넘김 · 스크롤 안내 줄 · 태그 구름 · 데모 시계 · 연기 · 몽이 · 표정) — **완료**(D44). 11단계 끝 | 3.9-4 | 58 + 8 + 9 | 멈춤 단추, 움직임 줄이기에서 장식 반복이 선다 |
| 12 | top layer: `<dialog>` · Popover · 커서 · 로딩 · 페이지 전환 | 3.10-1 · 3.10-2 | 53 | 없음(겹침 버그 해소) |
| 13 | 컴포넌트 안 z-index | 3.10-3 | 83 | 없음 |
| 14 | 반응형: 작은 화면 기본 · 범위 문법 · `dvh` | 3.11 | 206 + 65 | 없어야 함(화면별 확인) |
| 15 | 포커스 표시 | 6-1 | 69 + 10 | 포커스 링 |
| 16 | 0 이 된 "목표"를 lint 로 막고 "강제"로 올린다 | 0-1 | — | 없음 |
