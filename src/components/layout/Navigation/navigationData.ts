import type { NavSection } from "../navSection";
/* ── Navigation data constants ── */

export const navDescs: Record<string, Record<string, string>> = {
  works: { ko: "프로젝트 포트폴리오", en: "Project portfolio" },
  posts: { ko: "블로그 & 아티클", en: "Blog & articles" },
  profile: { ko: "소개 & 이력", en: "Introduction & career" },
  about: { ko: "사이트 소개", en: "About this site" },
};

interface NavChild {
  key: string;
  href: string;
  label: string;
}

export interface NavItem {
  key: string;
  href: string;
  label: string;
  children?: NavChild[];
}

export const navItems: NavItem[] = [
  { key: "works", href: "/works", label: "Works" },
  {
    key: "posts",
    href: "/posts",
    label: "Posts",
    children: [
      { key: "posts-series", href: "/posts/series", label: "Series" },
      { key: "posts-tags", href: "/posts/tags", label: "Tags" },
      { key: "posts-history", href: "/posts/history", label: "History" },
      { key: "posts-til", href: "/posts/til", label: "TIL" },
    ],
  },
  { key: "profile", href: "/profile", label: "Profile" },
  { key: "about", href: "/about", label: "About" },
];


export const adminNavItems: NavItem[] = [
  {
    key: "admin-dashboard",
    href: "/admin",
    label: "Dashboard",
    /* 대시보드에 묶인 관리 화면들 — 전에는 알림·신고가 햄버거 메뉴 최상위에만 있었고
       댓글 관리는 어느 메뉴에도 없어 주소로만 들어갈 수 있었다. 세 화면 모두 관리자
       전용이라 권한 필터(visibleAdminItems)가 대시보드와 함께 걸러 준다 */
    children: [
      { key: "dashboard-traffic", href: "/admin/traffic", label: "Traffic" },
      { key: "dashboard-notifications", href: "/admin/notifications", label: "Notifications" },
      { key: "dashboard-reports", href: "/admin/reports", label: "Reports" },
      { key: "dashboard-comments", href: "/admin/comments", label: "Comments" },
      /* AI·외부 서비스 호출 기록 — 소유자 전용(lib/adminAccess 의 OWNER_ONLY_PAGES) */
      { key: "dashboard-service-log", href: "/admin/service-log", label: "Service Log" },
    ],
  },
  {
    key: "admin-settings",
    href: "/admin/settings",
    label: "Settings",
    /* settings 탭 — _data/settingsConstants 의 TAB_IDS 와 같은 순서/키 */
    children: [
      { key: "settings-general", href: "/admin/settings?tab=general", label: "General" },
      { key: "settings-content", href: "/admin/settings?tab=content", label: "Content" },
      { key: "settings-library", href: "/admin/settings?tab=library", label: "Library" },
      { key: "settings-appearance", href: "/admin/settings?tab=appearance", label: "Appearance" },
      { key: "settings-services", href: "/admin/settings?tab=services", label: "Services" },
      { key: "settings-account", href: "/admin/settings?tab=account", label: "Account" },
    ],
  },
  { key: "admin-works", href: "/admin/works", label: "Works" },
  { key: "admin-posts", href: "/admin/posts", label: "Posts" },
];

/* 블로그(/posts 아래) 메뉴 — 핵심 셋만: Posts(펼치면 Series · Tags · History) · TIL, 끝에 포트폴리오(메인)로 나가는 링크.
   블로그 주소(blog.hyeoniverse.com)에선 Portfolio 링크에 메인 주소가 붙는다(Navigation · lib/siteHosts) */
export const blogNavItems: NavItem[] = [
  {
    key: "blog-all",
    href: "/posts",
    label: "Posts",
    children: [
      { key: "blog-series", href: "/posts/series", label: "Series" },
      { key: "blog-tags", href: "/posts/tags", label: "Tags" },
      { key: "blog-history", href: "/posts/history", label: "History" },
    ],
  },
  { key: "blog-til", href: "/posts/til", label: "TIL" },
  { key: "blog-portfolio", href: "/", label: "Portfolio ↗" },
];

/** 화면(공개 사이트 · 블로그 · 관리 화면)마다 네비게이션이 다른 점 — Navigation · MobileMenu 는 라우트를 보지 않고 이 값만 따른다.
 *  로그아웃 · 알림처럼 로그인 여부로 갈리는 것은 여기 두지 않는다(화면과 상관없이 같다) */
export interface NavSectionConfig {
  /** 로고가 가는 곳 */
  homeHref: string;
  /** 가운데 메뉴(넓은 화면) */
  items: NavItem[];
  /** 메뉴 서랍의 페이지 목록 */
  drawerItems: NavItem[];
  /** 권한으로 거르는 메뉴인가 — 열 수 없는 관리 화면은 뺀다(#883) */
  restricted: boolean;
  /** 로고 옆 배지 글자(관리 화면 "Admin" · 블로그 "Blog"). 없으면 false */
  badge: string | false;
  /** 처음 들어왔을 때의 BGM 안내 말풍선 */
  soundTip: boolean;
  /** 문의 — 로그아웃 상태의 Get in Touch 단추와 서랍의 Contacts */
  contact: boolean;
  /** 건너가는 링크 — site: 관리 화면으로(⚙ · 서랍 Admin, 갈 곳은 권한이 정한다), admin: 사이트 홈으로(서랍 Home) */
  crossLink: "admin" | "home";
  /** 로그인한 이메일(넓은 화면) */
  showEmail: boolean;
  /** 로그아웃한 뒤 갈 곳 — 없으면 그 화면에서 새로 고친다 */
  afterLogout?: string;
}

export const NAV_SECTIONS: Record<NavSection, NavSectionConfig> = {
  site: {
    homeHref: "/",
    items: navItems,
    drawerItems: [{ key: "home", href: "/", label: "Home" }, ...navItems],
    restricted: false,
    badge: false,
    soundTip: true,
    contact: true,
    crossLink: "admin",
    showEmail: false,
  },
  /* 블로그 — 로고는 블로그 첫 화면으로, 로고 옆 BLOG 배지로 포트폴리오와 다른 공간임을 알린다.
     BGM 안내 말풍선은 띄우지 않는다(읽는 화면). 문의 · 관리 화면 링크는 사이트와 같다 */
  blog: {
    homeHref: "/posts",
    items: blogNavItems,
    drawerItems: [
      { key: "home", href: "/", label: "Home" },
      ...blogNavItems.filter((i) => i.key !== "blog-portfolio"),
      ...navItems.filter((i) => i.key !== "posts"),
    ],
    restricted: false,
    badge: "Blog",
    soundTip: false,
    contact: true,
    crossLink: "admin",
    showEmail: false,
  },
  admin: {
    homeHref: "/admin",
    /* 알림·신고는 Dashboard 하위 메뉴로 옮겨져 최상위 중복 항목을 두지 않는다 */
    items: adminNavItems,
    drawerItems: adminNavItems,
    restricted: true,
    badge: "Admin",
    soundTip: false,
    contact: false,
    crossLink: "home",
    showEmail: true,
    afterLogout: "/admin/login",
  },
};

export const SKIP_LOADING_PAGES = ["/privacy"];
