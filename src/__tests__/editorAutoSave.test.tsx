import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useEditorAutoSave } from "@/hooks/useEditorAutoSave";

/* 편집 화면을 열기만 했을 때는 리비전을 만들지 않는다(#837).
   본문 편집기가 불러온 HTML 을 다듬어 올리는 것처럼, 사용자가 아무것도 하기 전의 변경은 기준으로 삼는다. */

type Form = { title: string; content: string };

function setup() {
  const saveRevision = vi.fn(async () => true);
  const r = renderHook(
    ({ snapshot }: { snapshot: Form }) =>
      useEditorAutoSave<Form>({ entityType: "work", entityId: "w1", snapshot, getTitle: () => snapshot.title, saveRevision, debounceMs: 3000 }),
    { initialProps: { snapshot: { title: "t", content: "<p>본문</p>" } } },
  );
  return { r, saveRevision };
}

describe("useEditorAutoSave — 열기만 했을 때", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("사용자가 아무것도 하기 전의 변경은 저장하지 않는다", async () => {
    const { r, saveRevision } = setup();
    // 편집기가 마운트하며 HTML 을 다듬어 올린 것처럼 — 10자 넘게 달라진다
    r.rerender({ snapshot: { title: "t", content: '<p style="line-height: 1.6">본문</p><p>​</p>' } });
    await act(async () => { vi.advanceTimersByTime(4000); });
    expect(saveRevision).not.toHaveBeenCalled();
  });

  it("키를 누른 뒤의 변경은 저장한다", async () => {
    const { r, saveRevision } = setup();
    r.rerender({ snapshot: { title: "t", content: '<p style="line-height: 1.6">본문</p>' } });
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "a" }));
    r.rerender({ snapshot: { title: "t", content: '<p style="line-height: 1.6">본문에 글자를 여러 개 더했다</p>' } });
    await act(async () => { vi.advanceTimersByTime(4000); });
    expect(saveRevision).toHaveBeenCalledTimes(1);
  });

  it("아무것도 하지 않고 떠나면 sendBeacon 으로 저장하지 않는다", () => {
    const beacon = vi.fn(() => true);
    Object.defineProperty(navigator, "sendBeacon", { value: beacon, configurable: true });
    const { r } = setup();
    r.rerender({ snapshot: { title: "t", content: '<p style="line-height: 1.6">본문</p><p>​</p>' } });
    window.dispatchEvent(new Event("beforeunload"));
    r.unmount();
    expect(beacon).not.toHaveBeenCalled();
  });
});
