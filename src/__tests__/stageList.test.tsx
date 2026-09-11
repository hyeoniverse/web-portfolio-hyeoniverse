import { describe, it, expect } from "vitest";
import { useState } from "react";
import { renderHook, act } from "@testing-library/react";
import { useStageList } from "@/app/admin/(dashboard)/settings/_components/about/studio/stageList";

/* 한 번에 한 항목씩 편집하는 About 목록(Backend·User Flow 등)의 상태.
   저장값(value)과 화면에 보이는 목록(items)을 따로 본다 — 새 항목은 처음 고칠 때까지 저장값에 없어야 한다. */

type Item = { name: string };

function setup(initial: string[], cur = 0) {
  const r = renderHook(() => {
    const [value, setValue] = useState<Item[]>(initial.map((name) => ({ name })));
    return { value, list: useStageList(value, setValue, () => ({ name: "" })) };
  });
  if (cur) act(() => r.result.current.list.select(cur));
  const names = () => r.result.current.value.map((x) => x.name);
  return { r, names };
}

describe("useStageList", () => {
  it("추가하면 초안을 보여 주지만 저장값에는 넣지 않는다", () => {
    const { r, names } = setup(["a", "b"]);
    act(() => r.result.current.list.add());
    const { list } = r.result.current;
    expect(list.items).toHaveLength(3);
    expect(list.cur).toBe(2);
    expect(list.isDraft).toBe(true);
    expect(names()).toEqual(["a", "b"]);
  });

  it("초안을 처음 고치면 그때 목록 끝에 들어가고 그 항목을 계속 본다", () => {
    const { r, names } = setup(["a", "b"]);
    act(() => r.result.current.list.add());
    act(() => r.result.current.list.set({ name: "c" }));
    expect(names()).toEqual(["a", "b", "c"]);
    expect(r.result.current.list.cur).toBe(2);
    expect(r.result.current.list.isDraft).toBe(false);
    /* 이어서 고치면 방금 넣은 항목을 고친다 — 또 붙이지 않는다 */
    act(() => r.result.current.list.set({ name: "cc" }));
    expect(names()).toEqual(["a", "b", "cc"]);
  });

  it("손대지 않은 초안은 다른 항목으로 가면 버린다", () => {
    const { r, names } = setup(["a", "b"]);
    act(() => r.result.current.list.add());
    act(() => r.result.current.list.select(0));
    expect(r.result.current.list.items).toHaveLength(2);
    expect(r.result.current.list.hasDraft).toBe(false);
    expect(names()).toEqual(["a", "b"]);
  });

  it("비워진 기존 항목은 다른 항목으로 가도 지우지 않는다", () => {
    const { r, names } = setup(["a", "b"], 1);
    act(() => r.result.current.list.set({ name: "" }));
    act(() => r.result.current.list.select(0));
    expect(names()).toEqual(["a", ""]);
  });

  it("삭제는 초안이면 초안만 버리고, 기존 항목이면 지운 뒤 앞 항목을 본다", () => {
    const { r, names } = setup(["a", "b", "c"], 2);
    act(() => r.result.current.list.add());
    act(() => r.result.current.list.remove());
    expect(names()).toEqual(["a", "b", "c"]);
    expect(r.result.current.list.cur).toBe(2);
    act(() => r.result.current.list.remove());
    expect(names()).toEqual(["a", "b"]);
    expect(r.result.current.list.cur).toBe(1);
  });

  it("순서를 바꿔도 보던 항목을 계속 본다", () => {
    const cases: [from: number, to: number, cur: number, expectCur: number][] = [
      [1, 3, 1, 3], // 보던 항목을 옮김
      [0, 3, 1, 0], // 앞 항목이 뒤로 가면 한 칸 당겨짐
      [3, 0, 1, 2], // 뒤 항목이 앞으로 오면 한 칸 밀림
      [2, 3, 0, 0], // 상관없는 자리
    ];
    for (const [from, to, cur, expectCur] of cases) {
      const { r } = setup(["a", "b", "c", "d"], cur);
      const viewed = r.result.current.list.it.name;
      act(() => r.result.current.list.move(from, to));
      expect(r.result.current.list.cur).toBe(expectCur);
      expect(r.result.current.list.it.name).toBe(viewed);
    }
  });
});
