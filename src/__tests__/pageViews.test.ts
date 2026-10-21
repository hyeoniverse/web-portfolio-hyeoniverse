import { describe, expect, it, vi } from "vitest";
import { clampDuration, isPageViewId, isSessionId, normalizePagePath, PAGE_VIEW_SESSION_MS, parseUtm, referrerHost } from "@/lib/pageViews";
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
  it("인코딩된 한글 slug 를 풀어 둔다(글 조회수를 slug 로 맞춘다)", () => {
    expect(normalizePagePath("/posts/%ED%95%9C%EA%B8%80")).toBe("/posts/한글");
    expect(normalizePagePath("/posts/%E0%A4%A")).toBe("/posts/%E0%A4%A");
  });
  it("200자에서 자른다", () => {
    expect(normalizePagePath("/" + "a".repeat(300))).toHaveLength(200);
  });
});

describe("방문 정보", () => {
  it("UTM 은 랜딩 쿼리에서, 없으면 null", () => {
    expect(parseUtm("?utm_source=x&utm_medium=social&foo=1")).toEqual({ utm_source: "x", utm_medium: "social", utm_campaign: null });
    expect(parseUtm(undefined)).toEqual({ utm_source: null, utm_medium: null, utm_campaign: null });
  });
  it("유입 경로는 호스트만, 자기 사이트 · 빈 값은 Direct", () => {
    expect(referrerHost("https://www.google.com/search?q=a", "www.hyeoniverse.com")).toBe("google.com");
    expect(referrerHost("https://hyeoniverse.com/posts", "www.hyeoniverse.com")).toBe("Direct");
    expect(referrerHost("", "x.com")).toBe("Direct");
    expect(referrerHost("not a url")).toBe("Direct");
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

describe("analyzeJourneys", () => {
  const row = (session: string, path: string | null, at: string, ms: number | null = null, landing = false) => ({
    session_id: session, path, viewed_at: `2026-10-12T${at}:00Z`, duration_ms: ms, is_landing: landing, referrer: landing ? "google.com" : null, device_kind: landing ? "mobile" : null,
  });

  it("들어온 페이지 → 다음 페이지 · 나간 페이지 · 이탈률 · 최근 경로", async () => {
    const { analyzeJourneys } = await import("@/lib/api/visitJourneys");
    const j = analyzeJourneys([
      row("a", "/posts/x", "01:01", 60_000),
      row("a", "/", "01:00", 5_000, true),
      row("a", "/works/y", "01:02"),
      row("b", "/", "02:00", 3_000, true),
      row("b", "/posts/x", "02:01"),
      row("c", "/about", "03:00", 1_000, true),
      row("d", null, "04:00", null, true), // 경로를 모르는 옛 방문은 흐름에서 뺀다
    ]);
    expect(j.sessions).toBe(3);
    expect(j.bounceRate).toBe(33);
    expect(j.nextPages).toEqual([{ from: "/", to: "/posts/x", count: 2 }]);
    expect(j.exitPages).toEqual([
      { path: "/about", count: 1, pct: 33 },
      { path: "/posts/x", count: 1, pct: 33 },
      { path: "/works/y", count: 1, pct: 33 },
    ]);
    expect(j.recent[0].steps).toEqual([{ path: "/about", ms: 1000 }]);
    expect(j.recent[2]).toMatchObject({ referrer: "google.com", device: "mobile", steps: [{ path: "/", ms: 5000 }, { path: "/posts/x", ms: 60000 }, { path: "/works/y", ms: null }] });
  });

  it("비어 있으면 0", async () => {
    const { analyzeJourneys } = await import("@/lib/api/visitJourneys");
    expect(analyzeJourneys([])).toEqual({ sessions: 0, bounceRate: 0, nextPages: [], exitPages: [], recent: [] });
  });
});

describe("searchTerm", () => {
  it("검색 엔진 referrer 에서 검색어를 꺼낸다", async () => {
    const { searchTerm } = await import("@/lib/pageViews");
    expect(searchTerm("https://search.naver.com/search.naver?where=nexearch&query=%ED%98%84%EC%9D%B4%EB%B2%84%EC%8A%A4")).toBe("현이버스");
    expect(searchTerm("https://search.daum.net/search?w=tot&q=next.js+blog")).toBe("next.js blog");
    expect(searchTerm("https://www.bing.com/search?q=hello")).toBe("hello");
    expect(searchTerm("https://www.google.co.kr/search?q=react")).toBe("react");
    expect(searchTerm("https://www.google.com/")).toBeNull();
    expect(searchTerm("https://github.com/?q=x")).toBeNull();
    expect(searchTerm("not a url")).toBeNull();
  });
});
