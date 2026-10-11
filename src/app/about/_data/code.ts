/* 코드 장 — 코드와 그 코드가 하는 일을 나란히. 스니펫 · 데모는 data/about/codeExamples.ts(기존 About 의 Code Highlights)를 그대로 쓴다 */
import type { L10n } from "./showcase";

export const codeChapter = {
  eyebrow: { ko: "07 — 코드", en: "07 — Code" } satisfies L10n,
  title: {
    ko: "움직임 뒤의 코드 다섯 조각 — 옆에서 실제로 돌아갑니다.",
    en: "Five pieces of code behind the motion — each running right beside it.",
  } satisfies L10n,
  note: {
    ko: "위의 파일 탭으로 바꿔 보세요. 미리보기는 왼쪽 코드와 같은 식으로 움직이고, 직접 만질 수도 있습니다.",
    en: "Switch files with the tabs. Each preview runs the same math as the code beside it, and you can play with it.",
  } satisfies L10n,
  preview: { ko: "미리보기", en: "Preview" } satisfies L10n,
  excerpt: { ko: "발췌", en: "Excerpt" } satisfies L10n,
  lines: { ko: "줄", en: "lines" } satisfies L10n,
  live: { ko: "라이브 데모", en: "Live demo" } satisfies L10n,
  sandbox: { ko: "샌드박스 데모", en: "Sandbox demo" } satisfies L10n,
  keys: { ko: "← → 파일 전환", en: "← → switch file" } satisfies L10n,
  files: { ko: "코드 예제 파일", en: "Code example files" } satisfies L10n,
};

/**
 * 스니펫이 실제로 들어 있는 파일 — 제목 막대에 띄운다. 스니펫은 그 파일에서 줄여 옮긴 발췌라 "발췌" 표시를 함께 붙인다.
 * 키는 codeExamples 의 title. 없으면 제목 막대에 스니펫 제목을 쓴다
 */
export const codeSources: Record<string, string> = {
  "3D Scroll Torus (Lissajous Curve)": "src/components/effects/ScrollTorus/TorusScene.tsx",
  "Scene Cut Transitions": "src/hooks/useHorizontalScroll.ts",
  "Velocity-Matched Snap (Hermite Curve)": "src/hooks/useHorizontalScroll.ts",
  "Scroll Progress as CSS Variables": "src/app/about/_hooks/usePinnedScroll.ts",
  "Horizontal Scroll vs. Lenis Wheel": "src/hooks/useHorizontalScroll.ts",
};
