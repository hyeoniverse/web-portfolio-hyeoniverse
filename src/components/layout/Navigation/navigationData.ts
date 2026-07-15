/* ── Navigation data constants ── */

export const navDescs: Record<string, Record<string, string>> = {
  works: { ko: "프로젝트 포트폴리오", en: "Project portfolio" },
  posts: { ko: "블로그 & 아티클", en: "Blog & articles" },
  profile: { ko: "소개 & 이력", en: "Introduction & career" },
  about: { ko: "사이트 소개", en: "About this site" },
};

export interface NavChild {
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

export const adminNavItems = [
  { key: "admin-dashboard", href: "/admin", label: "Dashboard" },
  { key: "admin-settings", href: "/admin/settings", label: "Settings" },
  { key: "admin-works", href: "/admin/works", label: "Works" },
  { key: "admin-posts", href: "/admin/posts", label: "Posts" },
];

export const adminMenuItems = [
  ...adminNavItems,
  { key: "admin-notifications", href: "/admin/notifications", label: "Notifications" },
  { key: "logout", href: null as string | null, label: "Logout" },
];

export const SKIP_LOADING_PAGES = ["/privacy"];
