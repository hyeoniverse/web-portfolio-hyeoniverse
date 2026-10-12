/* 디자인 장 — 디자인 시스템. 토큰 수는 화면이 src/data/generated/tokenSky.ts(npm run gen-token-sky 가 CSS 에서 굽는다)에서 센다.
   대비 = docs/tokens.md 「대비」 표, 막는 것 = design-system.md §8, 결정 기록 = design-system-decisions.md 의 D 항목 */
import type { L10n } from "./showcase";

export const designChapter = {
  eyebrow: { ko: "06 — 디자인", en: "06 — Design" } satisfies L10n,
  title: {
    ko: "모든 화면은 토큰 몇 백 개로 그립니다. 손으로 고른 숫자는 도구가 막습니다.",
    en: "Every screen is drawn from a few hundred tokens. Hand-picked numbers are blocked by tooling.",
  } satisfies L10n,
  note: {
    ko: "이 하늘의 별 하나하나가 이 사이트의 토큰입니다. 색 별은 그 토큰의 색으로 칠해서, 테마를 바꾸면 같이 바뀝니다.",
    en: "Every star in this sky is one of this site's tokens. Color stars are painted with their own token, so they follow the theme.",
  } satisfies L10n,
  live: { ko: "디자인 시스템 페이지에서 전부 보기", en: "See it all on the design system page" } satisfies L10n,
};

export const designSteps = [
  {
    id: "layers",
    label: { ko: "토큰 세 층", en: "Three token layers" },
    title: { ko: "원시 → 역할 → 컴포넌트, 층은 셋뿐", en: "Raw → role → component — only three layers" },
    body: {
      ko: "팔레트와 눈금(원시)은 테마와 상관없이 값이 하나이고, 글자색 · 배경 · 글자 묶음 같은 역할 토큰이 테마와 화면 폭에 따라 바뀝니다. 컴포넌트는 역할만 가리킵니다. 네 번째 층은 만들지 않습니다. CSS 자체도 cascade layer 일곱 층(reset · vendor · tokens · base · components · compositions · utilities)으로 이기는 순서를 정해, !important 나 선택자 겹치기 없이 덮어씁니다. 모달 · 메뉴처럼 떠 있는 것은 <dialog> · popover 로 top layer 에 올려 z-index 숫자 경쟁을 없앴습니다.",
      en: "Palettes and scales (raw) have one value regardless of theme; role tokens — text colors, surfaces, type bundles — change with theme and width. Components only point at roles. There is no fourth layer. The CSS itself is ordered by seven cascade layers (reset, vendor, tokens, base, components, compositions, utilities), so overrides win without !important or doubled selectors. Floating things such as modals and menus go to the top layer via <dialog> and popover, ending the z-index number race.",
    },
  },
  {
    id: "color",
    label: { ko: "색은 역할로", en: "Color by role" },
    title: { ko: "같은 회색도 뜻이 다르면 이름이 다르다", en: "Same gray, different meaning, different name" },
    body: {
      ko: "컴포넌트는 --text-* · --bg-* · --border-color-* 역할만 쓰고, 팔레트를 직접 쓰면 감시 테스트가 막습니다(현재 0건). 역할 쌍마다 WCAG 대비를 재서 표로 남깁니다. 라이트 · 다크는 역할 토큰 안의 light-dark() 와 color-scheme 으로 한 번에 바뀌고, 테마를 바꿀 때는 View Transitions 로 화면이 이어집니다. 키보드 포커스는 어디서나 같은 링 하나로 그립니다.",
      en: "Components use only --text-*, --bg-*, --border-color-* roles; using the palette directly is blocked by a watch test (currently zero). Every role pair's WCAG contrast is measured and recorded. Light and dark switch at once through light-dark() inside role tokens and color-scheme, and the theme change is animated with View Transitions. Keyboard focus is drawn with the same single ring everywhere.",
    },
  },
  {
    id: "type",
    label: { ko: "글자는 묶음으로", en: "Type as bundles" },
    title: { ko: "크기 · 줄간격 · 굵기 · 글꼴을 한 번에", en: "Size, leading, weight and family in one" },
    body: {
      ko: "글자는 역할 묶음(--font-*) 하나로 고릅니다. 본문 · UI 는 Pretendard 하나로 맞추고, 세리프는 화면 제목과 장식에만 씁니다. 12px 보다 작은 글자는 CSS 는 stylelint, 인라인 스타일은 eslint 가 막습니다.",
      en: "Text picks a single role bundle (--font-*). Body and UI text share one family, Pretendard, and serifs are kept to screen titles and decoration. Anything under 12px is blocked — by stylelint in CSS and eslint in inline styles.",
    },
  },
  {
    id: "motion",
    label: { ko: "움직임은 네 곡선", en: "Four motion curves" },
    title: { ko: "길이 다섯 · 곡선 넷, 움직임 줄이기는 0.01ms", en: "Five durations, four curves — 0.01ms with reduced motion" },
    body: {
      ko: "지속 시간은 0.1초부터 0.8초까지 다섯 단계, 곡선은 standard · enter · exit · spring 넷입니다. 움직임 줄이기를 켜면 모든 길이가 0.01ms 가 되고, 저절로 도는 장면도 멈춥니다. 처음 여는 로딩 화면은 페이지가 실제로 준비될 때까지 기다리고, 사이트 안에서 옮길 때는 페이지 뼈대를 먼저 띄웁니다. 휴대폰의 메뉴 · 모달은 아래에서 올라오는 시트이고, 아래로 쓸어 닫습니다.",
      en: "Durations run in five steps from 0.1s to 0.8s; curves are standard, enter, exit and spring. With reduced motion on, every duration becomes 0.01ms and self-running scenes stop. The first-load screen waits until the page is actually ready, and in-site navigation shows a page skeleton first. On phones, menus and modals are bottom sheets that close with a downward swipe.",
    },
  },
  {
    id: "guard",
    label: { ko: "도구가 막는다", en: "Guarded by tools" },
    title: { ko: "규칙은 문서가 아니라 검사로", en: "Rules live in checks, not documents" },
    body: {
      ko: "손으로 고른 숫자 · 색 · 옛 토큰 이름은 린트가 막고, 아직 옮기는 중인 규칙은 숫자가 늘어나기만 해도 테스트가 실패합니다. 결정은 이유와 함께 70개 항목으로 남겼습니다.",
      en: "Hand-picked numbers, colors and legacy token names are blocked by linters; rules still being migrated fail a test the moment their count grows. Decisions are recorded with reasons — 70 entries.",
    },
  },
] satisfies { id: string; label: L10n; title: L10n; body: L10n }[];

