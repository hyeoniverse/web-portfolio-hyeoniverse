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

/* ── 트래픽 분석 확장(#1161) ── */

import {
  aggregateChannels,
  aggregateDailyVisits,
  aggregateCountries,
  isTrafficSpike,
  pctChange,
  aggregateLandingPages,
  aggregateNewVsReturning,
  aggregateUtmCampaigns,
  aggregateVisitHeatmap,
  classifyChannel,
  type AnalyticsVisitRow,
} from "@/lib/api/dashboardAggregates";

const aRow = (over: Partial<AnalyticsVisitRow>): AnalyticsVisitRow => ({
  referrer: "Direct",
  device_kind: "desktop",
  os: null,
  browser: null,
  device_model: null,
  ...over,
});

describe("classifyChannel", () => {
  it("검색·SNS·커뮤니티·개발 도메인을 분류한다", () => {
    expect(classifyChannel("google.com")).toBe("search");
    expect(classifyChannel("t.co")).toBe("social");
    expect(classifyChannel("velog.io")).toBe("community");
    expect(classifyChannel("github.com")).toBe("dev");
  });

  it("서브도메인도 같은 채널로 분류한다", () => {
    expect(classifyChannel("search.naver.com")).toBe("search");
    expect(classifyChannel("m.search.daum.net")).toBe("search");
    expect(classifyChannel("kr.linkedin.com")).toBe("social");
  });

  it("부분 문자열로는 오인하지 않는다 — notgoogle.com 은 검색이 아니다", () => {
    expect(classifyChannel("notgoogle.com")).toBe("other");
    expect(classifyChannel("google.com.evil.io")).toBe("other");
  });

  it("Direct·빈 값·자기 사이트는 직접 방문", () => {
    expect(classifyChannel("Direct")).toBe("direct");
    expect(classifyChannel(null)).toBe("direct");
    expect(classifyChannel("hyeoniverse.com")).toBe("direct");
    expect(classifyChannel("www.hyeoniverse.com")).toBe("direct");
  });
});

describe("aggregateChannels", () => {
  it("채널로 묶고 채널 안 호스트를 드릴다운으로 준다", () => {
    const rows = [
      aRow({ referrer: "google.com" }),
      aRow({ referrer: "google.com" }),
      aRow({ referrer: "search.naver.com" }),
      aRow({ referrer: "Direct" }),
    ];
    const out = aggregateChannels(rows);
    expect(out[0]).toMatchObject({ channel: "search", count: 3, pct: 75 });
    expect(out[0].hosts).toEqual([
      { host: "google.com", count: 2, pct: 67 },
      { host: "search.naver.com", count: 1, pct: 33 },
    ]);
    // direct 는 호스트 드릴다운이 없다
    expect(out[1]).toMatchObject({ channel: "direct", count: 1, hosts: [] });
  });

  it("빈 입력이면 빈 배열", () => {
    expect(aggregateChannels([])).toEqual([]);
  });
});

describe("aggregateCountries / aggregateLandingPages", () => {
  it("country 없는 행(마이그레이션 전)은 분모에서도 뺀다", () => {
    const out = aggregateCountries([
      aRow({ country: "KR" }),
      aRow({ country: "KR" }),
      aRow({ country: "US" }),
      aRow({}),
    ]);
    expect(out).toEqual([
      { code: "KR", count: 2, pct: 67 },
      { code: "US", count: 1, pct: 33 },
    ]);
  });

  it("랜딩 경로는 뒤 슬래시를 정규화해 같은 페이지로 센다", () => {
    const out = aggregateLandingPages([
      aRow({ path: "/posts" }),
      aRow({ path: "/posts/" }),
      aRow({ path: "/" }),
      aRow({}),
    ]);
    expect(out).toEqual([
      { path: "/posts", count: 2, pct: 67 },
      { path: "/", count: 1, pct: 33 },
    ]);
  });
});

