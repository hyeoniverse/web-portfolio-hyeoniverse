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
    /** 유입 경로 top — referrer 호스트 단위 집계 (site_visits.referrer 필요 — 마이그레이션 후 활성) */
    referrers?: Array<{ source: string; count: number; pct: number }>;
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
  };
  services: Record<string, "configured" | "missing">;
}