/** 2 · 대비 — docs/tokens.md 「대비」 표에서 몇 줄(라이트 / 다크) */
export const contrastRows = [
  { fg: "--text-primary", bg: "--bg-primary", what: { ko: "본문", en: "Body" }, light: "14.53", dark: "14.83" },
  { fg: "--text-secondary", bg: "--bg-primary", what: { ko: "보조 글", en: "Secondary" }, light: "11.18", dark: "13.01" },
  { fg: "--text-accent", bg: "--bg-primary", what: { ko: "강조 글 · 링크", en: "Accent · links" }, light: "5.00", dark: "5.68" },
  { fg: "--text-on-accent", bg: "--bg-accent-solid", what: { ko: "강조 면 위 글", en: "Text on accent" }, light: "5.41", dark: "6.86" },
];

/** 5 · 막는 것 — design-system.md §8 */
export const guardRows = [
  { what: { ko: "색 속성의 hex", en: "Hex in color properties" }, tool: "stylelint" },
  { what: { ko: "12px 미만 글자", en: "Text under 12px" }, tool: "stylelint · eslint" },
  { what: { ko: "padding · margin · gap 의 숫자", en: "Numbers in padding · margin · gap" }, tool: "stylelint" },
  { what: { ko: "정해진 밖의 모서리 값", en: "Off-scale radius values" }, tool: "stylelint · eslint" },
  { what: { ko: "토큰 표와 CSS 의 차이", en: "Token table drifting from CSS" }, tool: "tokenDoc.test" },
  { what: { ko: "정의되지 않은 토큰", en: "Undefined tokens" }, tool: "cssTokens.test" },
  { what: { ko: "옮기는 중인 규칙의 숫자 증가", en: "Migrating rules growing" }, tool: "styleRatchet.test" },
];
