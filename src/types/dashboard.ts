// 관리자 대시보드 응답 DTO — GET /api/admin/dashboard 가 생성, page.tsx 가 소비.

/** 일별 조회수 */
export interface DailyViews {
  day: string;
  views: number;
}

/** 이름 기반 집계 (count + 비율%) — OS/브라우저 분포 */
export interface NamedStat {
  name: string;
  count: number;
  pct: number;
}

/** 모델 기반 집계 — 기기 모델 분포 drill-down */
export interface ModelStat {
  model: string;
  count: number;
  pct: number;
}

export interface DashboardData {
  posts: {
    total: number;
    drafts: number;
    published: number;
    recent: Array<{
      id: string;
      title: string;
      slug: string;
      published: boolean;
      view_count: number;
      created_at: string;
      updated_at: string;
    }>;
  };
  works: {
    total: number;
    drafts: number;
    published: number;
    recent: Array<{
      id: string;
      title: string;
      slug: string;
      published: boolean;
      created_at: string;
      updated_at: string;
    }>;
  };
  comments: {
    total: number;
    recent: Array<{
      id: string;
      nickname: string;
      content: string;
      is_admin: boolean;
      created_at: string;
      post_title: string;
      post_slug: string;
    }>;
  };
  notifications: {
    unreadCount: number;
    recent: Array<{
      id: string;
      type: string;
      title: string;
      message: string;
      read: boolean;
      created_at: string;
    }>;
  };
  stats: {
    popularPosts: Array<{
      id: string;
      title: string;
      slug: string;
      view_count: number;
      like_count: number;
      category?: string | null;
      created_at?: string;
      comment_count?: number;
    }>;
    /** 일별 방문자 수(KST, 처음 센 날~오늘, 빈 날 0) — 차트 · 달력 · 최근 7일 비교. views 칸이 방문자 수다 */
    dailyVisitors: DailyViews[];
    categories: Array<{ name: string; postCount: number; views: number }>;
    tags: Array<{ tag: string; count: number }>;
    /** 기기 분석 — 방문(첫 조회)의 UA 파싱 결과 desktop/mobile/tablet 비율 */
    devices?: Array<{
      kind: "desktop" | "mobile" | "tablet";
      count: number;
      pct: number;
    }>;
    /** OS 분포 — UA에서 OS 추출 (macOS / Windows / iOS / Android / Linux) */
    operatingSystems?: NamedStat[];
    /** 브라우저 분포 — UA에서 브라우저 추출 (Chrome / Safari / Firefox / Edge ...) */
    browsers?: NamedStat[];
    /** 디바이스 종류별 모델 분포 — drill-down 용 */
    deviceModels?: {
      desktop: ModelStat[];
      mobile: ModelStat[];
      tablet: ModelStat[];
    };
    /** 유입 채널(검색/SNS/커뮤니티/개발/직접/기타) + 채널별 호스트 드릴다운 (#1161) */
    channels?: ChannelStatDto[];
    /** 신규 vs 재방문 — 최근 30일 유니크 방문자 기준 */
    newVsReturning?: { newCount: number; returningCount: number; returningPct: number };
    /** 최근 30일 방문·조회 요약 — 방문당 평균 조회수 */
    visitSummary?: { visits30: number; views30: number; viewsPerVisit: number };
    /**
     * 방문자(#1399) — 사이트에 들른 사람 수(방문자 id, 옛 기록은 IP). visits 는 방문(세션) 수.
     * since 는 처음 센 날(옛 방문 기록에서 옮긴 것 포함). 모두 봇 · '내 IP' 제외
     */
    visitors: { total: number; visits: number; since: string | null };
    /** 페이지 조회수 합계 · 최근 30일 평균 머문 시간(잰 조회만, 없으면 null) */
    pageViews: { total: number; avgDurationMs30: number | null };
  };
  services: Record<string, "configured" | "missing">;
}

export type ChannelStatDto = {
  channel: "search" | "social" | "community" | "dev" | "direct" | "other";
  count: number;
  pct: number;
  hosts: Array<{ host: string; count: number; pct: number }>;
};

/** 페이지 조회 기간 집계(#1399, page_view_stats) — 머문 시간은 시간이 잡힌 조회만의 평균(못 잰 조회는 빼고) */
export interface PageViewStats {
  total: number;
  avgDurationMs: number | null;
  /** 방문(30분 기준 세션) 수 · 방문당 본 페이지 · 방문당 머문 시간 */
  sessions: number;
  pagesPerSession: number | null;
  avgSessionMs: number | null;
  /** 페이지별 조회수 상위 20 · 평균 머문 시간 */
  topPaths: Array<{ path: string; views: number; avgMs: number | null }>;
}

