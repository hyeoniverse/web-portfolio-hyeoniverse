// @vitest-environment node
import { describe, it, expect } from "vitest";
import { buildCalendarUsage, extractCalendarIds } from "@/lib/calendarUsage";

/* 달력 관리의 "쓰는 곳" — 본문 HTML 의 data-calendar-id 로 글·프로젝트를 센다 */

describe("extractCalendarIds", () => {
  it("본문의 달력 id 를 중복 없이", () => {
    const html = '<p>a</p><div data-calendar-id="c1" style="width:50%"></div><div data-calendar-id="c2"></div><div data-calendar-id="c1"></div>';
    expect(extractCalendarIds(html)).toEqual(["c1", "c2"]);
  });

  it("옛 인라인 달력(data-calendar)·빈 본문은 없음", () => {
    expect(extractCalendarIds('<div data-calendar="{&quot;month&quot;:&quot;2026-03&quot;}"></div>')).toEqual([]);
    expect(extractCalendarIds(null)).toEqual([]);
  });
});

describe("buildCalendarUsage", () => {
  it("한·영 본문에 같은 달력이 있어도 글 하나로 센다", () => {
    const u = buildCalendarUsage(
      [
        { id: "p1", title: "봄 학기", slug: "spring", html: ['<div data-calendar-id="c1"></div>', '<div data-calendar-id="c1"></div>'] },
        { id: "p2", title: "회고", slug: "retro", html: ['<div data-calendar-id="c1"></div><div data-calendar-id="c2"></div>', null] },
      ],
      [{ id: "w1", title: "사이드", slug: "side", html: ["", '<div data-calendar-id="c2"></div>'] }],
    );
    expect(u.get("c1")).toEqual({ posts: [{ id: "p1", title: "봄 학기", slug: "spring" }, { id: "p2", title: "회고", slug: "retro" }], works: [] });
    expect(u.get("c2")?.posts.map((p) => p.id)).toEqual(["p2"]);
    expect(u.get("c2")?.works.map((w) => w.id)).toEqual(["w1"]);
    expect(u.get("c3")).toBeUndefined();
  });
});
