// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { articleSegments, expandTable } from "@/lib/articleSpeech";

/* 표 읽기 — 작은 표는 행마다 머리글을 붙여 읽고, 큰 표는 크기만 알렸다가 누르면 행으로 펼친다 */
function table(rows: number, cols: number): string {
  const head = `<thead><tr>${Array.from({ length: cols }, (_, c) => `<th>머리${c + 1}</th>`).join("")}</tr></thead>`;
  const body = Array.from({ length: rows }, (_, r) => `<tr>${Array.from({ length: cols }, (_, c) => `<td>값${r + 1}-${c + 1}</td>`).join("")}</tr>`).join("");
  return `<table>${head}<tbody>${body}</tbody></table>`;
}

describe("articleSegments — 표", () => {
  beforeEach(() => {
    /* jsdom 은 상자를 그리지 않아 모든 요소가 안 보이는 것으로 나온다 — 보이는 것으로 친다 */
    vi.spyOn(Element.prototype, "getClientRects").mockReturnValue([{}] as unknown as DOMRectList);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = "";
  });

  it("작은 표는 크기를 알린 뒤 행마다 머리글: 값 으로 읽는다", () => {
    document.body.innerHTML = `<div class="prose-content" lang="ko">${table(2, 2)}</div>`;
    const segs = articleSegments("제목");
    const texts = segs.filter((s) => s.kind === "table" || s.kind === "tableRow").map((s) => s.text);
    expect(texts).toEqual(["표, 2행 2열.", "1행. 머리1: 값1-1, 머리2: 값1-2", "2행. 머리1: 값2-1, 머리2: 값2-2"]);
    expect(segs.find((s) => s.kind === "tableRow")?.el.tagName).toBe("TR");
  });

  it("큰 표는 크기만 알리고, 펼치면 행 조각이 그 자리에 들어간다", () => {
    document.body.innerHTML = `<div class="prose-content" lang="ko"><p>앞 문단</p>${table(9, 2)}<p>뒤 문단</p></div>`;
    const segs = articleSegments("제목");
    const i = segs.findIndex((s) => s.kind === "table");
    expect(segs[i].text).toBe("9행 2열 표. 표를 누르면 행마다 읽습니다.");
    expect(segs.some((s) => s.kind === "tableRow")).toBe(false);

    const expanded = expandTable(segs, i);
    expect(expanded[i].text).toBe("표, 9행 2열.");
    expect(expanded.slice(i + 1, i + 10).every((s) => s.kind === "tableRow")).toBe(true);
    expect(expanded[i + 10].text).toBe("뒤 문단");
    /* 두 번 펼쳐도 그대로 */
    expect(expandTable(expanded, i)).toBe(expanded);
  });
});