/** 방문 흐름(#1399) — 방문마다 본 페이지를 시간순으로 이어 센 것 */
export interface VisitJourneys {
  /** 경로가 있는 방문 수 · 한 페이지만 보고 나간 방문의 비율(%) */
  sessions: number;
  bounceRate: number;
  /** 들어온 페이지 → 바로 다음에 본 페이지 (상위 10) */
  nextPages: Array<{ from: string; to: string; count: number }>;
  /** 방문의 마지막 페이지 (상위 10) */
  exitPages: Array<{ path: string; count: number; pct: number }>;
  /** 최근 방문 10개의 이동 경로 — 페이지마다 머문 시간(못 잰 페이지는 null) */
  recent: Array<{
    startedAt: string;
    referrer: string | null;
    /** 유입 검색어 — 검색 엔진이 referrer 에 실어 준 경우만 */
    searchTerm: string | null;
    device: string | null;
    steps: Array<{ path: string; ms: number | null }>;
  }>;
}

/** GET /api/admin/traffic — 트래픽 전용 페이지 데이터(#1161). 대시보드는 이 중 간략 세트만 보여준다. */
export interface TrafficData {
  /** 조회 창 길이 (7·14·30·90일) — 요청 파라미터를 정규화해 되돌려준다 */
  days: number;
  /** UTM 링크 생성기의 기준 도메인 — SITE_URL(정본). 비어 있으면 클라가 origin 폴백 */
  siteUrl: string;
  /** 일별 방문(유니크 ip·일) 추이 — 창 길이만큼, 빈 날짜 0 */
  dailyVisits: Array<{ day: string; count: number }>;
  /** 기간 내 걸러진 봇 방문 수 (집계엔 미포함) */
  botVisits: number;
  /** 기간 내 조회 상위 글 — 누적이 아니라 선택한 창 안의 /posts/{slug} 페이지 조회 기준 */
  topContent: Array<{ id: string; title: string; slug: string; count: number; pct: number }>;
  /** 직전 동기간 대비 증감률(%) — 이전 값이 0 이면 null */
  changes: {
    visits: number | null;
    newVisitors: number | null;
    returning: number | null;
  };
  channels: ChannelStatDto[];
  devices: Array<{ kind: "desktop" | "mobile" | "tablet"; count: number; pct: number }>;
  operatingSystems: NamedStat[];
  browsers: NamedStat[];
  deviceModels: {
    desktop: ModelStat[];
    mobile: ModelStat[];
    tablet: ModelStat[];
  };
  /** 국가별 방문 상위 — ISO 3166-1 alpha-2 (마이그레이션·배포 후 쌓임) */
  countries: Array<{ code: string; count: number; pct: number }>;
  /** 랜딩 페이지 상위 (마이그레이션 후 쌓임) */
  landingPages: Array<{ path: string; count: number; pct: number }>;
  /** 방문 시간대 히트맵 — KST 요일(0=일)×시각(0~23) */
  visitHeatmap: { matrix: number[][]; max: number };
  newVsReturning: { newCount: number; returningCount: number; returningPct: number };
  /** UTM 캠페인 — utm_source 있는 방문만 (없으면 빈 배열) */
  utmCampaigns: Array<{
    source: string;
    medium: string | null;
    campaign: string | null;
    count: number;
  }>;
  visitSummary: { visits30: number; views30: number; viewsPerVisit: number };
  /** 기간 내 페이지 조회 · 머문 시간(#1399) — 집계 함수가 없으면(마이그레이션 전) null */
  pageStats: PageViewStats | null;
  /** 기간 내 방문 흐름 — 들어온 뒤 무엇을 봤는지 */
  journeys: VisitJourneys;
  /** IP 별 방문 상위 — 마스킹 값과 불투명 키만 (원문 IP 는 응답에 없다) */
  ipVisitors: Array<{
    key: string;
    masked: string;
    days: number;
    firstDate: string;
    lastDate: string;
    country: string | null;
    device: string | null;
    os: string | null;
    browser: string | null;
    /** 기간 내 이 IP 의 최근 방문 경로(최근 순, 최대 10) */
    journeys: VisitJourneys["recent"];
  }>;
  /** 검색 유입의 검색어 — 검색 엔진이 referrer 에 검색어를 실어 준 방문만 셀 수 있다 */
  searchTerms: {
    /** 검색 채널 방문 수 · 그중 검색어를 알 수 있는 방문 수 */
    searchVisits: number;
    withTerm: number;
    /** 검색어 상위 20 — 비율은 검색어를 아는 방문 기준, engines 는 들어온 검색 엔진 호스트 */
    top: Array<{ term: string; count: number; pct: number; engines: string[] }>;
  };
  /** 지금 이 페이지를 연 요청의 IP — '내 IP 로 등록' 용. 알 수 없으면 null */
  currentIp: { key: string; masked: string; excluded: boolean } | null;
  /** '내 IP' 로 지정돼 집계에서 빠지는 IP */
  excludedIps: Array<{ key: string; masked: string }>;
}
