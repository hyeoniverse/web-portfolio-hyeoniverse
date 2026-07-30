/** Playground 실행 스택 프리셋 (생성 시 1회 선택, 이후 고정) */
export interface PlaygroundStack {
  value: string;
  label: string;
  ko: string;
  en: string;
}

// 스택 = 실행 엔진 + 스타터. 생성(빈 블록) 시 1회만 고른다(이후 고정) — html=자체 러너(오프라인·즉시),
// 나머지=Sandpack(번들러). 파일 언어는 확장자로 자동 렌더되므로 툴바엔 별도 선택이 없다.
export const PLAYGROUND_STACKS: PlaygroundStack[] = [
  { value: "html", label: "HTML / CSS / JS", ko: "오프라인·즉시 실행", en: "offline · instant" },
  { value: "vanilla-ts", label: "TypeScript", ko: "번들러 실행", en: "bundler" },
  { value: "react-ts", label: "React (TS)", ko: "번들러 실행", en: "bundler" },
  { value: "react", label: "React", ko: "번들러 실행", en: "bundler" },
];
