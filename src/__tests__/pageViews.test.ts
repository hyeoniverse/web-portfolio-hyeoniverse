import { describe, expect, it, vi } from "vitest";
import { clampDuration, isPageViewId, isSessionId, normalizePagePath, PAGE_VIEW_SESSION_MS } from "@/lib/pageViews";
import { createPageViewTracker, type PageViewTrackerDeps } from "@/lib/pageViewTracker";
import { parsePageViewStats } from "@/lib/api/pageViewStats";
import { isSiteStaff, PERM } from "@/lib/api/roles";
import { formatDwell } from "@/utils/format";

describe("normalizePagePath", () => {
  it("쿼리 · 해시 · 끝의 / 를 뗀다", () => {
    expect(normalizePagePath("/posts/hello/?a=1#x")).toBe("/posts/hello");
    expect(normalizePagePath("/")).toBe("/");
    expect(normalizePagePath("/?utm_source=x")).toBe("/");
  });
  it("관리 화면 · API · 이상한 값은 기록하지 않는다", () => {
    expect(normalizePagePath("/admin")).toBeNull();
    expect(normalizePagePath("/admin/posts")).toBeNull();
    expect(normalizePagePath("/api/visits")).toBeNull();
    expect(normalizePagePath("//evil.com")).toBeNull();
    expect(normalizePagePath("posts")).toBeNull();
    expect(normalizePagePath(42)).toBeNull();
  });
  it("/administrator 처럼 앞만 같은 경로는 기록한다", () => {
    expect(normalizePagePath("/administrator")).toBe("/administrator");
  });
  it("200자에서 자른다", () => {
    expect(normalizePagePath("/" + "a".repeat(300))).toHaveLength(200);
  });
});

describe("값 검사", () => {
  it("세션 id · 조회 id · 머문 시간", () => {
    expect(isSessionId("3b241101-e2bb-4255-8caf-4136c566a962")).toBe(true);
    expect(isSessionId("x")).toBe(false);
    expect(isSessionId("a b c d e f g h")).toBe(false);
    expect(isPageViewId("3b241101-e2bb-4255-8caf-4136c566a962")).toBe(true);
    expect(isPageViewId("not-a-uuid")).toBe(false);
    expect(clampDuration(100)).toBeNull();
    expect(clampDuration(1234.6)).toBe(1235);
    expect(clampDuration(10 * 60 * 60 * 1000)).toBe(2 * 60 * 60 * 1000);
    expect(clampDuration(Number.NaN)).toBeNull();
  });
});

function setup(overrides: Partial<PageViewTrackerDeps> = {}) {
  let t = 1_000_000;
  let visible = true;
  let saved: { id: string; at: number } | null = null;
  let n = 0;
  const records: Array<{ path: string; session: string; resolve: (id: string | null) => void }> = [];
  const beacons: Array<[string, number]> = [];
  const tracker = createPageViewTracker({
    record: (path, session) => new Promise((resolve) => records.push({ path, session, resolve })),
    beacon: (id, ms) => beacons.push([id, ms]),
    now: () => t,
    isVisible: () => visible,
    loadSession: () => saved,
    saveSession: (s) => { saved = s; },
    newId: () => `session-${++n}`,
    ...overrides,
  });
  return {
    tracker,
    records,
    beacons,
    advance: (ms: number) => { t += ms; },
    setVisible: (v: boolean) => { visible = v; },
  };
}

const flush = () => new Promise((r) => setTimeout(r, 0));

