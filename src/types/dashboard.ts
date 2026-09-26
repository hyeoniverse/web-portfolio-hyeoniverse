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
    totalPostViews: number;
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
    dailyViews: DailyViews[];
    categories: Array<{ name: string; postCount: number; views: number }>;
    tags: Array<{ tag: string; count: number }>;
    /** 기기 분석 — UA 파싱 후 desktop/mobile/tablet 비율 (site_visits.user_agent 필요) */
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
  };
  services: Record<string, "configured" | "missing">;
}

export type ChannelStatDto = {
  channel: "search" | "social" | "community" | "dev" | "direct" | "other";
  count: number;
  pct: number;
  hosts: Array<{ host: string; count: number; pct: number }>;
};

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
  /** 기간 내 조회 상위 글 — 누적이 아니라 선택한 창 안의 post_views 기준 */
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
}
