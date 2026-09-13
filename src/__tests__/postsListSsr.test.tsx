import { describe, it, expect, afterEach, vi } from "vitest";
import { renderHook, act, cleanup, waitFor } from "@testing-library/react";
import { useRef, useState } from "react";
import { listPointsAway, LIST_PENDING_ATTR, LIST_PENDING_SCRIPT } from "@/app/posts/_hooks/postsListUrl";
import { usePostsQuery } from "@/app/posts/_hooks/usePostsQuery";
import { ROW_SPANS_SCRIPT, useMasonryRowSpans } from "@/app/posts/_hooks/useMasonryRowSpans";
import { usePageControls } from "@/hooks/usePageControls";
import { siteDateParts } from "@/utils/siteDate";
import type { InitialPostsData } from "@/lib/posts";

/* 글 목록은 필터 없는 1쪽을 미리 그린다(#925). 첫 렌더는 그 HTML 과 같게 기본값으로 그리고, 주소의 필터·쪽 번호는 마운트 직후
   옮겨 다시 받는다. 주소가 기본 목록과 다르면 하이드레이션 전 스크립트가 목록을 가리고, magazine 배치의 줄 수도 스크립트가
   먼저 넣는다. 두 스크립트는 훅과 같은 함수를 문자열로 쓰므로, 스크립트만 따로 돌려도 같은 결과인지 본다. */

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  document.documentElement.removeAttribute(LIST_PENDING_ATTR);
  document.body.innerHTML = "";
  window.history.replaceState(null, "", "/");
});

describe("주소가 기본 목록과 다른가", () => {
  it("필터가 있거나 2쪽 이상이면 다르고, 빈 값·1쪽·정렬만 있으면 같다", () => {
    for (const q of ["", "?page=1", "?tag=", "?sort=popular", "?page=abc"]) expect(listPointsAway(q), q).toBe(false);
    for (const q of ["?tag=a", "?category=b", "?series=s1", "?author=x", "?q=react", "?page=2"]) expect(listPointsAway(q), q).toBe(true);
  });

  it("하이드레이션 전 스크립트도 같은 판정으로 <html> 에 표시를 붙인다", () => {
    for (const q of ["", "?page=1", "?tag=a", "?page=3"]) {
      const attrs = new Set<string>();
      const fakeDocument = { documentElement: { setAttribute: (name: string) => attrs.add(name) } };
      new Function("location", "document", LIST_PENDING_SCRIPT)({ search: q }, fakeDocument);
      expect(attrs.has(LIST_PENDING_ATTR), q).toBe(listPointsAway(q));
    }
  });
});

describe("usePageControls", () => {
  it("필터가 바뀌면 1쪽으로 되돌린다", () => {
    const { result, rerender } = renderHook(({ filter }) => usePageControls({ defaultPerPage: 10, resetOn: [filter] }), {
      initialProps: { filter: "a" },
    });
    act(() => result.current.setPage(3));
    expect(result.current.page).toBe(3);
    rerender({ filter: "b" });
    expect(result.current.page).toBe(1);
  });

  it("잠금이 풀리는 커밋에 함께 넣은 필터·쪽 번호는 되돌리지 않고, 그 뒤의 변경부터 되돌린다", () => {
    const { result } = renderHook(() => {
      const [filter, setFilter] = useState("");
      const [held, setHeld] = useState(true);
      return { ...usePageControls({ defaultPerPage: 10, resetOn: [filter], holdReset: held }), setFilter, setHeld };
    });
    // 글 목록이 주소를 옮기는 모양 — 필터·쪽 번호·잠금 해제를 한 번에
    act(() => {
      result.current.setFilter("tag");
      result.current.setPage(2);
      result.current.setHeld(false);
    });
    expect(result.current.page).toBe(2);
    act(() => result.current.setFilter("other"));
    expect(result.current.page).toBe(1);
  });
});

