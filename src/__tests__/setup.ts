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

/* jsdom 의 Blob 에는 stream() 이 없다. shiki 4.6 부터 내장 WASM 을 `new Blob([…]).stream()` 으로 풀어서,
   코드 하이라이트를 그리는 테스트가 그 자리에서 TypeError 로 죽는다. 브라우저 · Node 에는 있는 메서드라
   arrayBuffer() 로 한 번에 내보내는 스트림을 채운다. */
if (typeof Blob !== "undefined" && typeof Blob.prototype.stream !== "function") {
  Blob.prototype.stream = function stream(this: Blob) {
    const bytes = this.arrayBuffer();
    return new ReadableStream<Uint8Array>({
      async start(controller) {
        controller.enqueue(new Uint8Array(await bytes));
        controller.close();
      },
    }) as ReturnType<Blob["stream"]>;
  };
}
