import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { useNearViewport } from "@/app/about/_hooks/useNearViewport";

/* About 패널 지연 마운트의 관찰 기준(#921). 가로 트랙의 섹션이 화면 폭으로 잘라내서, 화면을 기준으로 보면 rootMargin 과
   상관없이 패널이 화면에 들어올 때에야 알렸다. 가장 가까운 [data-near-root] 조상을 기준으로 삼는지 본다. */

type Options = { root?: Element | null; rootMargin?: string };
const seen: Options[] = [];

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  seen.length = 0;
});

function stubObserver() {
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(_cb: unknown, options: Options) { seen.push(options); }
      observe() {}
      disconnect() {}
    },
  );
}

function Panel() {
  const { ref } = useNearViewport<HTMLDivElement>();
  return <div ref={ref} />;
}

describe("About useNearViewport", () => {
  it("가장 가까운 [data-near-root] 조상을 기준으로 한 화면 앞에서 본다", () => {
    stubObserver();
    const { container } = render(<section data-near-root><Panel /></section>);
    expect(seen).toHaveLength(1);
    expect(seen[0].root).toBe(container.querySelector("section"));
    expect(seen[0].rootMargin).toBe("100%");
  });

  it("표시가 없으면 화면을 기준으로 본다", () => {
    stubObserver();
    render(<div><Panel /></div>);
    expect(seen[0].root).toBeNull();
  });
});
