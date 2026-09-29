// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useGalleryNarration } from "@/components/works/useGalleryNarration";

/* 브라우저 음성으로 읽는 장 — 문장을 읽기 시작할 때마다 그 문장이 자막으로 나온다 */
describe("useGalleryNarration 자막", () => {
  let queue: SpeechSynthesisUtterance[] = [];

  beforeEach(() => {
    queue = [];
    vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(() => Promise.resolve());
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
    Object.defineProperty(window, "speechSynthesis", {
      configurable: true,
      value: { speak: (u: SpeechSynthesisUtterance) => { if (u.text) queue.push(u); }, cancel: () => { queue = []; }, getVoices: () => [] },
    });
    class FakeUtterance { text: string; lang = ""; voice = null; onstart: (() => void) | null = null; onend: (() => void) | null = null; onerror = null; constructor(t: string) { this.text = t; } }
    vi.stubGlobal("SpeechSynthesisUtterance", FakeUtterance);
    try { localStorage.clear(); } catch { /* 없음 */ }
  });

  const setup = () => {
    const el = document.createElement("div");
    const notes = { "a.png": { script: "첫 문장입니다. 둘째 문장입니다." } };
    return renderHook(() => useGalleryNarration({ images: ["a.png"], notes, index: 0, goTo: () => {}, viewRef: { current: el } }));
  };

  it("읽기 시작한 문장을 자막으로 낸다", async () => {
    const { result } = setup();
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    expect(result.current.playing).toBe(true);
    act(() => { queue[0].onstart?.(new Event("start") as SpeechSynthesisEvent); });
    expect(result.current.caption).toBe("첫 문장입니다.");
    act(() => { queue[1].onstart?.(new Event("start") as SpeechSynthesisEvent); });
    expect(result.current.caption).toBe("둘째 문장입니다.");
  });

  it("자막을 끄면 내지 않고, 켜면 다시 낸다", async () => {
    const { result } = setup();
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    act(() => { queue[0].onstart?.(new Event("start") as SpeechSynthesisEvent); });
    act(() => { result.current.toggleCaptions(); });
    expect(result.current.captionsOn).toBe(false);
    expect(result.current.caption).toBe("");
    act(() => { result.current.toggleCaptions(); });
    expect(result.current.caption).toBe("첫 문장입니다.");
  });
});
