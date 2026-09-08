/**
 * 관리자 대시보드의 순수 집계 — 조회한 행을 화면이 쓰는 모양으로 바꾼다.
 *
 * 원래는 `/api/admin/dashboard` 의 GET 핸들러 안에 인라인으로 있었다. 그 핸들러는 290줄인데
 * 대부분이 "쿼리 결과를 reduce 해서 목록을 만드는" 코드였고, 라우트 안에 있으니 테스트할
 * 방법이 없었다 — 확인하려면 실제 DB 를 붙여 라우트를 부르는 수밖에 없었다.
 *
 * 여기 있는 함수는 전부 인자로 받은 행만 보고 결과를 만든다. DB 도, 시각도, 환경변수도
 * 읽지 않는다(날짜를 다루는 fillDailyViews 만 "오늘" 을 인자로 받는다).
 */

/* ── 카테고리·태그 ── */

export type PostAggRow = {
  category: string | null;
  tags: string[] | null;
  view_count: number | null;
};

export type CategoryStat = { name: string; postCount: number; views: number };
export type TagStat = { tag: string; count: number };

/** 조회수 많은 카테고리 6개와 많이 쓰인 태그 12개. */
export function aggregateCategoriesAndTags(rows: PostAggRow[]): {
  categories: CategoryStat[];
  tags: TagStat[];
} {
  const categoryMap = new Map<string, { count: number; views: number }>();
  const tagMap = new Map<string, number>();

  for (const p of rows) {
    if (p.category) {
      const cur = categoryMap.get(p.category) ?? { count: 0, views: 0 };
      cur.count += 1;
      cur.views += p.view_count ?? 0;
      categoryMap.set(p.category, cur);
    }
    for (const t of p.tags ?? []) {
      tagMap.set(t, (tagMap.get(t) ?? 0) + 1);
    }
  }

  const categories = Array.from(categoryMap, ([name, v]) => ({
    name,
    postCount: v.count,
    views: v.views,
  }))
    // 조회수가 같으면 글이 많은 쪽을 앞에 둔다.
    .sort((a, b) => b.views - a.views || b.postCount - a.postCount)
    .slice(0, 6);

  const tags = Array.from(tagMap, ([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);

  return { categories, tags };
}

/* ── 트래픽 ── */

export type VisitRow = {
  referrer: string | null;
  device_kind: string | null;
  os: string | null;
  browser: string | null;
  device_model: string | null;
};

type ShareStat = { count: number; pct: number };
export type DeviceKind = "desktop" | "mobile" | "tablet";

export type TrafficStats = {
  referrers: Array<{ source: string } & ShareStat>;
  devices: Array<{ kind: DeviceKind } & ShareStat>;
  operatingSystems: Array<{ name: string } & ShareStat>;
  browsers: Array<{ name: string } & ShareStat>;
  deviceModels: Record<DeviceKind, Array<{ model: string } & ShareStat>>;
};

const DEVICE_KINDS = ["desktop", "mobile", "tablet"] as const;

function tally(map: Map<string, number>, key: string | null): void {
  if (key) map.set(key, (map.get(key) ?? 0) + 1);
}

/** 상위 n개를 비율과 함께. 비율의 분모는 전체 방문 수다(항목 합이 아니라). */
function topWithShare<T>(
  map: Map<string, number>,
  total: number,
  limit: number,
  build: (key: string, count: number, pct: number) => T,
): T[] {
  if (total === 0) return [];
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([k, n]) => build(k, n, Math.round((n / total) * 100)));
}

/** 방문 기록에서 유입 경로·기기·OS·브라우저·기기 모델 분포를 뽑는다. */
export function aggregateTraffic(rows: VisitRow[]): TrafficStats {
  const refMap = new Map<string, number>();
  const deviceMap = new Map<string, number>();
  const osMap = new Map<string, number>();
  const browserMap = new Map<string, number>();
  // 기기 종류 안에서 다시 모델별로 — 화면에서 펼쳐 보는 용도다.
  const modelByDevice: Record<string, Map<string, number>> = {
    desktop: new Map(),
    mobile: new Map(),
    tablet: new Map(),
  };

  for (const v of rows) {
    tally(refMap, v.referrer);
    tally(deviceMap, v.device_kind);
    tally(osMap, v.os);
    tally(browserMap, v.browser);
    if (v.device_kind && v.device_model && modelByDevice[v.device_kind]) {
      tally(modelByDevice[v.device_kind], v.device_model);
    }
  }

  const total = rows.length;

  const deviceModels = {
    desktop: [],
    mobile: [],
    tablet: [],
  } as TrafficStats["deviceModels"];
  for (const kind of DEVICE_KINDS) {
    // 모델 비율의 분모는 전체 방문이 아니라 그 기기 종류의 방문 수다.
    const subtotal = [...modelByDevice[kind].values()].reduce((s, n) => s + n, 0);
    deviceModels[kind] = topWithShare(modelByDevice[kind], subtotal, 10, (model, count, pct) => ({
      model,
      count,
      pct,
    }));
  }

  return {
    referrers: topWithShare(refMap, total, 6, (source, count, pct) => ({ source, count, pct })),
    // 기기는 상위 n개가 아니라 세 종류를 정해진 순서로 보여 준다. 0건인 것만 뺀다.
    devices: DEVICE_KINDS.map((kind) => {
      const count = deviceMap.get(kind) ?? 0;
      return { kind, count, pct: total > 0 ? Math.round((count / total) * 100) : 0 };
    }).filter((d) => d.count > 0),
    operatingSystems: topWithShare(osMap, total, 8, (name, count, pct) => ({ name, count, pct })),
    browsers: topWithShare(browserMap, total, 8, (name, count, pct) => ({ name, count, pct })),
    deviceModels,
  };
}

/* ── 일별 조회수 ── */

const KST_FMT = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Date → KST 기준 "YYYY-MM-DD". */
export function kstDateStr(d: Date): string {
  return KST_FMT.format(d);
}

/**
 * N일치를 빈 날짜 0 으로 채워 돌려준다. 화면이 잘라 쓰기만 하면 되도록 구멍을 없앤다.
 *
 * `today` 를 인자로 받는 이유는 이 함수를 테스트할 수 있게 하기 위해서다 —
 * 안에서 현재 시각을 읽으면 결과가 부를 때마다 달라진다.
 */
export function fillDailyViews(
  raw: Array<{ day: string; views: number }>,
  days: number,
  today: Date = new Date(),
): Array<{ day: string; views: number }> {
  const map = new Map<string, number>();
  for (const r of raw) map.set(r.day, Number(r.views) || 0);

  /* KST 자정 경계를 정확히 맞추려고 문자열로 다룬다.
     Date 산술로 하면 실행 환경의 시간대에 따라 하루가 밀린다. */
  const [y, m, d] = kstDateStr(today).split("-").map(Number);
  const anchor = new Date(Date.UTC(y, m - 1, d));

  const out: Array<{ day: string; views: number }> = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = new Date(anchor);
    day.setUTCDate(day.getUTCDate() - i);
    const key = day.toISOString().slice(0, 10);
    out.push({ day: key, views: map.get(key) ?? 0 });
  }
  return out;
}
