import type { NavItem, TocLabel } from "@/types";

export const NAVIGATION_ITEMS: NavItem[] = [
  { id: "hero", label: "Home", number: "01", path: "/" },
  { id: "works", label: "Works", number: "02", path: "/works" },
  { id: "about", label: "About Me", number: "03", path: "/about" },
  { id: "webflow", label: "WebFlow", number: "04", path: "/webflow" },
];

// Routes that should show navigation (not home page)
export const ROUTES_WITH_NAV = ["/works", "/about", "/webflow"];

// TOC Labels for each route
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
