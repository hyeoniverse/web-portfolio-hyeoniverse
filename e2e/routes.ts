/** 시각 회귀 대상 라우트. 리팩토링 슬라이스를 시작할 때 해당 도메인 라우트가 여기 있는지 먼저 확인한다. */
export type Route = {
  path: string;
  /** 스크린샷 파일명 (슬래시 대신 사용) */
  name: string;
  /** 이 라우트에서 추가로 가려야 하는 셀렉터 */
  mask?: string[];
  /** 전체 페이지 대신 뷰포트만 캡처 (기본 true) */
  fullPage?: boolean;
  /** lazy 콘텐츠 발화용 스크롤 워크를 건너뛴다. 스크롤이 라우팅/애니메이션을 트리거하는 페이지용 */
  skipScroll?: boolean;
  /**
   * 이미 알려진 런타임 에러 — 이 패턴에 맞으면 테스트를 실패시키지 않는다.
   * 리팩토링이 만든 새 에러와 기존 결함을 구분하기 위한 장치이지, 무시해도 된다는 뜻이 아니다.
   * 항목마다 이슈를 남기고, 고치면 즉시 제거한다.
   */
  knownPageErrors?: RegExp[];
};

/** 로그인 없이 접근 가능한 라우트. Phase 0 baseline 은 여기까지 커버한다. */
export const PUBLIC_ROUTES: Route[] = [
  { path: "/", name: "home" },
  { path: "/about", name: "about" },
  // GSAP 스크롤 시퀀스가 모바일에서 라우팅까지 트리거해 캡처 중 페이지가 바뀐다.
  // 스크롤 없이 첫 화면만 — 하단 회귀는 수동 QA 로 커버한다.
  { path: "/works", name: "works", fullPage: false, skipScroll: true },
  {
    path: "/posts",
    name: "posts",
    // 상단 배너가 자동 회전하는 캐러셀이라 캡처마다 다른 슬라이드가 잡힌다 → 통째로 가림.
    // 사이드바의 랜덤 추천·최근 댓글도 마찬가지 (RandomPosts 가 PopularPosts.module.css 를
    // 공유해서 클래스로 분리가 안 되므로 함께 가린다).
    // 배너가 뷰포트의 대부분을 차지해 fullPage 로 잡아야 카드 목록이 실제로 검증된다.
    mask: [
      '[class*="PostsBanner-module"]',
      '[class*="PopularPosts-module"]',
      '[class*="RecentComments-module"]',
    ],
  },
  { path: "/posts/categories", name: "posts-categories" },
  { path: "/posts/series", name: "posts-series" },
  { path: "/posts/tags", name: "posts-tags" },
  { path: "/posts/history", name: "posts-history" },
  // 본문 lazy 이미지·코드 하이라이트가 모바일에서 늦게 붙어 하단이 흔들린다.
  { path: "/posts/accessibility-checklist", name: "post-detail", fullPage: false },
  {
    path: "/profile",
    name: "profile",
    // 간헐적 hydration mismatch("server rendered text didn't match the client")가 재현된다.
    // Phase 0 에서 발견한 기존 결함이라 baseline 을 막지 않도록 허용 목록에 둔다.
    // 원인 특정과 수정은 별도 이슈. 고친 뒤 이 항목을 제거할 것.
    knownPageErrors: [/Hydration failed/],
  },
  { path: "/privacy", name: "privacy" },
  // /design-system 은 제외. 2만 px 초장문 + 인터랙티브 데모(useState 59개)로
  // fullPage 는 물론 뷰포트 캡처도 안정화되지 않는다. 안정화 비용 > 회귀 감시 가치.
  // 컴포넌트 회귀는 각 컴포넌트를 실제로 쓰는 라우트에서 잡고, 이 페이지는 수동 확인한다.
  { path: "/admin/login", name: "admin-login" },
];

/**
 * 로그인이 필요한 admin 라우트. Phase 4-1(admin 슬라이스, 40,586줄)의 안전망이다.
 *
 * 편집 화면(`/admin/posts/new` 등)은 Plate 에디터라 캡처가 불안정하고 Phase 4-4 대상이므로
 * 목록·설정 위주로 잡는다. 실행 전 `e2e/auth.setup.ts` 참고.
 */
export const ADMIN_ROUTES: Route[] = [
  { path: "/admin", name: "admin-dashboard" },
  { path: "/admin/posts", name: "admin-posts" },
  { path: "/admin/works", name: "admin-works" },
  { path: "/admin/comments", name: "admin-comments" },
  { path: "/admin/notifications", name: "admin-notifications" },
  { path: "/admin/reports", name: "admin-reports" },

  /* settings 는 탭 UI 라 URL 하나로는 General 탭만 잡힌다. admin 슬라이스의 73%(29,572줄)가
     여기 있고 Phase 4-1 대상 파일(AboutStudio 2,508 · ContentTab 2,168 · ServicesTab 1,447 …)이
     각 탭에 흩어져 있어 탭별로 캡처해야 안전망이 된다. ?tab= / ?sub= 로 주소 지정이 가능하다. */
  { path: "/admin/settings?tab=general", name: "admin-settings-general" },
  { path: "/admin/settings?tab=content&sub=home", name: "admin-settings-content-home" },
  { path: "/admin/settings?tab=content&sub=profile", name: "admin-settings-content-profile" },
  { path: "/admin/settings?tab=content&sub=about", name: "admin-settings-content-about" },
  { path: "/admin/settings?tab=content&sub=works", name: "admin-settings-content-works" },
  { path: "/admin/settings?tab=content&sub=posts", name: "admin-settings-content-posts" },
  { path: "/admin/settings?tab=content&sub=calendars", name: "admin-settings-content-calendars" },
  { path: "/admin/settings?tab=appearance", name: "admin-settings-appearance" },
  { path: "/admin/settings?tab=services", name: "admin-settings-services" },
  { path: "/admin/settings?tab=account", name: "admin-settings-account" },
];

/**
 * 전 라우트 공통 마스크 — 실행마다 값이 달라져 diff 를 오염시키는 영역.
 * 여기 넣는다는 건 "이 영역의 회귀는 시각 테스트로 못 잡는다"는 뜻이니 최소로 유지한다.
 */
export const GLOBAL_MASKS = [
  "[data-visual-unstable]", // 랜덤·상대시간 등에 수동으로 붙이는 탈출구
];

/**
 * WebGL/비디오는 GPU 마다 래스터 결과가 달라 그대로 두면 매번 diff 가 난다.
 * 다만 mask 로 처리하면 **그 위에 마젠타 사각형을 덮어** 아래 콘텐츠까지 가린다 —
 * `/profile` 은 전체 화면 canvas 라 baseline 이 통째로 단색이 됐다(= 아무것도 검증 못 함).
 * `visibility: hidden` 은 레이아웃 공간을 유지한 채 내용만 숨기므로 주변 콘텐츠가 그대로 남는다.
 */
export const HIDE_CSS = `
  canvas, video { visibility: hidden !important; }

  /* Next.js 개발 오버레이 배지. 감지된 이슈 개수에 따라 "N" ↔ "1 Issue" 로 모양이 바뀌어
     그 자체가 diff 를 만든다. 페이지 콘텐츠가 아니므로 통째로 숨긴다. */
  nextjs-portal, [data-nextjs-toast], #__next-build-watcher { display: none !important; }

  /* 툴팁("Enable BGM" 등)이 캡처 시점에 따라 떴다 사라진다 */
  [class*="Tooltip-module"] { visibility: hidden !important; }
`;
