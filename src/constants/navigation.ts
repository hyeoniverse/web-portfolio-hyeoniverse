import type { NavItem, TocLabel } from "@/types";

export const NAVIGATION_ITEMS: NavItem[] = [
  { id: "hero", label: "Home", number: "01", path: "/" },
  { id: "works", label: "Works", number: "02", path: "/works" },
  { id: "about", label: "About Me", number: "03", path: "/about" },
  { id: "webflow", label: "WebFlow", number: "04", path: "/webflow" },
];

// 네비게이션을 표시할 라우트 (홈 페이지 제외)
export const ROUTES_WITH_NAV = ["/works", "/about", "/webflow"];

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
  "/about": [
    { label: "About Me", section: "about", path: "/about" },
    { label: "WebFlow", section: "webflow", path: "/webflow" },
  ],
  "/webflow": [
    { label: "About Me", section: "about", path: "/about" },
    { label: "WebFlow", section: "webflow", path: "/webflow" },
  ],
};

export const MOBILE_BREAKPOINT = 768;
export const SCROLL_OFFSET = 200;
