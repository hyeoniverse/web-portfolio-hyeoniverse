import { describe, it, expect, beforeEach } from "vitest";
import { useEffect } from "react";
import { render, act } from "@testing-library/react";
import { useRecentColors } from "@/components/posts/plate/useRecentColors";

/* 상단 툴바와 떠 있는 툴바가 같은 최근색을 본다(#1117). 예전에는 도구마다 useState 로 따로 들고 있어
   한쪽에서 고른 색이 다른 쪽에는 페이지를 다시 열 때까지 나타나지 않았다. */

let seen: Record<string, string[]> = {};
let add: Record<string, (c: string) => void> = {};
const report = (name: string, colors: string[], addColor: (c: string) => void) => {
  seen[name] = colors;
  add[name] = addColor;
};

function Probe({ name, storageKey, onValue }: { name: string; storageKey: string; onValue: typeof report }) {
  const { colors, addColor } = useRecentColors(storageKey);
  useEffect(() => { onValue(name, colors, addColor); }, [name, colors, addColor, onValue]);
  return null;
}

describe("최근 색 공유", () => {
  beforeEach(() => {
    seen = {};
    add = {};
  });

  it("같은 key 의 두 도구가 한 목록을 본다", () => {
    const key = `share-${Math.random()}`;
    render(<><Probe onValue={report} name="main" storageKey={key} /><Probe onValue={report} name="float" storageKey={key} /></>);
    act(() => add.float("#ef4444"));
    expect(seen.main).toEqual(["#ef4444"]);
    expect(seen.float).toEqual(["#ef4444"]);
    expect(JSON.parse(localStorage.getItem(`editor-recent-colors:${key}`) ?? "[]")).toEqual(["#ef4444"]);
  });

  it("다시 쓴 색은 맨 앞으로 오고, 8개까지만 남는다", () => {
    const key = `order-${Math.random()}`;
    render(<Probe onValue={report} name="a" storageKey={key} />);
    act(() => { for (let i = 0; i < 9; i++) add.a(`#00000${i}`); });
    expect(seen.a).toHaveLength(8);
    expect(seen.a[0]).toBe("#000008");
    act(() => add.a("#000005"));
    expect(seen.a[0]).toBe("#000005");
    expect(seen.a.filter((c) => c === "#000005")).toHaveLength(1);
  });

  it("key 가 다르면 섞이지 않는다", () => {
    const k1 = `text-${Math.random()}`;
    const k2 = `bg-${Math.random()}`;
    render(<><Probe onValue={report} name="text" storageKey={k1} /><Probe onValue={report} name="bg" storageKey={k2} /></>);
    act(() => add.text("#3b82f6"));
    expect(seen.text).toEqual(["#3b82f6"]);
    expect(seen.bg).toEqual([]);
  });
});