describe("aggregateVisitHeatmap", () => {
  it("KST 요일×시각으로 집계한다 — UTC 15시는 KST 다음날 0시", () => {
    // 2026-03-09(월) 15:30 UTC = 2026-03-10(화) 00:30 KST
    const { matrix, max } = aggregateVisitHeatmap([
      aRow({ created_at: "2026-03-09T15:30:00Z" }),
      aRow({ created_at: "2026-03-09T15:40:00Z" }),
    ]);
    expect(matrix[2][0]).toBe(2); // 화요일 0시
    expect(max).toBe(2);
    expect(matrix.flat().reduce((s, n) => s + n, 0)).toBe(2);
  });

  it("created_at 없는 행은 건너뛴다", () => {
    const { matrix, max } = aggregateVisitHeatmap([aRow({})]);
    expect(max).toBe(0);
    expect(matrix.flat().every((n) => n === 0)).toBe(true);
  });
});

describe("aggregateNewVsReturning", () => {
  it("기간 시작 전에 이미 왔던 ip 만 재방문", () => {
    const out = aggregateNewVsReturning(
      [
        { ip: "a", date: "2026-01-01" }, // 기간 전 + 기간 내 → 재방문
        { ip: "a", date: "2026-02-10" },
        { ip: "b", date: "2026-02-11" }, // 기간 내 처음 → 신규
        { ip: "b", date: "2026-02-15" }, // 기간 내 여러 날 와도 한 명
        { ip: "c", date: "2026-01-20" }, // 기간 내 방문 없음 → 제외
      ],
      "2026-02-01",
    );
    expect(out).toEqual({ newCount: 1, returningCount: 1, returningPct: 50 });
  });

  it("빈 입력이면 전부 0", () => {
    expect(aggregateNewVsReturning([], "2026-02-01")).toEqual({
      newCount: 0,
      returningCount: 0,
      returningPct: 0,
    });
  });
});

describe("aggregateUtmCampaigns", () => {
  it("source·medium·campaign 조합으로 묶고 많은 순", () => {
    const rows = [
      aRow({ utm_source: "linkedin", utm_medium: "social", utm_campaign: null }),
      aRow({ utm_source: "linkedin", utm_medium: "social", utm_campaign: null }),
      aRow({ utm_source: "resume", utm_medium: null, utm_campaign: "2026" }),
      aRow({}),
    ];
    expect(aggregateUtmCampaigns(rows)).toEqual([
      { source: "linkedin", medium: "social", campaign: null, count: 2 },
      { source: "resume", medium: null, campaign: "2026", count: 1 },
    ]);
  });
});

describe("aggregateDailyVisits / pctChange", () => {
  it("일별 방문을 창 길이만큼 0 채움으로 준다", () => {
    const today = new Date("2026-03-10T03:00:00Z");
    const out = aggregateDailyVisits(
      [
        { ip: "a", date: "2026-03-10" },
        { ip: "b", date: "2026-03-10" },
        { ip: "a", date: "2026-03-08" },
        { ip: "x", date: "2026-01-01" }, // 창 밖 — fill 이 잘라낸다
      ],
      3,
      today,
    );
    expect(out).toEqual([
      { day: "2026-03-08", count: 1 },
      { day: "2026-03-09", count: 0 },
      { day: "2026-03-10", count: 2 },
    ]);
  });

  it("pctChange — 이전 0 이면 null, 아니면 반올림 %", () => {
    expect(pctChange(10, 0)).toBeNull();
    expect(pctChange(15, 10)).toBe(50);
    expect(pctChange(7, 10)).toBe(-30);
    expect(pctChange(10, 10)).toBe(0);
  });
});

describe("isTrafficSpike", () => {
  it("직전 7일 평균의 3배 이상 + 절대 하한 15 를 넘어야 급증", () => {
    expect(isTrafficSpike(30, 70)).toBe(true); // 평균 10 → 3배
    expect(isTrafficSpike(29, 70)).toBe(false); // 3배 미달
    expect(isTrafficSpike(14, 0)).toBe(false); // 하한 미달 — 신생 사이트 노이즈 차단
    expect(isTrafficSpike(15, 0)).toBe(true); // 이력 없어도 절대량이 크면 급증
  });
});
