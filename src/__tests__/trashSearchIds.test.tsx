import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTrashSearchIds } from "@/hooks/useTrashSearchIds";

/* 휴지통 검색 — 목록에는 본문이 없어서, 검색어에 맞는 id 를 서버에 물어 거른다(#1109) */

const fetchMock = vi.fn(async (url: string) => {
  const q = new URL(url, "http://local").searchParams.get("search");
  const ids = q === "qr" ? ["a", "c"] : [];
  return new Response(JSON.stringify({ works: ids.map((id) => ({ id })) }), { status: 200 });
});

describe("useTrashSearchIds", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    fetchMock.mockClear();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("검색어가 비었으면 거르지 않고(null) 서버에 묻지 않는다", () => {
    const { result } = renderHook(() => useTrashSearchIds("/api/works", "  ", "all", 0));
    expect(result.current).toBeNull();
    vi.advanceTimersByTime(1000);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("입력을 멈추면 휴지통·검색 조건으로 묻고, 맞는 id 만 돌려준다", async () => {
    const { result } = renderHook(() => useTrashSearchIds("/api/works", "qr", "content", 3));
    /* 결과가 오기 전에는 거르지 않는다 — 목록이 비었다 찼다 하지 않게 */
    expect(result.current).toBeNull();
    await act(async () => { await vi.advanceTimersByTimeAsync(300); });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = new URL(String(fetchMock.mock.calls[0][0]), "http://local");
    expect(url.pathname).toBe("/api/works");
    expect(url.searchParams.get("trash")).toBe("true");
    expect(url.searchParams.get("searchType")).toBe("content");
    expect([...(result.current ?? [])].sort()).toEqual(["a", "c"]);
  });

  it("빠르게 이어 치면 마지막 검색어로 한 번만 묻는다", async () => {
    const { rerender } = renderHook(({ q }) => useTrashSearchIds("/api/works", q, "all", 0), { initialProps: { q: "q" } });
    rerender({ q: "qr" });
    await act(async () => { await vi.advanceTimersByTimeAsync(300); });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(new URL(String(fetchMock.mock.calls[0][0]), "http://local").searchParams.get("search")).toBe("qr");
  });
});
