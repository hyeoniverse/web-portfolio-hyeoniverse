// @vitest-environment node
import { describe, it, expect } from "vitest";
import { decodePairs, isKitchenCode, isKitchenDate, kitchenImageUrl, type KitchenMeta } from "@/lib/emojiKitchen";

/* Emoji Kitchen — 조합 목록 풀기·그림 주소·입력 검사 */

const meta: KitchenMeta = {
  emojis: [{ c: "1f600", e: "😀", n: "grinning", k: "", g: 0 }, { c: "2764-fe0f", e: "❤️", n: "heart", k: "", g: 1 }, { c: "1f431", e: "🐱", n: "cat", k: "", g: 2 }],
  groups: ["smileys & emotion", "symbols", "animals & nature"],
  dates: ["20201001", "20230301"],
};

function pairsBin(rows: [number, number][][]): ArrayBuffer {
  const size = rows.reduce((a, r) => a + 2 + r.length * 3, 0);
  const view = new DataView(new ArrayBuffer(size));
  let o = 0;
  for (const r of rows) {
    view.setUint16(o, r.length, true); o += 2;
    for (const [j, b] of r) { view.setUint16(o, j, true); view.setUint8(o + 2, b); o += 3; }
  }
  return view.buffer;
}

describe("decodePairs", () => {
  it("i ≤ j 쌍을 양쪽 이모지에 넣고, 바뀜 비트로 좌우를 정한다", () => {
    // 0–0 (날짜 0), 0–1 (날짜 1, 바뀜: 그림은 1,0 순서), 1–2 (날짜 0)
    const out = decodePairs(pairsBin([[[0, 0], [1, 3]], [[2, 0]], []]), meta);
    expect(out[0]).toEqual([
      { j: 0, date: "20201001", left: "1f600", right: "1f600" },
      { j: 1, date: "20230301", left: "2764-fe0f", right: "1f600" },
    ]);
    expect(out[1].map((p) => p.j)).toEqual([0, 2]);
    expect(out[2]).toEqual([{ j: 1, date: "20201001", left: "2764-fe0f", right: "1f431" }]);
  });
});

describe("kitchenImageUrl", () => {
  it("덩어리마다 u 를 붙인다", () => {
    expect(kitchenImageUrl("20201001", "2764-fe0f", "1f600")).toBe(
      "https://www.gstatic.com/android/keyboard/emojikitchen/20201001/u2764-ufe0f/u2764-ufe0f_u1f600.png",
    );
  });
});

describe("입력 검사", () => {
  it("코드포인트·날짜 꼴만 받는다", () => {
    expect(isKitchenCode("1f600")).toBe(true);
    expect(isKitchenCode("2764-fe0f")).toBe(true);
    expect(isKitchenCode("../etc")).toBe(false);
    expect(isKitchenCode("1F600")).toBe(false);
    expect(isKitchenDate("20201001")).toBe(true);
    expect(isKitchenDate("2020-10-01")).toBe(false);
  });
});