describe("createPageViewTracker", () => {
  it("페이지를 옮기면 앞 페이지의 머문 시간을 보낸다", async () => {
    const s = setup();
    s.tracker.view("/");
    s.records[0].resolve("id-home");
    await flush();
    s.advance(5000);
    s.tracker.view("/posts");
    expect(s.beacons).toEqual([["id-home", 5000]]);
    expect(s.records.map((r) => r.path)).toEqual(["/", "/posts"]);
  });

  it("가려져 있던 시간은 빼고 센다", async () => {
    const s = setup();
    s.tracker.view("/about");
    s.records[0].resolve("id-about");
    await flush();
    s.advance(3000);
    s.setVisible(false);
    s.tracker.hide();
    s.advance(60_000);
    s.setVisible(true);
    s.tracker.show();
    s.advance(2000);
    s.tracker.leave();
    expect(s.beacons).toEqual([["id-about", 3000], ["id-about", 2000]]);
  });

  it("기록 응답이 오기 전에 떠나면 쌓아 두었다가 id 가 오면 보낸다", async () => {
    const s = setup();
    s.tracker.view("/works");
    s.advance(4000);
    s.tracker.view("/profile");
    expect(s.beacons).toEqual([]);
    s.records[0].resolve("id-works");
    await flush();
    expect(s.beacons).toEqual([["id-works", 4000]]);
  });

  it("서버가 기록하지 않았으면(id 없음) 시간도 보내지 않는다", async () => {
    const s = setup();
    s.tracker.view("/");
    s.records[0].resolve(null);
    await flush();
    s.advance(5000);
    s.tracker.leave();
    expect(s.beacons).toEqual([]);
  });

  it("같은 경로로 다시 오면(쿼리만 바뀜) 새로 기록하지 않는다", () => {
    const s = setup();
    s.tracker.view("/posts");
    s.tracker.view("/posts?category=dev");
    expect(s.records).toHaveLength(1);
  });

  it("관리 화면으로 가면 앞 페이지를 닫고 기록하지 않는다", async () => {
    const s = setup();
    s.tracker.view("/");
    s.records[0].resolve("id-home");
    await flush();
    s.advance(1500);
    s.tracker.view("/admin");
    expect(s.beacons).toEqual([["id-home", 1500]]);
    expect(s.records).toHaveLength(1);
  });

  it("30분 넘게 아무것도 안 보면 새 세션", () => {
    const s = setup();
    s.tracker.view("/");
    s.advance(10 * 60 * 1000);
    s.tracker.view("/posts");
    s.advance(PAGE_VIEW_SESSION_MS + 1);
    s.tracker.view("/works");
    expect(s.records.map((r) => r.session)).toEqual(["session-1", "session-1", "session-2"]);
  });

  it("짧게 스친 페이지(0.5초 미만)는 시간을 보내지 않는다", async () => {
    const s = setup();
    s.tracker.view("/");
    s.records[0].resolve("id-home");
    await flush();
    s.advance(200);
    s.tracker.view("/posts");
    expect(s.beacons).toEqual([]);
  });

  it("기록이 실패해도 던지지 않는다", async () => {
    const record = vi.fn().mockRejectedValue(new Error("offline"));
    const s = setup({ record });
    s.tracker.view("/");
    await flush();
    s.advance(3000);
    expect(() => s.tracker.leave()).not.toThrow();
  });
});

describe("parsePageViewStats", () => {
  it("jsonb 를 화면 모양으로 — 숫자 문자열 · 빈 값", () => {
    expect(parsePageViewStats({
      total: 12,
      avg_duration_ms: 4500,
      sessions: 3,
      pages_per_session: "4.0",
      avg_session_ms: null,
      top_paths: [{ path: "/", views: 8, avg_ms: 3000 }, { path: 1 }, { path: "/about", views: 4, avg_ms: null }],
    })).toEqual({
      total: 12,
      avgDurationMs: 4500,
      sessions: 3,
      pagesPerSession: 4,
      avgSessionMs: null,
      topPaths: [{ path: "/", views: 8, avgMs: 3000 }, { path: "/about", views: 4, avgMs: null }],
    });
  });
});

describe("isSiteStaff", () => {
  it("owner · admin 만 사이트 운영자, 작성자는 아니다", () => {
    expect(isSiteStaff({ role: "owner", level: Number.POSITIVE_INFINITY, authorId: null, isOwner: true })).toBe(true);
    expect(isSiteStaff({ role: "author", level: PERM.ADMIN, authorId: "a", isOwner: false })).toBe(true);
    expect(isSiteStaff({ role: "author", level: PERM.AUTHOR, authorId: "a", isOwner: false })).toBe(false);
    expect(isSiteStaff({ role: null, level: 0, authorId: null, isOwner: false })).toBe(false);
  });
});

describe("formatDwell", () => {
  it("초 · 분 초 · 시간 분", () => {
    expect(formatDwell(4_400, "ko")).toBe("4초");
    expect(formatDwell(83_000, "ko")).toBe("1분 23초");
    expect(formatDwell(83_000, "en")).toBe("1m 23s");
    expect(formatDwell(3_900_000, "en")).toBe("1h 5m");
    expect(formatDwell(-5, "ko")).toBe("0초");
  });
});
