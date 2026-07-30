/** 블록 색상/형광펜 스와치 — key 는 i18n 재사용, value 는 CSS 색(null = 기본/제거) */
export interface BlockColorSwatch {
  key: string;
  value: string | null;
}

export const BLOCK_COLORS: BlockColorSwatch[] = [
  { key: "default", value: null },
  { key: "red", value: "var(--color-red-500, #ef4444)" },
  { key: "orange", value: "var(--color-orange-500, #f97316)" },
  { key: "green", value: "var(--color-green-500, #22c55e)" },
  { key: "blue", value: "var(--color-blue-500, #3b82f6)" },
  { key: "purple", value: "var(--color-purple-500, #a855f7)" },
];

// 글자 배경색(형광펜) 스와치 — 파스텔 톤 (default = 제거). 색 이름 키는 BLOCK_COLORS 와 공유(i18n 재사용).
export const BLOCK_HIGHLIGHTS: BlockColorSwatch[] = [
  { key: "default", value: null },
  { key: "red", value: "var(--color-red-200, #fecdd3)" },
  { key: "orange", value: "var(--color-orange-200, #fed7aa)" },
  { key: "green", value: "var(--color-green-200, #bbf7d0)" },
  { key: "blue", value: "var(--color-blue-200, #bfdbfe)" },
  { key: "purple", value: "var(--color-purple-200, #e9d5ff)" },
];
