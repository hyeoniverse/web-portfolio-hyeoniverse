import { describe, it, expect } from "vitest";
import { restoreSavedForm } from "@/utils/restoreSavedForm";

/* 편집기의 초안·리비전 복원. 저장할 때 없던 칸(작업물의 핀 여부처럼 나중에 생긴 칸)이 그대로
   폼에 들어가면 그 칸을 쓰는 입력이 controlled → uncontrolled 로 바뀐다. */

type Form = { title: string; is_pinned: boolean; tags: string[] };

describe("편집기 폼 복원", () => {
  const current: Form = { title: "저장본", is_pinned: true, tags: ["a"] };

  it("저장본에 있는 값은 저장본을 따른다", () => {
    expect(restoreSavedForm(current, { title: "초안" })).toMatchObject({ title: "초안" });
  });

  it("저장본에 없는 칸은 지금 값을 그대로 둔다 — 없던 칸이 값 없음으로 바뀌지 않는다", () => {
    const restored = restoreSavedForm(current, { title: "초안" });
    expect(restored.is_pinned).toBe(true);
    expect("is_pinned" in restored).toBe(true);
  });

  it("저장본이 꺼 둔 값은 꺼진 채로 온다 — 없는 것과 false 는 다르다", () => {
    expect(restoreSavedForm(current, { title: "초안", is_pinned: false }).is_pinned).toBe(false);
  });

  it("지금 폼을 건드리지 않는다", () => {
    restoreSavedForm(current, { tags: ["b"] });
    expect(current.tags).toEqual(["a"]);
  });
});
