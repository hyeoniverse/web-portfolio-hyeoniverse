import type { NavItem, TocLabel } from "@/types";

export const NAVIGATION_ITEMS: NavItem[] = [
  { id: "hero", label: "Home", number: "01", path: "/" },
  { id: "works", label: "Works", number: "02", path: "/works" },
  { id: "profile", label: "Profile", number: "03", path: "/profile" },
  { id: "about", label: "About", number: "04", path: "/about" },
];

// 네비게이션을 표시할 라우트 (홈 페이지 제외)
export const ROUTES_WITH_NAV = ["/works", "/profile", "/about"];

// 각 라우트의 목차 라벨
export const TOC_LABELS: Record<string, TocLabel[]> = {
  "/": [
    { label: "Home", section: "hero", path: "/" },
    { label: "Works", section: "works", path: "/works" },
  ],
  "/works": [
    { label: "Home", section: "hero", path: "/" },
    { label: "Works", section: "works", path: "/works" },
  ],
  "/profile": [
    { label: "Profile", section: "profile", path: "/profile" },
    { label: "About", section: "about", path: "/about" },
  ],
  "/about": [
    { label: "Profile", section: "profile", path: "/profile" },
    { label: "About", section: "about", path: "/about" },
  ],
};

export const MOBILE_BREAKPOINT = 768;
export const SCROLL_OFFSET = 200;
