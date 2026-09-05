import "@testing-library/jest-dom/vitest";

/* jsdom 에는 window.matchMedia 가 없다. 미디어 쿼리를 보는 컴포넌트(useIsMobile 등)를
   렌더하면 그 자리에서 TypeError 로 죽는다. 데스크톱(질의가 하나도 안 맞는 상태)을
   기본으로 두는 표준 스텁을 깐다. 특정 질의를 맞춰야 하는 테스트는 각자 덮어쓴다. */
if (typeof window !== "undefined" && !window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}
