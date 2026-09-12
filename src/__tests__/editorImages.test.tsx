import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useEditorImages } from "@/components/posts/plate/useEditorImages";
import type { EditorImageInfo } from "@/components/posts/plate/types";

/* 본문 첨부 이미지 목록. 편집기는 본문이 바뀔 때마다 목록을 새 배열로 돌려준다.
   내용이 같으면 상태를 그대로 두어야 편집 화면이 글자마다 한 번 더 그려지지 않는다(#850). */

const img = (url: string, path: number[], extra: Partial<EditorImageInfo> = {}): EditorImageInfo => ({ url, path, mediaType: "img", ...extra });

describe("useEditorImages", () => {
  it("내용이 같은 새 배열이면 상태를 바꾸지 않는다", () => {
    const r = renderHook(() => useEditorImages());
    act(() => r.result.current[1]([img("/a.png", [0, 1]), img("/b.png", [3])]));
    const before = r.result.current[0];
    act(() => r.result.current[1]([img("/a.png", [0, 1]), img("/b.png", [3])]));
    expect(r.result.current[0]).toBe(before);
    act(() => r.result.current[1]([]));
    act(() => r.result.current[1]([]));
    expect(r.result.current[0]).toEqual([]);
  });

  it("주소·자리·종류·떼어 둔 것 중 하나라도 다르면 새 목록으로 바꾼다", () => {
    const r = renderHook(() => useEditorImages());
    const base = [img("/a.png", [0, 1])];
    act(() => r.result.current[1](base));
    for (const next of [
      [img("/c.png", [0, 1])],
      [img("/a.png", [0, 2])],
      [img("/a.png", [0, 1], { mediaType: "video" })],
      [img("/a.png", [0, 1], { detached: true })],
      [img("/a.png", [0, 1]), img("/b.png", [4])],
    ]) {
      act(() => r.result.current[1](base));
      const prev = r.result.current[0];
      act(() => r.result.current[1](next));
      expect(r.result.current[0]).not.toBe(prev);
      expect(r.result.current[0]).toEqual(next);
    }
  });
});
