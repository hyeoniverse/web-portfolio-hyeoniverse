import { describe, it, expect, afterEach, vi } from "vitest";
import { useRef } from "react";
import { render, cleanup } from "@testing-library/react";
import { useFocusOnceWhenReady } from "@/hooks/useFocusOnceWhenReady";

/* 새 글·새 작업물은 초안 확인이 끝나면 제목 칸에 한 번 포커스를 준다(#897). 마우스를 쓰는 환경에서만 주고,
   사용자가 이미 다른 칸을 눌렀으면 빼앗지 않는다. */

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

/** 정밀 포인터(마우스)인지 흉내 낸다 */
function pointer(fine: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: fine && query.includes("pointer: fine"), media: query, onchange: null,
    addListener: () => {}, removeListener: () => {}, addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false,
  }));
}

function Title({ ready }: { ready: boolean }) {
  const ref = useRef<HTMLInputElement>(null);
  useFocusOnceWhenReady(ref, ready);
  return <input ref={ref} placeholder="제목" />;
}
const title = () => document.querySelector('input[placeholder="제목"]');

describe("useFocusOnceWhenReady", () => {
  it("준비되기 전에는 주지 않고, 준비되면 한 번 준다", () => {
    pointer(true);
    const r = render(<Title ready={false} />);
    expect(document.activeElement).not.toBe(title());
    r.rerender(<Title ready />);
    expect(document.activeElement).toBe(title());
  });

  it("한 번 준 뒤에는 준비가 다시 바뀌어도 되찾아 오지 않는다", () => {
    pointer(true);
    const r = render(<Title ready />);
    const other = document.createElement("input");
    document.body.appendChild(other);
    other.focus();
    r.rerender(<Title ready={false} />);
    r.rerender(<Title ready />);
    expect(document.activeElement).toBe(other);
    other.remove();
  });

  it("이미 다른 칸에 포커스가 있으면 빼앗지 않는다", () => {
    pointer(true);
    const other = document.createElement("input");
    document.body.appendChild(other);
    other.focus();
    render(<Title ready />);
    expect(document.activeElement).toBe(other);
    other.remove();
  });

  it("터치 환경에서는 주지 않는다 — 화면을 열자마자 키보드가 올라오지 않게", () => {
    pointer(false);
    render(<Title ready />);
    expect(document.activeElement).not.toBe(title());
  });
});
