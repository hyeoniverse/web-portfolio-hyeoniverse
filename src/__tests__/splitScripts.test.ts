// @vitest-environment node
import { describe, expect, it } from "vitest";
import { planScripts, serializeScripts, splitScriptSections, splitScripts } from "@/lib/splitScripts";

describe("splitScripts", () => {
  it("--- 줄로 나눈다", () => {
    expect(splitScripts("첫 장\n\n둘째 문단\n---\n둘째 장\n---\n\n")).toEqual(["첫 장\n\n둘째 문단", "둘째 장"]);
  });

  it("마크다운 제목으로 나누고 제목 줄은 뺀다", () => {
    expect(splitScripts("# 발표 대본\n\n## 01 표지\n안녕하세요.\n\n## 02 요약\n세 가지입니다.\n")).toEqual(["안녕하세요.", "세 가지입니다."]);
  });

  it("구분이 없으면 빈 줄로 나눈다", () => {
    expect(splitScripts("하나\n\n\n둘\r\n\r\n셋")).toEqual(["하나", "둘", "셋"]);
  });

  it("빈 글은 빈 배열", () => {
    expect(splitScripts("  \n\n ")).toEqual([]);
  });
});

describe("splitScriptSections / planScripts", () => {
  it("제목의 첫 숫자를 장 번호로 읽는다", async () => {
    const { splitScriptSections } = await import("@/lib/splitScripts");
    expect(splitScriptSections("# 발표 대본\n\n## 03 요약\n셋\n\n## Slide 1 — 표지\n하나")).toEqual([
      { text: "셋", slide: 3 },
      { text: "하나", slide: 1 },
    ]);
  });

  it("모두 번호가 있으면 번호대로, 범위를 넘는 번호는 뺀다", async () => {
    const { planScripts } = await import("@/lib/splitScripts");
    const plan = planScripts([{ text: "c", slide: 3 }, { text: "a", slide: 1 }, { text: "z", slide: 30 }], 19);
    expect(plan.byNumber).toBe(true);
    expect(plan.items).toEqual([{ slide: 1, text: "a" }, { slide: 3, text: "c" }]);
    expect(plan.skipped).toBe(1);
  });

  it("번호가 하나라도 없으면 차례대로", async () => {
    const { planScripts } = await import("@/lib/splitScripts");
    const plan = planScripts([{ text: "a", slide: 5 }, { text: "b" }, { text: "c" }], 2);
    expect(plan.byNumber).toBe(false);
    expect(plan.items).toEqual([{ slide: 1, text: "a" }, { slide: 2, text: "b" }]);
    expect(plan.skipped).toBe(1);
  });
});

describe("serializeScripts", () => {
  it("지금 대본을 장 번호 제목으로 적고, 되돌리면 같은 장에 같은 대본이 간다", () => {
    const gallery = ["a", "b", "c"];
    const scripts: Record<string, string | undefined> = { a: "첫 장입니다.", c: "셋째 장\n두 문단" };
    const text = serializeScripts(gallery, (url) => scripts[url]);
    expect(text).toBe("## 01\n첫 장입니다.\n\n## 02\n\n## 03\n셋째 장\n두 문단");
    const plan = planScripts(splitScriptSections(text), gallery.length);
    expect(plan.byNumber).toBe(true);
    expect(plan.items).toEqual([{ slide: 1, text: "첫 장입니다." }, { slide: 3, text: "셋째 장\n두 문단" }]);
    expect(plan.skipped).toBe(0);
  });

  it("대본이 하나도 없으면 제목만 남고 넣을 조각은 없다", () => {
    const text = serializeScripts(["a", "b"], () => undefined);
    expect(text).toBe("## 01\n\n## 02");
    expect(planScripts(splitScriptSections(text), 2).items).toEqual([]);
  });
});

