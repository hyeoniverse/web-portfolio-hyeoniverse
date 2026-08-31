# 디자인 시스템 규칙

> CSS 네이밍 컨벤션 · 토큰 구조 · 컴포넌트 스타일링 규칙

> **관련 문서** — [리팩토링 방법론](./refactoring-guide.md)
> — 컴포넌트를 어느 폴더에 둘지: [컴포넌트 배치 기준](./refactoring-guide.md#배치-기준)
> — "CSS 모듈은 담당 컴포넌트와 1:1" 등 리팩토링 시 코드 기준: [코드 기준선](./refactoring-guide.md#3-코드-기준선)
> — 공용 컴포넌트 **사용법**(SearchCapsule·Tooltip·MenuDots 등): [components.md](./components.md)

---

## 0. 대원칙

1. **한 시스템 — CSS Modules + 디자인 토큰.** 유틸리티 프레임워크(Tailwind)·런타임 CSS-in-JS(styled-components/Emotion) 안 씀. **두 시스템 반반 혼용이 안티패턴** — Tailwind 를 한 번 도입했다가 같은 flex row 인데 어디는 `tw:flex`, 어디는 `styles.row` 인 split-brain 이 돼서 되돌렸다.
2. **토큰이 값의 유일한 출처.** 색·간격·크기·모션 전부 토큰(§1). 하드코딩 금지(§9).
3. **반복은 CSS 가 아니라 React 컴포넌트로.** 공유 CSS 유틸/레이아웃 프리미티브를 만들지 않는다 — 관용구(`flex` 등)는 각 module 에 인라인이 낫다. 3곳+ 반복이 확인되면 `components/ui/` 로 컴포넌트 추출.
4. **co-location.** 한 컴포넌트 ↔ 한 `.module.css`, 같은 폴더.
5. **모던 네이티브 CSS 적극.** nesting·`:has()`·container query·cascade layer 로 JS·프레임워크 의존을 줄인다(§11).

> **왜 CSS Modules 인가**: 이 프로젝트는 커스텀 애니메이션·GSAP·Three.js·정교한 CSS 이펙트가 핵심이라 bespoke CSS 가 유리하다. Tailwind 는 표준 UI 를 빠르게 조립할 때 강하지만 여기선 이점이 작고, 이미 성숙한 토큰 시스템이 있다. RSC 안전·무런타임·Next 네이티브라는 것도 장점.

---

## 1. 토큰 3-레이어 구조

```
Raw Tokens           →  Semantic Tokens          →  Component Tokens
(src/styles/tokens/)    (globals/_semantic.css)     (globals/_semantic.css)
원시값 (숫자/색상)         역할 기반, 컴포넌트 무관        컴포넌트 typing (일관성 레일)
```

| Layer | 위치 | 예시 | 역할 |
|---|---|---|---|
| Raw | `tokens/` | `--size-sm: 32px`, `--color-neutral-900` | 원시 값 |
| Semantic | `_semantic.css` | `--text-primary`, `--border-default`, `--font-size-body` | 의미/역할 부여, 컴포넌트 무관 |
| Component | `_semantic.css` | `--control-h-md`, `--button-p-lg`, `--input-p` | 컴포넌트별 spec (실수 방지 레일) |

> 예전에는 CSS Module 안의 `--_*` 를 4번째 층으로 적어 뒀는데, 실제로 쓰는 컴포넌트가 0곳이라 뺐다.
> Material(ref→sys→comp) · Spectrum(global→alias→component) 등도 세 층이다.
> module 안에서 지역 변수를 쓰는 건 여전히 자유지만, 그건 층이 아니라 그 파일의 사정이다.

### 어떤 축에 Semantic 층이 필요한가

> **같은 값을 여러 자리가 쓰고, 그 자리들이 함께 바뀌어야 하면** 역할 이름을 만든다.
> 아니면 눈금(Raw)으로 충분하다.

| 축 | 판정 |
|---|---|
| 색 · 글자 크기 · 컨트롤 규격 | 역할 층 있음 (`--text-*` `--font-size-<역할>` `--control-h-*`) |
| z-index · 모션 · 모서리 | Raw 이름이 이미 역할이다 (`--z-modal`, `--ease-material`, `--radius-capsule`). 층을 더 두지 않는다 |
| 그림자 | 눈금이 곧 강도라 역할과 1:1 |
| **간격** | **범용 역할 토큰을 만들지 않는다.** 역할은 컴포넌트 층에 둔다 (`--button-p-*`, `--input-p`) |

간격에 범용 역할을 두지 않는 건 큰 시스템들의 공통 선택이다 — Carbon `$spacing-01..13`,
Atlassian `space.025..1000`, Polaris `--p-space-*` 전부 눈금만 두고 역할은 컴포넌트가 가진다.

### Layer 1 — Raw Tokens (`src/styles/tokens/`)

파일별 카테고리:

| 파일 | 접두사 | 예시 |
|------|--------|------|
| `_color.css` | `--color-*` | `--color-accent`, `--color-neutral-50` |
| `_spacing.css` | `--spacing-*` | `--spacing-md`, `--spacing-xl` |
| `_typography.css` | `--font-*`, `--font-size-*` (눈금) | `--font-size-lg`, `--font-weight-medium` |
| `_motion.css` | `--duration-*`, `--ease-*`, `--delay-*` | `--duration-base`, `--ease-material` |
| `_radius.css` | `--radius-*` | `--radius-md`, `--radius-capsule` |
| `_shadow.css` | `--shadow-*` | `--shadow-sm`, `--shadow-glow` |
| `_sizing.css` | `--size-*`, `--width-*`, `--grid-cols-*` | `--size-md`, `--width-md`, `--grid-cols-2` |
| `_z-index.css` | `--z-*` | `--z-nav` (100), `--z-modal` (8000) |

**간격 눈금**: `1 · 2 · 4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48 · 64 · 80 · 96 · 112 · 128px`.
아래쪽이 배수(1·2·4·8)라 3px·6px 처럼 그 사이 값은 자리가 없다. 그런 값 106곳은
가까운 눈금으로 붙였다(최대 4px 차이). 눈금을 넘는 값(160px 등)은 그대로 두고 이유를 적어 뒀다.

**여백은 눈금을 그대로 쓴다.** 두 값이 필요하면 두 개를 나란히 적는다.

```css
padding: var(--spacing-xs) var(--spacing-md);   /* 8px 16px */
margin: var(--spacing-sm) 0;
```

> 한때 `--box-xs-md` 같은 **조합 토큰**을 뒀다가 없앴다. 조합은 값의 곱만큼 늘어나서
> 119개까지 불어났고 그중 84개가 아무 데서도 안 쓰였다. 정리해서 65개까지 줄였지만
> 근본 문제는 그대로였다 — `--box-2xs-sm` 이라는 이름이 알려주는 건 "4px 12px" 뿐이고,
> **왜 그 여백인지는 말하지 않는다.**
>
> Carbon·Atlassian·Polaris 어디에도 조합 토큰은 없다. 눈금 두 개를 나란히 적고,
> 반복되는 컴포넌트 종류에는 역할 토큰(`--card-p-md` 등, Layer 3)을 준다.
> 그게 실제로 일관성을 만드는 층이다.

### Layer 2 — Semantic Tokens (`src/styles/globals/_semantic.css`)

원시값에 **역할(의미)**을 부여. 다크/라이트 테마 분기 포함.

```css
/* 텍스트 */
--text-primary, --text-secondary, --text-tertiary, --text-muted
--text-accent, --text-inverse, --text-success

/* 배경 */
--bg-primary, --bg-secondary, --bg-tertiary, --bg-surface
--bg-accent, --bg-overlay, --bg-glass

/* 테두리 — Color (종류를 앞에, 정도를 뒤에) */
--border-color-strong, --border-color-default, --border-color-light
--border-color-white, --border-color-black, --border-color-accent

/* 테두리 — Width scale */
--border-width-thin (1px), --border-width-default (1.5px), --border-width-thick (2px)
--border-width-thicker (3px), --border-width-thickest (4px)

/* 테두리 — Shorthand (1px 기본. 2px 가 필요한 자리는 `-2` 접미) */
--border-strong, --border-default, --border-light
--border-white, --border-inverse, --border-accent, --border-accent-2

/* 글자 크기 — 눈금과 같은 접두사, 뒤가 역할 (색은 --text-*, 글꼴·굵기는 --font-*) */
--font-size-body(14) --font-size-label(13) --font-size-hint(12, 하한) --font-size-micro(11)
--font-size-hero --font-size-lead --font-size-subhead --font-size-prose*  ← 뷰포트 따라

/* 지면 리듬 (긴 글·패널 레이아웃) — 간격 역할 토큰의 시작점 */
--panel-py
--space-section --space-block --space-divide --space-line
```

### Layer 3 — Component Tokens (`_semantic.css` 안, 컴포넌트 typing)

컴포넌트 타입을 이름에 박은 토큰. **일관성 레일** 역할 — 컴포넌트 CSS 에서 raw `--size-*` 를
직접 쓰지 않고 이 토큰을 거치면 다른 사이즈를 골라 일관성이 깨지는 실수를 막는다.
Carbon / Primer 등도 같은 층을 둔다.

```css
/* 컨트롤 높이 — 버튼·인풋·셀렉트·칩이 공유하는 유일한 눈금 */
--control-h-2xs: 20px;
--control-h-xs:  24px;
--control-h-sm:  28px;
--control-h-md:  32px;   /* Input/Select 기본 */
--control-h-lg:  36px;
--control-h-xl:  38px;
--control-h-2xl: 46px;

/* padding 계열 — 간격의 "역할"은 여기 있다 (범용 역할 토큰을 따로 만들지 않는 이유) */
--button-p-xs / -sm / -md / -lg
--input-p, --textarea-p
--badge-p-sm(1/4) / -md(2/8) / -lg(4/12)
--row-p-sm(4/12) / -md(8/12) / -lg(12/16)
--skeleton-h-*
```

**역할 토큰은 이렇게 만든다.** 뱃지 118곳이 29가지 여백을 쓰고 있었다. 이름을 통일해도
이 숫자는 안 줄어든다 — 이름이 값을 말할 뿐 왜 그 값인지는 말하지 않기 때문이다.

등급을 **글자 크기로 나누면 틀린다.** 처음에 12px→md, 13px→lg 로 잡았더니 `StatusBadge` 가
2/8 에서 4/12 로 넓어져 관리자 표에서 Edit 버튼을 침범했다. 같은 13px 이라도 표 안의 상태
뱃지는 조밀해야 하고 클릭하는 태그 필터는 넉넉해야 한다.

**각 자리에서 가장 가까운 등급으로 붙인다.** 그러면 이동량이 최소가 되고, 이미 맞는 자리는
이름만 바뀐다. 등급에서 4px 넘게 떨어진 곳은 의도로 보고 손대지 않는다.

목록 행도 같은 방법으로 33종 → 3종으로 정리했다. 다만 **가로 여백이 0인 행은 제외한다** —
좌우 여백을 부모가 이미 주고 있어서 세로만 정하면 되고, 거기엔 역할이 필요 없다.
뱃지에서 높이를 직접 정하는 것을 제외한 것과 같은 이유다.

모달·카드·입력 필드도 같은 방법으로 처리했다 — `--modal-p-*` · `--card-p-*` · `--field-p-*`.

> 예전에는 `--button-h-*`(20/24/38/46)와 `--control-h-*`(24/28/32/36)가 같은 "컨트롤 높이"를
> 서로 다르게 말했고, `_sizing.css` 주석이 또 다른 계층을 선언하고 있었다. 그래서 같은
> `size="md"` 가 자리에 따라 32px 이기도 38px 이기도 했다. 하나로 합쳤다.
>
> **컨트롤 높이는 `_sizing.css` 가 아니라 여기서 정한다.**

**사용 규칙**
- 컨트롤은 raw `--size-*` 직접 사용 금지 → `--control-h-*`
- 새 컴포넌트가 생기면 그 컴포넌트의 간격·높이 토큰을 여기에 추가한다
- 2xs·xl·2xl 은 통합 과정에서 들어온 단계라 xs~lg 와 간격이 고르지 않다. 쓰는 자리를 줄여 가며 정리한다

---

### 토큰을 만들고 고를 때 — R1 ~ R7

이 일곱 개가 §1 의 결론이다. 새 토큰을 추가하거나 이름을 지을 때 여기에 비춘다.

**R1. 층은 셋뿐이다.** Raw → Semantic → Component. 네 번째 층을 만들지 않는다.
컴포넌트 CSS 는 Semantic·Component 층을 부른다. Raw 를 직접 부르는 건
그 축에 역할 층이 없을 때만이다(z-index · 모션 · 모서리 · 그림자).

**R2. 역할 층은 필요한 축에만 만든다.** 판단 기준은 위의 표 — 같은 값을 여러 자리가
쓰고 함께 바뀌어야 할 때만 역할 이름을 만든다. **간격은 범용 역할을 만들지 않는다.**
`--space-card-gap` 같은 걸 만들기 시작하면 컴포넌트 수만큼 늘어나고 아무도 못 고른다.
간격의 역할은 Component 층(`--button-p-md`, `--input-p`)에 둔다.

**R3. 이름은 「종류 → 역할 → 정도」 순.** 종류가 앞에 와야 같은 종류가 사전순으로 붙는다.

| | |
|---|---|
| ✓ | `--border-color-strong` · `--border-width-thin` · `--control-h-md` · `--text-secondary` |
| ✗ | `--border-strong-color` (같은 종류가 흩어짐) |
| ✗ | `--ui-fs-sm` (`fs` 같은 축약 — 무엇의 약자인지 파일 밖에서 안 보인다) |
| ✗ | `--font-size-14` (값을 이름에 박으면 값을 못 바꾼다. 단계로 부른다) |

단계 이름(`sm`/`md`)은 값이 아니라 눈금이라 괜찮다. 값을 이름에 박는 건 `--font-size-14`
같은 것을 말한다.

**R4. 눈금은 `4xs … 6xl` 안에서만 고른다.** 이 밖의 단계를 새로 만들지 않는다.
`2xl-plus` 같은 반 단계가 이미 두 군데 있는데, **반 단계는 더 늘리지 않는다** —
반 단계가 필요하다고 느끼면 대개 눈금이 아니라 그 자리의 레이아웃이 문제다.

**R5. 조합을 미리 만들지 않는다.** 여백 조합 토큰(`--box-*`)이 119개까지 불어났다가
84개가 미사용으로 드러난 적이 있다. 지금은 아예 없앴다 — 눈금 두 개를 나란히 적는다.
다른 축에서도 마찬가지로, 실제로 쓰는 순간 추가하고 안 쓰게 되면 지운다.

**R6. 모서리는 `capsule` · `circle` · `2xl` 셋만 고른다.**
사이 단계를 쓰기 시작하면 같은 성격의 카드가 6px 과 12px 로 갈린다. 예전에 2px~42px 눈금이
열세 개 있었는데, 쓰는 곳이 0인 `lg`·`xl`·`3xl`~`6xl` 은 지웠다(R5). 남은 건 일곱 개다.

| | |
|---|---|
| `--radius-capsule` | 버튼·칩·뱃지·**hover/선택 배경 하이라이트는 무조건 이것** |
| `--radius-circle` | 아바타·아이콘 버튼 등 정원 |
| `--radius-2xl` | 카드·패널·모달처럼 면이 있는 것 |

**예외는 "각진 것" 자체가 의미인 자리뿐이다** — 체크박스, 다중선택 마커(단일은 원, 다중은 네모),
컬러피커의 SV 사각형(모서리에 순색이 있어 둥글리면 못 고른다), Button 의 `shape="square"`.
8곳이고 전부 `stylelint-disable-next-line` 에 이유를 적어 뒀다.

집행은 두 군데다. stylelint 가 `.css` 를, eslint(`no-restricted-syntax`)가 인라인 `style` 과
직렬화 문자열을 막는다 — 에디터 직렬화처럼 CSS 파일 밖에서 `border-radius` 를 쓰는 자리가 있어서다.
`border-radius: 50%` · `9999px` 처럼 값을 직접 쓰는 것도 막는다(`--radius-circle`/`capsule` 로).

**R7. 규칙은 lint 가 집행한다.** 문서에만 있는 규칙은 지켜지지 않는다(§9).

| 막는 것 | 어디서 |
|---|---|
| 하드코딩 색 | stylelint |
| 눈금 이름으로 고른 글자 크기 · 12px 미만 | stylelint + eslint |
| 세 개 밖의 모서리 · `border-radius: 50%`/`9999px` | stylelint + eslint |
| 간격 리터럴(`padding: 6px`) | stylelint |
| 디자인 토큰의 `var()` fallback | stylelint |

eslint 쪽(`no-restricted-syntax`)이 있는 건 인라인 `style` 과 에디터 직렬화 문자열처럼
CSS 파일 밖에서 스타일을 쓰는 자리가 있어서다.

간격에서 **`em`·`vw`·`vh`·`%`·`calc()`·음수는 막지 않는다.** 글자 크기나 뷰포트에
비례하라고 쓴 값이거나 위치를 미세하게 미는 값이라 눈금과 성격이 다르다.

---

### 눌리는 것 — Button 과 Pressable

담당이 둘로 나뉜다.

| | 무엇을 주나 | 언제 |
|---|---|---|
| `Pressable` | 동작만 — `type="button"` · 클릭/호버 사운드 · disabled · 누를 때 축소 · UA 스타일 리셋 | 생김새가 그 자리 사정을 따르는 것 |
| `Button` | 동작 + 생김새 (`variant` `size` `tone` `shape`) | 버튼처럼 생긴 버튼 |

**생김새를 통일하면 안 되는 자리가 실제로 많다.** 절대위치로 깔린 클릭 영역, 부모 글꼴을
물려받는 페이지 번호, 필터 행 높이에 맞춘 탭, `::after` 로 밑줄을 그리는 칩 — 전부 그 자리에선
지금 모양이 옳다. 이런 걸 `Button` 에 담으려고 prop 을 늘리면 `Button` 이 무너진다.

그런데 그 자리들이 놓치던 건 생김새가 아니라 **동작**이었다. 사운드가 안 울리고, `type` 이
없어 폼 안에서 제출이 되고(63곳이 그랬다), disabled 처리가 제각각이었다.

그래서 동작만 떼어 `Pressable` 에 담고, 생김새는 쓰는 쪽이 `className` 으로 준다.
MUI 의 `ButtonBase`, React Aria 의 `useButton` 과 같은 구조다.

```tsx
<Button variant="outline" size="xs">저장</Button>        {/* 버튼처럼 생긴 것 */}
<Pressable className={styles.sidebarScrollBtn}>…</Pressable>  {/* 클릭 영역 */}
```

`raw <button>` 은 쓰지 않는다. `react/button-has-type` 이 `type` 누락을 막지만, 그건
세 가지 문제 중 하나만 막는다.

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

**Fluid tokens**: 뷰포트에 따라 자동 스케일 (clamp 기반). 글자에만 있다.

```css
--fluid-font-size-2xl: clamp(1.25rem, 2.5vw, 2rem);   /* 하한 0.75rem = 12px */
```

간격에는 fluid 눈금이 없다. `--fluid-spacing-*` 은 11개 중 쓰는 곳이 0이라 지웠다.
지면이 뷰포트를 따라야 하면 Layer 2 의 `--panel-py` · `--space-section/block/divide/line`
을 쓴다 — 이건 눈금이 아니라 "긴 글의 리듬"이라는 역할이다.

**Breakpoint**: CSS 미디어 쿼리는 `var()` 를 못 받는다. 그래서 breakpoint 토큰은 두지 않는다
(예전 `--breakpoint-*` 7개는 아무도 안 써서 지웠다). 미디어 쿼리에는 값을 직접 쓴다.

```css
@media (max-width: 1024px) { ... }   /* tablet */
@media (max-width: 768px) { ... }    /* mobile */
```

> `_sizing.css` 의 `--pc: 1025px` · `--tablet: 768px` · `--mobile: 378px` 은 JS 에서
> 기준값을 읽을 때 쓴다. 미디어 쿼리 기준도 이 세 값에 맞춘다.

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

**크기는 `--font-size-<역할>` 로 고른다.** 색은 `--text-*`, 글꼴·굵기는 `--font-*` 라서 세 축이 겹치지 않는다.

`--font-size-*` 안에 **눈금(`sm`/`md`/`2xl`)과 역할(`body`/`hint`)이 같이 산다.** 속성이 이름에
있어야 이 토큰이 뭘 정하는지 오해가 없고, R3 「종류 → 역할」 에도 맞기 때문이다
(`--border-color-strong` 과 같은 모양). 대신 규칙이 하나 붙는다 —
**컴포넌트 CSS 는 역할 이름만 쓰고, 눈금은 `_semantic.css` 안에서만 참조한다.**

크롬 눈금 네 칸은 애초에 그 역할들을 위해 있던 값이라 1:1 로 대응한다. lint 가 왼쪽을 막는다.

| 눈금 | | 역할 |
|---|---|---|
| `--font-size-sm` (14px) | → | `--font-size-body` |
| `--font-size-xs` (13px) | → | `--font-size-label` |
| `--font-size-2xs` (12px) | → | `--font-size-hint` |
| `--font-size-3xs` (11px) | → | `--font-size-micro` |

`md`(16) 이상은 제목·디스플레이 크기인데 아직 역할 이름이 없다. 232곳이 단계 이름을 그대로
쓰고 있고, lint 도 막지 않는다. 이름을 붙이려면 그 232곳이 각각 무엇인지(제목인지 수치인지
장식인지) 봐야 해서 따로 할 일이다.

| 상황 | 사용 토큰 |
|------|----------|
| UI 본문·입력값·목록 | `--font-size-body` (14px) |
| 필드 라벨·버튼 | `--font-size-label` (13px) |
| 보조 설명·메타·뱃지 | `--font-size-hint` (12px, **하한**) |
| 못 읽어도 되는 것 (카운터·도형 안 라벨) | `--font-size-micro` (11px) |
| 카드·패널 제목 | `--font-size-title-sm` (16px) |
| 섹션 제목 | `--font-size-title-md` (18px) |
| 화면 안 가장 큰 제목 | `--font-size-title-lg` (20px) |
| 긴 글 본문 (기본 14px 보다 큰 지면) | `--font-size-body-lg` (16px) |
| 리드 문단·인용 | `--font-size-body-xl` (18px) |
| 24px 이상 제목·디스플레이 | `--font-size-2xl` ~ `-6xl` — 단계 이름이 곧 역할 |
| 지면 제목·본문 (About 등) | `--font-size-hero` · `-lead` · `-subhead` · `-prose*` |
| 그 외 제목 (반응형) | `--fluid-font-size-2xl` ~ `--fluid-font-size-6xl` |

**16·18·20px 에만 이름을 붙인 이유.** 이 구간에서만 같은 크기를 제목과 본문이 같이 쓴다 —
16px 짜리가 카드 제목이기도 하고 긴 글 본문이기도 해서 단계 이름(`md`)이 어느 쪽인지 말해
주지 않았다. 24px 부터는 전부 제목·디스플레이라 크기가 곧 역할이고, 이름을 더 만들면
`title-xl`·`display-sm` 처럼 눈금을 두 번 적는 꼴이 된다.

글리프(`+` 기호·아바타 이니셜)·수치·입력값은 읽는 글자와 성격이 달라 단계 이름을 그대로 쓴다.
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

**`prefers-reduced-motion` 존중** — 큰 이동·회전·시차 애니메이션은 접근성을 위해 축소/제거:
```css
@media (prefers-reduced-motion: reduce) {
  .parallax { animation: none; transform: none; }
}
```

---

## 9. 금지 사항

```css
/* ✗ hex/rgba 직접 사용 (예외: 컴포넌트 고유 이펙트 색상은 파일당 1–2개 허용) */
color: #1a1a1a;
background: rgba(0,0,0,0.5);

/* ✗ var() fallback — 없는 토큰을 가려서 조용히 깨진다 (stylelint 가 막음) */
color: var(--text-primary, #333);

/* ✗ 12px 미만 UI 글자 (stylelint 가 막음) — --font-size-hint 가 하한 */
font-size: 10px;

/* ✗ 눈금 이름을 컴포넌트에서 직접 — 역할 이름으로 */
font-size: var(--font-size-2xs);   /* → var(--font-size-hint) */

/* ✗ 글로벌 토큰 우회 */
--_bg: #f5f5f0;

/* ✗ 사이 단계 모서리 — capsule / circle / 2xl 만 (R6) */
border-radius: var(--radius-md);

/* ✗ 간격 리터럴 — --spacing-* 로 */
padding: 6px 12px;

/* ✗ 매직 넘버 z-index */
z-index: 9999;

/* ✗ BEM 클래스 */
.card__title { }
.card--active { }

/* ✗ Tailwind·유틸리티 클래스 — CSS Modules 단일 시스템(§0) */
/* <div class="tw:flex tw:gap-md"> */

/* ✗ 런타임 CSS-in-JS (styled-components / Emotion) — RSC 비호환·런타임 비용 */

/* ✗ -webkit-backdrop-filter — Chrome parser 가 꼬여 blur 자체가 안 보임. backdrop-filter 만 */
-webkit-backdrop-filter: blur(10px);

/* ✗ inline style — 단, 동적 토큰 주입 style={{ "--_h": "var(--control-h-sm)" }} 만 허용 */
```

---

## 10. 레이아웃 · Grid · 모던 CSS · 접근성

### 레이아웃
- flex/grid 는 담당 module 안에 co-located. 같은 레이아웃이 3곳+ 반복되면 **React 컴포넌트로 추출**(공유 CSS 유틸 X — §0).
- 재사용 레이아웃에 `id` 선택자 금지 (유일 page-shell 만 예외).

### Grid
- **등분 grid → `--grid-cols-*` 토큰** (`repeat(N, minmax(0,1fr))`, overflow-safe). bare `1fr` 금지 — 자식 콘텐츠가 트랙을 밀면 grid blowout.
- **카드/타일 grid → intrinsic auto-fit**: 미디어쿼리 없이 폭 따라 열 수 자동 + 모바일 안 터짐.
  ```css
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr));
  ```
- **고정 N열이 진짜 필요할 때만**(달력 7열·폼 2열 페어 등) `--grid-cols-N` 유지.

### 모던 네이티브 CSS (적극 사용)
- **nesting** — 네이티브 중첩으로 BEM 대체.
- **`:has()`** — 부모 상태 스타일링(JS 클래스 토글 대신).
- **container query** — 컴포넌트 레벨 반응형. 함정: `container-type` 은 multicol 자식·grid intrinsic 에서 붕괴 → **명시적 열 요소 + `width:100%`** 로 감쌈.
- **cascade layer** / `@property` — 전역 우선순위 정리·커스텀 프로퍼티 애니메이션.
- 목표: JS·프레임워크로 하던 걸 CSS 로 내려 단순화.

### 접근성
- **`:focus-visible`** 스타일 필수 — 키보드 포커스 링을 없애지 말고 커스텀 링 제공.
- **`prefers-reduced-motion`** 존중(§8).
- **`.sr-only`** — 시각 숨김 + 스크린리더 노출 텍스트.
- 클릭 타깃 최소 크기·대비(WCAG) 유지.

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
    ├── _utilities.css      # 유틸리티 클래스
    ├── _hljs.css           # Shiki 코드블록 하이라이팅 (richtext)
    ├── _poll.css           # 투표 블록 (에디터 + reader 공용, 글로벌 클래스)
    ├── _tabs.css           # 탭 블록 (에디터 + reader 공용, 글로벌 클래스)
    ├── _sheet.css          # Bottom Sheet 공통 시각 패턴 (Popover/CoverImagePicker)
    ├── _scroll.css         # Lenis 스무스 스크롤
    └── _overrides.css      # 커스텀 스크롤바 등 서드파티 override
```

디자인 시스템 미리보기: `/design-system` 라우트에서 토큰/컴포넌트 확인 가능.