describe("usePostsQuery — 주소 쿼리", () => {
  const initialData = { posts: [{ id: "p1" }], totalPages: 2, allTags: [{ tag: "a", count: 1 }] } as unknown as InitialPostsData;
  const openList = () => renderHook(() => usePostsQuery({ initialData, postsLayout: "magazine", defaultPerPage: 10 }));

  function stubFetch() {
    const calls: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      calls.push(url);
      return { json: async () => ({ posts: [{ id: "p9" }], totalPages: 3 }) };
    }));
    return calls;
  }

  it("기본 주소는 미리 그린 목록을 그대로 쓰고 다시 받지 않는다", async () => {
    const calls = stubFetch();
    window.history.replaceState(null, "", "/posts");
    const { result } = openList();
    await act(() => new Promise((r) => setTimeout(r, 500)));
    expect(calls).toEqual([]);
    expect(result.current.posts.map((p) => p.id)).toEqual(["p1"]);
    expect(document.documentElement.hasAttribute(LIST_PENDING_ATTR)).toBe(false);
  });

  it("필터·쪽 번호 주소는 상태로 옮겨 한 번 받고, 받은 뒤 표시를 뗀다", async () => {
    const calls = stubFetch();
    window.history.replaceState(null, "", "/posts?tag=a,b&page=2");
    const { result } = openList();
    expect([...result.current.activeTags].sort()).toEqual(["a", "b"]);
    expect(result.current.page).toBe(2);
    expect(document.documentElement.hasAttribute(LIST_PENDING_ATTR)).toBe(true);

    await waitFor(() => expect(result.current.posts.map((p) => p.id)).toEqual(["p9"]));
    expect(calls).toHaveLength(1);
    const params = new URL(calls[0], "http://local").searchParams;
    expect(params.get("tags")).toBe("a,b");
    expect(params.get("page")).toBe("2");
    expect(document.documentElement.hasAttribute(LIST_PENDING_ATTR)).toBe(false);
    expect(new URL(window.location.href).searchParams.get("page"), "주소의 쪽 번호를 지우지 않는다").toBe("2");
  });
});

describe("한국 시간 날짜", () => {
  it("실행 환경의 시간대와 상관없이 한국 시간의 날짜로 나눈다 — 카드 날짜·타임라인 월이 서버와 같다", () => {
    const tz = process.env.TZ;
    process.env.TZ = "America/Los_Angeles";
    try {
      expect(new Date("2026-08-31T20:00:00Z").getDate(), "실행 환경 시간대로는 31일").toBe(31);
      expect(siteDateParts("2026-08-31T20:00:00Z")).toEqual({ year: 2026, month: 8, day: 1 });
      expect(siteDateParts("2026-04-27T16:00:00Z")).toEqual({ year: 2026, month: 3, day: 28 });
      expect(siteDateParts("not a date")).toBeNull();
    } finally {
      if (tz === undefined) delete process.env.TZ;
      else process.env.TZ = tz;
    }
  });
});

describe("magazine 줄 수", () => {
  function makeGrid(heights: number[]) {
    const grid = document.createElement("div");
    grid.setAttribute("data-row-spans", "true");
    for (const h of heights) {
      const item = document.createElement("div");
      const card = document.createElement("div");
      Object.defineProperty(card, "scrollHeight", { value: h });
      item.appendChild(card);
      grid.appendChild(item);
    }
    document.body.appendChild(grid);
    return grid;
  }

  it("하이드레이션 전 스크립트가 줄 수 규칙을 넣고, 훅이 이어받으면 요소로 옮기고 규칙을 치운다", () => {
    vi.stubGlobal("getComputedStyle", () => ({ rowGap: "24px" }));
    vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
    const grid = makeGrid([300, 0]);
    const fakeDocument = {
      currentScript: { parentElement: { previousElementSibling: grid } },
      createElement: document.createElement.bind(document),
      head: document.head,
    };
    new Function("document", ROW_SPANS_SCRIPT)(fakeDocument);
    // (300 + 24) / (1 + 24) 올림 = 13, 높이를 못 잰 칸은 건너뛴다
    expect(document.getElementById("posts-row-spans")?.textContent).toBe("[data-row-spans]>:nth-child(1){grid-row:span 13}");

    renderHook(() => useMasonryRowSpans(useRef(grid), true, []));
    expect((grid.children[0] as HTMLElement).style.gridRow).toBe("span 13");
    expect((grid.children[1] as HTMLElement).style.gridRow).toBe("");
    expect(document.getElementById("posts-row-spans")).toBeNull();
  });
});
