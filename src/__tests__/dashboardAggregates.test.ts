import { describe, it, expect } from "vitest";
import {
  aggregateCategoriesAndTags,
  aggregateTraffic,
  fillDailyViews,
  kstDateStr,
  type PostAggRow,
  type VisitRow,
} from "@/lib/api/dashboardAggregates";

/* 이 집계들은 /api/admin/dashboard 의 GET 핸들러 안에 인라인으로 있어서 테스트할 방법이
   없었다(#696 5-5). 밖으로 꺼내면서 지금 동작을 여기에 박아 둔다. */

const post = (category: string | null, tags: string[] | null, views: number | null): PostAggRow =>
  ({ category, tags, view_count: views });

describe("aggregateCategoriesAndTags", () => {
  it("카테고리별로 글 수와 조회수를 더한다", () => {
    const { categories } = aggregateCategoriesAndTags([
      post("개발", null, 10),
      post("개발", null, 5),
      post("회고", null, 3),
    ]);
    expect(categories).toEqual([
      { name: "개발", postCount: 2, views: 15 },
      { name: "회고", postCount: 1, views: 3 },
    ]);
  });

  it("조회수가 같으면 글이 많은 쪽이 앞", () => {
    const { categories } = aggregateCategoriesAndTags([
      post("A", null, 10),
      post("B", null, 5),
      post("B", null, 5),
    ]);
    expect(categories.map((c) => c.name)).toEqual(["B", "A"]);
  });

  it("category 가 없는 글은 카테고리 집계에서 빠지지만 태그는 센다", () => {
    const { categories, tags } = aggregateCategoriesAndTags([post(null, ["ts"], 1)]);
    expect(categories).toEqual([]);
    expect(tags).toEqual([{ tag: "ts", count: 1 }]);
  });

  it("view_count 가 null 이면 0 으로 센다", () => {
    const { categories } = aggregateCategoriesAndTags([post("개발", null, null)]);
    expect(categories[0].views).toBe(0);
  });

  it("카테고리 6개·태그 12개까지만", () => {
    const rows = Array.from({ length: 20 }, (_, i) =>
      post(`c${i}`, [`t${i}`], 100 - i),
    );
    const { categories, tags } = aggregateCategoriesAndTags(rows);
    expect(categories).toHaveLength(6);
    expect(tags).toHaveLength(12);
  });

  it("빈 입력", () => {
    expect(aggregateCategoriesAndTags([])).toEqual({ categories: [], tags: [] });
  });
});

const visit = (o: Partial<VisitRow> = {}): VisitRow => ({
  referrer: null, device_kind: null, os: null, browser: null, device_model: null, ...o,
});

describe("aggregateTraffic", () => {
  it("유입 경로를 많은 순으로 세고 전체 대비 비율을 낸다", () => {
    const { referrers } = aggregateTraffic([
      visit({ referrer: "google" }),
      visit({ referrer: "google" }),
      visit({ referrer: "naver" }),
      visit(),
    ]);
    expect(referrers).toEqual([
      { source: "google", count: 2, pct: 50 },
      { source: "naver", count: 1, pct: 25 },
    ]);
  });

  it("기기는 세 종류를 정해진 순서로, 0건은 뺀다", () => {
    const { devices } = aggregateTraffic([
      visit({ device_kind: "mobile" }),
      visit({ device_kind: "desktop" }),
      visit({ device_kind: "desktop" }),
    ]);
    expect(devices).toEqual([
      { kind: "desktop", count: 2, pct: 67 },
      { kind: "mobile", count: 1, pct: 33 },
    ]);
  });

  it("기기 모델의 비율 분모는 전체가 아니라 그 기기 종류의 방문 수다", () => {
    const { deviceModels } = aggregateTraffic([
      visit({ device_kind: "mobile", device_model: "iPhone" }),
      visit({ device_kind: "desktop" }),
      visit({ device_kind: "desktop" }),
      visit({ device_kind: "desktop" }),
    ]);
    // mobile 방문은 1건뿐이므로 iPhone 은 그 안에서 100% 다 (전체 4건 기준 25% 가 아니라).
    expect(deviceModels.mobile).toEqual([{ model: "iPhone", count: 1, pct: 100 }]);
    expect(deviceModels.desktop).toEqual([]);
  });

  it("모르는 device_kind 의 모델은 버린다", () => {
    const { deviceModels } = aggregateTraffic([
      visit({ device_kind: "watch", device_model: "Galaxy Watch" }),
    ]);
    expect(deviceModels).toEqual({ desktop: [], mobile: [], tablet: [] });
  });

  it("빈 입력이면 모든 목록이 비어 있다", () => {
    const t = aggregateTraffic([]);
    expect(t.referrers).toEqual([]);
    expect(t.devices).toEqual([]);
    expect(t.operatingSystems).toEqual([]);
    expect(t.browsers).toEqual([]);
    expect(t.deviceModels).toEqual({ desktop: [], mobile: [], tablet: [] });
  });
});

describe("fillDailyViews", () => {
  const today = new Date("2026-03-10T05:00:00Z"); // KST 로 2026-03-10 14시

  it("빈 날짜를 0 으로 채우고 오래된 날짜부터 준다", () => {
    const out = fillDailyViews([{ day: "2026-03-09", views: 7 }], 3, today);
    expect(out).toEqual([
      { day: "2026-03-08", views: 0 },
      { day: "2026-03-09", views: 7 },
      { day: "2026-03-10", views: 0 },
    ]);
  });

  it("요청한 일수만큼 정확히 준다", () => {
    expect(fillDailyViews([], 90, today)).toHaveLength(90);
  });

  it("범위 밖 날짜는 무시한다", () => {
    const out = fillDailyViews([{ day: "2020-01-01", views: 99 }], 2, today);
    expect(out.every((d) => d.views === 0)).toBe(true);
  });

  it("views 가 숫자가 아니면 0", () => {
    const out = fillDailyViews([{ day: "2026-03-10", views: "x" as unknown as number }], 1, today);
    expect(out[0].views).toBe(0);
  });

  it("KST 경계 — UTC 로는 전날이어도 KST 기준 날짜를 쓴다", () => {
    // UTC 2026-03-09 16:00 = KST 2026-03-10 01:00
    const boundary = new Date("2026-03-09T16:00:00Z");
    expect(kstDateStr(boundary)).toBe("2026-03-10");
    expect(fillDailyViews([], 1, boundary)[0].day).toBe("2026-03-10");
  });
});
