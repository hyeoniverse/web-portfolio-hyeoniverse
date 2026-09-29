// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { pushNarrationHistory, readNarrationHistory, removeNarrationHistory } from "@/lib/narrationHistory";

describe("narrationHistory", () => {
  it("최근 것을 앞에 두고, 같은 주소는 앞으로 옮기고, 10개까지만 둔다", () => {
    for (let i = 0; i < 12; i++) pushNarrationHistory("s1", { audio: `a${i}.mp3`, at: i });
    expect(readNarrationHistory("s1")).toHaveLength(10);
    expect(readNarrationHistory("s1")[0].audio).toBe("a11.mp3");
    pushNarrationHistory("s1", { audio: "a5.mp3", at: 99 });
    expect(readNarrationHistory("s1")[0]).toMatchObject({ audio: "a5.mp3", at: 99 });
    expect(readNarrationHistory("s1").filter((e) => e.audio === "a5.mp3")).toHaveLength(1);
    expect(JSON.parse(localStorage.getItem("gallery.narrationHistory")!).s1).toHaveLength(10);
  });

  it("빼면 그 장 이력에서만 사라진다", () => {
    pushNarrationHistory("s2", { audio: "b.mp3", at: 1 });
    removeNarrationHistory("s2", "b.mp3");
    expect(readNarrationHistory("s2")).toEqual([]);
    expect(readNarrationHistory("s1").length).toBeGreaterThan(0);
  });
});
