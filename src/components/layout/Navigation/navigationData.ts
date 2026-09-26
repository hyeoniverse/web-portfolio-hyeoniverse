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
    ],
  },
  { key: "profile", href: "/profile", label: "Profile" },
  { key: "about", href: "/about", label: "About" },
];

export const menuItems = [
  { key: "home", href: "/", label: "Home" },
  ...navItems,
  { key: "contacts", href: null, label: "Contacts" },
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
      { key: "settings-appearance", href: "/admin/settings?tab=appearance", label: "Appearance" },
      { key: "settings-services", href: "/admin/settings?tab=services", label: "Services" },
      { key: "settings-account", href: "/admin/settings?tab=account", label: "Account" },
    ],
  },
  { key: "admin-works", href: "/admin/works", label: "Works" },
  { key: "admin-posts", href: "/admin/posts", label: "Posts" },
];

/* 알림·신고는 Dashboard 하위 메뉴로 옮겨져 최상위 중복 항목을 두지 않는다 */
export const adminMenuItems = [
  ...adminNavItems,
  { key: "logout", href: null as string | null, label: "Logout" },
];

export const SKIP_LOADING_PAGES = ["/privacy"];
