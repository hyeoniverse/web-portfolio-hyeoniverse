import { describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { runBulk, useLibrarySelection } from "@/app/admin/(dashboard)/settings/_components/LibrarySelection";

type It = { id: string; used: boolean };
const keyOf = (x: It) => x.id;
const canSelect = (x: It) => !x.used;

/* 라이브러리 여러 개 지우기(#1510) */
describe("라이브러리 여러 개 고르기", () => {
  it("고를 수 있는 것만 고르고, 모두 선택 · 선택 해제", () => {
    const items: It[] = [{ id: "a", used: false }, { id: "b", used: true }, { id: "c", used: false }];
    const { result } = renderHook(() => useLibrarySelection(items, keyOf, canSelect));
    expect(result.current.selectableCount).toBe(2);
    act(() => result.current.toggle(items[0], true));
    expect(result.current.count).toBe(1);
    expect(result.current.isSelected(items[0])).toBe(true);
    act(() => result.current.selectAll());
    expect(result.current.selected.map(keyOf)).toEqual(["a", "c"]);
    act(() => result.current.clear());
    expect(result.current.count).toBe(0);
  });

  it("목록에서 사라졌거나 고를 수 없게 된 것은 세지 않는다 — 지운 뒤 · 걸러 보기", () => {
    let items: It[] = [{ id: "a", used: false }, { id: "c", used: false }];
    const { result, rerender } = renderHook(() => useLibrarySelection(items, keyOf, canSelect));
    act(() => result.current.selectAll());
    expect(result.current.count).toBe(2);
    items = [{ id: "a", used: true }];
    rerender();
    expect(result.current.count).toBe(0);
    expect(result.current.isSelected(items[0])).toBe(false);
  });

  it("여러 개 처리 — 실패해도 나머지는 계속하고 실패한 것을 돌려준다(던진 것도 실패)", async () => {
    let running = 0;
    let peak = 0;
    const { ok, failed } = await runBulk([1, 2, 3, 4, 5, 6, 7], async (n) => {
      running++;
      peak = Math.max(peak, running);
      await new Promise((r) => setTimeout(r, 5));
      running--;
      if (n === 3) throw new Error("boom");
      return n % 2 === 0;
    }, 3);
    expect(ok.sort()).toEqual([2, 4, 6]);
    expect(failed.sort()).toEqual([1, 3, 5, 7]);
    expect(peak).toBeLessThanOrEqual(3);
  });
});
