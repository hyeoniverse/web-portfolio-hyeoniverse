/** 블록 색상/형광펜 스와치 — key 는 i18n 재사용, value 는 CSS 색(null = 기본/제거).
 *  value 는 글 HTML 에 그대로 저장된다. 색은 globals/_component.css 의 --editor-* 가 팔레트를 가리킨다.
 *  예전 글에 저장된 `var(--color-red-500, #ef4444)` 도 같은 팔레트 단계로 풀린다(보라는 팔레트에 없어 대체값). */
export interface BlockColorSwatch {
  key: string;
  value: string | null;
}

export const BLOCK_COLORS: BlockColorSwatch[] = [
  { key: "default", value: null },
  { key: "red", value: "var(--editor-text-red)" },
  { key: "orange", value: "var(--editor-text-orange)" },
  { key: "green", value: "var(--editor-text-green)" },
  { key: "blue", value: "var(--editor-text-blue)" },
  { key: "purple", value: "var(--editor-text-purple)" },
];

// 글자 배경색(형광펜) 스와치 — 파스텔 톤 (default = 제거). 색 이름 키는 BLOCK_COLORS 와 공유(i18n 재사용).
export const BLOCK_HIGHLIGHTS: BlockColorSwatch[] = [
  { key: "default", value: null },
  { key: "red", value: "var(--editor-highlight-red)" },
  { key: "orange", value: "var(--editor-highlight-orange)" },
  { key: "green", value: "var(--editor-highlight-green)" },
  { key: "blue", value: "var(--editor-highlight-blue)" },
  { key: "purple", value: "var(--editor-highlight-purple)" },
];
