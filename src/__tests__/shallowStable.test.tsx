import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useShallowStable } from "@/hooks/useShallowStable";

/* 글 편집기는 폼에서 본문만 뺀 값을 이 훅에 넣어, 본문만 바뀐 렌더에서는 같은 객체를 받는다(#877).
   그 객체에 기대어 메모한 섹션이 본문을 칠 때 다시 그려지지 않는다. */

function setup<T extends object>(initial: T) {
  return renderHook(({ value }) => useShallowStable(value), { initialProps: { value: initial } });
}

describe("useShallowStable", () => {
  it("키마다 값이 같으면 새 객체를 넣어도 처음 객체를 돌려준다", () => {
    const tags = ["a"];
    const first = { title: "제목", tags };
    const r = setup(first);
    r.rerender({ value: { title: "제목", tags } });
    r.rerender({ value: { title: "제목", tags } });
    expect(r.result.current).toBe(first);
  });

  it("값 하나가 바뀌면 새 객체를 돌려주고, 그 뒤로는 그 객체를 지킨다", () => {
    const r = setup({ title: "제목", slug: "a" });
    const changed = { title: "제목", slug: "b" };
    r.rerender({ value: changed });
    expect(r.result.current).toBe(changed);
    r.rerender({ value: { title: "제목", slug: "b" } });
    expect(r.result.current).toBe(changed);
  });

  it("배열은 참조로 견준다 — 같은 내용이어도 새 배열이면 바뀐 것이다", () => {
    const r = setup({ tags: ["a"] });
    const next = { tags: ["a"] };
    r.rerender({ value: next });
    expect(r.result.current).toBe(next);
  });

  it("키가 늘거나 줄면 바뀐 것이다", () => {
    const r = setup<Record<string, string>>({ title: "제목" });
    const next = { title: "제목", slug: "a" };
    r.rerender({ value: next });
    expect(r.result.current).toBe(next);
  });
});
