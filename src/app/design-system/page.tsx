"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useLenis } from "@/providers/LenisProvider";
import { useLoadingScreen } from "@/hooks/useLoadingProgress";
import { Mail, Send, Star, ArrowRight, Zap, RotateCcw } from "lucide-react";
import Button from "@/components/ui/Button";
import { Typography } from "@/components/ui/Typography";
import { Switch } from "@/components/ui/Switch";
import { Slider } from "@/components/ui/Slider";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Checkbox from "@/components/ui/Checkbox";
import Select from "@/components/ui/Select";
import { useModalStore } from "@/stores/modalStore";
import { useTheme } from "@/providers/ThemeProvider";
import { useLanguage } from "@/providers/LanguageProvider";
import { THEME_PRESETS } from "@/app/admin/(dashboard)/settings/_data/settingsConstants";
import Logo from "@/components/common/Logo";
import TypeWriter from "@/components/effects/TypeWriter";
import Tooltip from "@/components/ui/Tooltip";
import TextLink from "@/components/ui/TextLink";
import T from "@/components/ui/T";
import CategoryLabel from "@/components/ui/CategoryLabel";
import PostsBanner from "@/app/posts/_components/PostsBanner/PostsBanner";
import type { BannerLayout } from "@/app/posts/_components/PostsBanner/PostsBanner";
import type { Post } from "@/types/post";

import DatePicker from "@/components/ui/DatePicker/DatePicker";

import styles from "./DesignSystem.module.css";

// ─── Preset application helpers ───
const ACCENT_ALPHAS = [1, 5, 10, 15, 20, 30, 40, 50, 60, 70, 80, 90, 95, 100];
const ACCENT_LIGHT_ALPHAS = [40, 60, 70, 90];
const NEUTRAL_STOPS = [0, 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950, 999];
const MID_BLENDS: [number, number][] = [
  [100, 0.05], [200, 0.12], [300, 0.22], [400, 0.33],
  [500, 0.46], [600, 0.65], [700, 0.80], [800, 0.92],
];
const NEUTRAL_ALPHA_STEPS = [1, 5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 95, 100];

function hexToRgb(hex: string): [number, number, number] | null {
  const m = hex.match(/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!m) return null;
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
}

function lerpRgb(a: [number, number, number], b: [number, number, number], t: number): [number, number, number] {
  return [Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t), Math.round(a[2] + (b[2] - a[2]) * t)];
}

function rgbHex([r, g, b]: [number, number, number]): string {
  return `#${[r, g, b].map((c) => Math.max(0, Math.min(255, c)).toString(16).padStart(2, "0")).join("")}`;
}

function getAllVarKeys(): string[] {
  const keys = ["--color-accent", "--color-accent-dark", "--color-accent-light", "--bg-primary", "--text-primary"];
  for (const a of ACCENT_ALPHAS) keys.push(`--color-accent-alpha-${a}`);
  for (const a of ACCENT_LIGHT_ALPHAS) keys.push(`--color-accent-light-alpha-${a}`);
  for (const n of NEUTRAL_STOPS) keys.push(`--color-neutral-${n}`);
  for (const a of NEUTRAL_ALPHA_STEPS) {
    keys.push(`--color-neutral-alpha-${a}`);
    keys.push(`--color-inverse-alpha-${a}`);
  }
  return keys;
}

function snapshotVars(root: HTMLElement): Map<string, string> {
  const map = new Map<string, string>();
  for (const key of getAllVarKeys()) {
    map.set(key, root.style.getPropertyValue(key));
  }
  return map;
}

function restoreVars(root: HTMLElement, snap: Map<string, string>) {
  for (const [key, val] of snap) {
    if (val) root.style.setProperty(key, val);
    else root.style.removeProperty(key);
  }
}

function applyPresetColors(
  root: HTMLElement,
  currentTheme: "light" | "dark",
  preset: (typeof THEME_PRESETS)[0]["theme"],
) {
  // Accent
  const rgb = hexToRgb(preset.accentColor);
  if (!rgb) return;
  const [r, g, b] = rgb;
  root.style.setProperty("--color-accent", preset.accentColor);
  for (const a of ACCENT_ALPHAS) {
    root.style.setProperty(`--color-accent-alpha-${a}`, `rgba(${r}, ${g}, ${b}, ${a / 100})`);
  }
  root.style.setProperty("--color-accent-dark", `rgb(${Math.round(r * 0.78)}, ${Math.round(g * 0.78)}, ${Math.round(b * 0.78)})`);
  const lr = Math.min(255, Math.round(r + (255 - r) * 0.4));
  const lg = Math.min(255, Math.round(g + (255 - g) * 0.4));
  const lb = Math.min(255, Math.round(b + (255 - b) * 0.4));
  root.style.setProperty("--color-accent-light", `rgb(${lr}, ${lg}, ${lb})`);
  for (const a of ACCENT_LIGHT_ALPHAS) {
    root.style.setProperty(`--color-accent-light-alpha-${a}`, `rgba(${lr}, ${lg}, ${lb}, ${a / 100})`);
  }

  // Bg / Text
  const bgHex = currentTheme === "light" ? preset.lightBg : preset.darkBg;
  const textHex = currentTheme === "light" ? preset.lightText : preset.darkText;
  root.style.setProperty("--bg-primary", bgHex);
  root.style.setProperty("--text-primary", textHex);

  // Neutral scale
  const bgRgb = hexToRgb(bgHex);
  const textRgb = hexToRgb(textHex);
  if (!bgRgb || !textRgb) return;
  const black: [number, number, number] = [0, 0, 0];

  root.style.setProperty("--color-neutral-0", "#ffffff");
  root.style.setProperty("--color-neutral-50", bgHex);
  for (const [n, t] of MID_BLENDS) {
    root.style.setProperty(`--color-neutral-${n}`, rgbHex(lerpRgb(bgRgb, textRgb, t)));
  }
  root.style.setProperty("--color-neutral-900", textHex);
  root.style.setProperty("--color-neutral-950", rgbHex(lerpRgb(textRgb, black, 0.3)));
  root.style.setProperty("--color-neutral-999", "#000000");

  for (const a of NEUTRAL_ALPHA_STEPS) {
    root.style.setProperty(`--color-neutral-alpha-${a}`, `rgba(${textRgb[0]}, ${textRgb[1]}, ${textRgb[2]}, ${a / 100})`);
    root.style.setProperty(`--color-inverse-alpha-${a}`, `rgba(${bgRgb[0]}, ${bgRgb[1]}, ${bgRgb[2]}, ${a / 100})`);
  }
}

// ─── Animation helpers ───
const ease = [0.25, 0.1, 0.25, 1] as const;

const staggerContainer = {
  hidden: { transition: { staggerChildren: 0.07, staggerDirection: 1 } },
  visible: (d?: number) => ({
    transition: { staggerChildren: 0.08, ...(d != null && { delayChildren: d }) },
  }),
};

const staggerItem = {
  hidden: (d?: number) => ({
    opacity: 0, y: 20,
    transition: { duration: 0.3, ease, ...(d != null && d > 0 && { delay: d }) },
  }),
  visible: (d?: number) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.4, ...(d != null && { delay: d }), ease },
  }),
};

// custom: number → page exit delay / [enterDelay, exitDelay] → scroll bidirectional
const staggerItemX = {
  hidden: (d?: number | [number, number]) => ({
    opacity: 0, x: -24,
    transition: {
      duration: 0.3, ease,
      delay: Array.isArray(d) ? d[1] : (typeof d === "number" && d > 0 ? d : 0),
    },
  }),
  visible: (d?: number | [number, number]) => ({
    opacity: 1, x: 0,
    transition: {
      duration: 0.4, ease,
      delay: Array.isArray(d) ? d[0] : (typeof d === "number" ? d : 0),
    },
  }),
};

// 내부 요소 개별 stagger (자체 opacity/y 없음, 자식만 orchestrate)
const innerStagger = {
  hidden: { transition: { staggerChildren: 0.05, staggerDirection: 1 } },
  visible: (d?: number) => ({
    transition: { staggerChildren: 0.05, ...(d != null && { delayChildren: d }) },
  }),
};

const innerStaggerFast = {
  hidden: { transition: { staggerChildren: 0.035, staggerDirection: 1 } },
  visible: (d?: number) => ({
    transition: { staggerChildren: 0.03, ...(d != null && { delayChildren: d }) },
  }),
};

// amount ↑ + margin 확대 → 요소가 화면에 아직 보일 때 exit 트리거
const viewportOpts = { once: false, amount: 0.2, margin: "-18% 0px -18% 0px" } as const;

// ─── Color Data ───
const brandColors = [
  { name: "accent", var: "--color-accent" },
  { name: "accent-dark", var: "--color-accent-dark" },
  { name: "accent-light", var: "--color-accent-light" },
];

const neutralScale = [0, 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950, 999];

const alphaSteps = [5, 10, 15, 20, 30, 50, 70, 80, 90, 95, 100];

const semanticColors = [
  { name: "--text-primary", ref: "neutral-900" },
  { name: "--text-secondary", ref: "neutral-800" },
  { name: "--text-tertiary", ref: "neutral-600" },
  { name: "--text-muted", ref: "neutral-500" },
  { name: "--text-accent", ref: "accent" },
  { name: "--text-inverse", ref: "neutral-50" },
  { name: "--bg-primary", ref: "neutral-50" },
  { name: "--bg-inverse", ref: "neutral-950" },
  { name: "--bg-accent-solid", ref: "accent" },
];

// ─── Spacing Data ───
const spacingScale = [
  { name: "--spacing-zero", value: "0" },
  { name: "--spacing-2xs", value: "0.25rem" },
  { name: "--spacing-xs", value: "0.5rem" },
  { name: "--spacing-sm", value: "0.75rem" },
  { name: "--spacing-md", value: "1rem" },
  { name: "--spacing-lg", value: "1.25rem" },
  { name: "--spacing-xl", value: "1.5rem" },
  { name: "--spacing-2xl", value: "2rem" },
  { name: "--spacing-3xl", value: "3rem" },
  { name: "--spacing-4xl", value: "4rem" },
  { name: "--spacing-5xl", value: "6rem" },
  { name: "--spacing-6xl", value: "8rem" },
];

// ─── Radius Data ───
const radiusScale = [
  { name: "2xs", var: "--radius-2xs", value: "2px" },
  { name: "xs", var: "--radius-xs", value: "4px" },
  { name: "sm", var: "--radius-sm", value: "6px" },
  { name: "md", var: "--radius-md", value: "8px" },
  { name: "lg", var: "--radius-lg", value: "12px" },
  { name: "xl", var: "--radius-xl", value: "16px" },
  { name: "2xl", var: "--radius-2xl", value: "24px" },
  { name: "3xl", var: "--radius-3xl", value: "28px" },
  { name: "4xl", var: "--radius-4xl", value: "32px" },
  { name: "5xl", var: "--radius-5xl", value: "36px" },
  { name: "6xl", var: "--radius-6xl", value: "42px" },
  { name: "capsule", var: "--radius-capsule", value: "9999px" },
  { name: "circle", var: "--radius-circle", value: "50%" },
];

// ─── Shadow Data ───
const shadowScale = [
  "--shadow-xs",
  "--shadow-sm",
  "--shadow-md",
  "--shadow-lg",
  "--shadow-xl",
  "--shadow-2xl",
];

// ─── Motion Data ───
const durations = [
  { name: "--duration-instant", value: "0.1s" },
  { name: "--duration-fast", value: "0.15s" },
  { name: "--duration-base", value: "0.3s" },
  { name: "--duration-moderate", value: "0.35s" },
  { name: "--duration-slow", value: "0.5s" },
  { name: "--duration-slower", value: "0.8s" },
  { name: "--duration-slowest", value: "1.5s" },
];

const easings = [
  { name: "--ease-bounce", value: "cubic-bezier(0.34, 1.56, 0.64, 1)" },
  { name: "--ease-material", value: "cubic-bezier(0.4, 0, 0.2, 1)" },
  { name: "--ease-out-expo", value: "cubic-bezier(0.16, 1, 0.3, 1)" },
  { name: "--ease-in-out", value: "cubic-bezier(0.25, 0.1, 0.25, 1)" },
];

// ─── Z-index Data ───
const zScale = [
  { name: "--z-below", value: "-1", label: "Background" },
  { name: "--z-content", value: "10", label: "Page Content" },
  { name: "--z-nav", value: "100", label: "Navigation" },
  { name: "--z-float", value: "200", label: "Floating UI" },
  { name: "--z-dropdown", value: "500", label: "Dropdown / Popover" },
  { name: "--z-tooltip", value: "700", label: "Tooltip" },
  { name: "--z-overlay", value: "9000", label: "Overlay / Drawer" },
  { name: "--z-top", value: "10000", label: "Cursor / Transition" },
];


// ─── Typography Data ───
const typoVariants = [
  "h1", "h2", "h3", "h4", "h5", "h6", "body1", "body2", "caption", "overline",
] as const;

const typoColors = ["primary", "secondary", "tertiary", "muted", "accent"] as const;

// ─── Banner mock data ───
const BANNER_LAYOUTS: BannerLayout[] = ["fullwidth", "split", "cards", "ticker"];
const BANNER_LAYOUT_LABELS: Record<BannerLayout, { ko: string; en: string }> = {
  fullwidth: { ko: "Fullwidth — 풀 와이드 캐러셀 (Default / Cylinder)", en: "Fullwidth — Full-width Carousel (Default / Cylinder)" },
  split: { ko: "Split — 가로 슬라이드 릴 (무한 루프)", en: "Split — Horizontal Sliding Reel (Infinite Loop)" },
  cards: { ko: "Cards — 중앙 포커스 카드", en: "Cards — Center-focus Card Stack" },
  ticker: { ko: "Ticker — 세로 슬라이드 바 (무한 루프)", en: "Ticker — Vertical Sliding Bar (Infinite Loop)" },
};
const MOCK_POST: Post = {
  id: "demo-1",
  title: "비주얼 스토리텔링의 예술",
  slug: "demo",
  content: "",
  content_type: "markdown",
  excerpt: "디자인, 사진, 내러티브가 만나는 지점을 현대 디지털 렌즈로 탐구합니다.",
  cover_image: "https://picsum.photos/seed/ds-banner-1/1200/600",
  tags: [],
  category: "Design",
  is_pinned: true,
  published: true,
  language: "ko",
  view_count: 0,
  like_count: 0,
  created_at: "",
  updated_at: "",
  title_en: "The Art of Visual Storytelling",
  content_en: "",
  excerpt_en: "Exploring the intersection of design, photography, and narrative through a modern digital lens.",
  post_number: 0,
  series_id: null,
  series_order: 0,
};
const MOCK_POSTS: Post[] = [
  MOCK_POST,
  { ...MOCK_POST, id: "demo-2", title: "모던 인터페이스 구축하기", title_en: "Building Modern Interfaces", category: "Frontend", excerpt: "컴포넌트 아키텍처와 디자인 시스템에 대한 깊은 탐구.", excerpt_en: "A deep dive into component architecture and design systems.", cover_image: "https://picsum.photos/seed/ds-banner-2/1200/600" },
  { ...MOCK_POST, id: "demo-3", title: "대규모 성능 최적화", title_en: "Performance at Scale", category: "DevOps", excerpt: "높은 트래픽 환경에서 웹 애플리케이션을 최적화하는 기법.", excerpt_en: "Techniques for optimizing web applications under heavy load.", cover_image: "https://picsum.photos/seed/ds-banner-3/1200/600" },
];

// ─── TOC Data ───
const tocSections = [
  { id: "colors", label: "Colors" },
  { id: "alpha", label: "Alpha" },
  { id: "semantic", label: "Semantic" },
  { id: "typography", label: "Typography" },
  { id: "spacing", label: "Spacing" },
  { id: "radius", label: "Radius" },
  { id: "shadows", label: "Shadows" },
  { id: "motion", label: "Motion" },
  { id: "z-index", label: "Z-Index" },
  { id: "components", label: "Components" },
  { id: "tooltip", label: "Tooltip" },
  { id: "banner", label: "Banner Layouts" },
];


export default function DesignSystemPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const { language } = useLanguage();
  const { setInfinite, scrollTo, lenis, stop, start } = useLenis();
  const { isLoading: isScreenLoading } = useLoadingScreen();
  const { openModal } = useModalStore();
  const [activeSection, setActiveSection] = useState("");
  const sectionRefs = useRef<Map<string, HTMLElement>>(new Map());
  const [activePreset, setActivePreset] = useState<number | null>(null);
  const snapRef = useRef<Map<string, string> | null>(null);
  const [twReplay, setTwReplay] = useState(0);
  const [ready, setReady] = useState(false);
  const [scrollMode, setScrollMode] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    stop();
    setInfinite(false);
    window.scrollTo(0, 0);

    const timer = setTimeout(() => {
      if (lenis) {
        lenis.scrollTo(0, { immediate: true });
      }
      start();
    }, 200);

    // 스냅샷 저장 + 언마운트 시 복원
    snapRef.current = snapshotVars(document.documentElement);
    return () => {
      clearTimeout(timer);
      setInfinite(true);
      if (snapRef.current) restoreVars(document.documentElement, snapRef.current);
    };
  }, [setInfinite, lenis, stop, start]);

  const handlePresetClick = useCallback((index: number) => {
    setActivePreset((prev) => {
      if (prev === index) {
        // 같은 프리셋 다시 클릭 → 원래대로 복원
        if (snapRef.current) restoreVars(document.documentElement, snapRef.current);
        return null;
      }
      applyPresetColors(document.documentElement, theme, THEME_PRESETS[index].theme);
      return index;
    });
  }, [theme]);

  // 로딩 스크린 완료 후 애니메이션 시작 (페이드아웃 300ms 대기)
  useEffect(() => {
    if (!isScreenLoading && !ready) {
      const t = setTimeout(() => setReady(true), 300);
      return () => clearTimeout(t);
    }
  }, [isScreenLoading, ready]);

  // ready 후 4초 뒤 scroll-driven 모드 전환 (초기 animate 완료 이후)
  useEffect(() => {
    if (ready && !scrollMode) {
      const t = setTimeout(() => setScrollMode(true), 4000);
      return () => clearTimeout(t);
    }
  }, [ready, scrollMode]);

  // 라이트/다크 전환 시 활성 프리셋 재적용
  // rAF로 지연 — ThemeProvider effect(parent)가 child보다 나중에 실행되어
  // 프리셋 인라인 변수를 덮어쓰는 문제 방지
  useEffect(() => {
    if (activePreset !== null) {
      const id = requestAnimationFrame(() => {
        applyPresetColors(document.documentElement, theme, THEME_PRESETS[activePreset].theme);
      });
      return () => cancelAnimationFrame(id);
    }
  }, [theme, activePreset]);

  // IntersectionObserver로 현재 보이는 섹션 추적
  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    const entries = new Map<string, boolean>();

    sectionRefs.current.forEach((el, id) => {
      const observer = new IntersectionObserver(
        ([entry]) => {
          entries.set(id, entry.isIntersecting);
          // 가장 먼저 보이는 섹션을 active로
          for (const section of tocSections) {
            if (entries.get(section.id)) {
              setActiveSection(section.id);
              break;
            }
          }
        },
        { rootMargin: "-20% 0px -60% 0px" }
      );
      observer.observe(el);
      observers.push(observer);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, []);

  const handleTocClick = (id: string) => {
    const el = sectionRefs.current.get(id);
    if (el) {
      scrollTo(el, { offset: -100, duration: 0.8 });
    }
  };

  const setSectionRef = useCallback((id: string) => (el: HTMLElement | null) => {
    if (el) sectionRefs.current.set(id, el);
  }, []);

  const [sliderValue, setSliderValue] = useState([40]);
  const [rangeValue, setRangeValue] = useState([20, 80]);
  const [switchOn, setSwitchOn] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [checkSquare, setCheckSquare] = useState(false);
  const [checkCircle, setCheckCircle] = useState(true);
  const [checkIndet, setCheckIndet] = useState(false);
  const [selectValue, setSelectValue] = useState("option1");
  const [dpFormat, setDpFormat] = useState<"year" | "yearMonth" | "date">("date");
  const [dpDate, setDpDate] = useState({ year: "2024", month: "03", day: "15" });

  const handleBack = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      if (window.history.length > 1 && document.referrer) {
        router.back();
      } else {
        router.push("/");
      }
    }, 600);
  }, [router]);

  const handleOpenModal = (title: string, content: React.ReactNode) => {
    openModal(content, { header: { title }, closeButton: true, width: "420px" });
  };

  // Phase 1 (not ready): initial="hidden" + CSS opacity:0 → 완전 숨김
  // Phase 2 (ready):     animate="visible" + custom delay → 순차 등장
  // Phase 3 (scrollMode): whileInView → 스크롤 기반 등장/퇴장
  let _seq = 0;
  const nd = (step = 0.15) => { const v = _seq; _seq += step; return v; };

  // 단독 요소용: scrollMode 에서도 whileInView 유지
  const vp = (delay: number) =>
    isExiting
      ? { animate: "hidden" as const, custom: delay }
      : scrollMode
        ? { whileInView: "visible" as const, viewport: viewportOpts }
        : ready
          ? { animate: "visible" as const, custom: delay }
          : {};

  // 컨테이너 부모용: scrollMode 에서는 빈 객체 — 자식들이 독립 whileInView 로 제어
  const vpGroup = (delay: number) =>
    isExiting
      ? { animate: "hidden" as const, custom: delay }
      : scrollMode
        ? {}
        : ready
          ? { animate: "visible" as const, custom: delay }
          : {};

  // 수평 자식 (staggerItemX): 좌→우 등장 / 우→좌 소멸
  const scrollChildX = (i: number, total: number) =>
    !isExiting && scrollMode
      ? {
          initial: "hidden" as const,
          whileInView: "visible" as const,
          viewport: viewportOpts,
          custom: [i * 0.05, (total - 1 - i) * 0.05] as [number, number],
        }
      : {};

  // 수직 자식 (staggerItem): 위→아래 등장/소멸
  const scrollChildY = (i: number) =>
    !isExiting && scrollMode
      ? {
          initial: "hidden" as const,
          whileInView: "visible" as const,
          viewport: viewportOpts,
          custom: i * 0.05,
        }
      : {};

  return (
    <div className={styles.page}>
      {/* ─── TOC Sidebar ─── */}
      <nav className={styles.toc}>
        <ul className={styles.tocList}>
          {tocSections.map((s, i) => (
            <motion.li key={s.id} initial={{ opacity: 0, y: -12 }} animate={ready ? { opacity: 1, y: 0 } : undefined} transition={{ duration: 0.3, delay: i * 0.06, ease }}>
              <button
                className={`${styles.tocItem} ${activeSection === s.id ? styles.tocItemActive : ""}`}
                onClick={() => handleTocClick(s.id)}
              >
                {s.label}
              </button>
            </motion.li>
          ))}
        </ul>
      </nav>

      {/* ─── Main Content ─── */}
      <div className={`${styles.main} ${ready ? "" : styles.notReady}`}>
        <div className={styles.container}>
          {/* Header */}
          <motion.div className={styles.header} initial="hidden" {...vp(nd())} variants={staggerItem}>
            <Button
              variant="outline"
              size="sm"
              className={styles.backLink}
              onClick={handleBack}
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                  <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              }
            >
              Back
            </Button>
          </motion.div>
          <h1 className={styles.title}>Design System</h1>
          <motion.p className={styles.subtitle} initial="hidden" {...vp(nd())} variants={staggerItem}>
            Raw Tokens → Semantic Tokens → Context Variables
          </motion.p>

          {/* ─── Preset Bar ─── */}
          <motion.div className={styles.presetBar} initial="hidden" {...vpGroup(nd())} variants={staggerContainer}>
            <motion.span className={styles.presetBarLabel} variants={staggerItem} {...scrollChildY(0)}>Presets</motion.span>
            {THEME_PRESETS.map((p, i) => (
              <motion.button
                key={p.name}
                className={`${styles.presetSwatch} ${activePreset === i ? styles.presetSwatchActive : ""}`}
                onClick={() => handlePresetClick(i)}
                aria-label={p.name}
                variants={staggerItemX}
                {...scrollChildX(i, THEME_PRESETS.length)}
              >
                <div className={styles.presetSwatchInner} style={{ background: p.theme.accentColor }} />
                <span className={styles.presetName}>{p.name}</span>
              </motion.button>
            ))}
          </motion.div>

          {/* ─── Colors ─── */}
          <section id="colors" ref={setSectionRef("colors")} className={styles.section}>
            <h2 className={styles.sectionTitle}>Colors</h2>
            <motion.p className={styles.sectionSub} initial="hidden" {...vp(nd())} variants={staggerItem}>Brand</motion.p>
            <motion.div className={styles.brandRow} initial="hidden" {...vpGroup(nd())} variants={staggerContainer}>
              {brandColors.map((c, i) => (
                <motion.div key={c.name} className={styles.brandSwatch} variants={staggerItemX} {...scrollChildX(i, brandColors.length)}>
                  <div className={styles.brandBox} style={{ background: `var(${c.var})` }} />
                  <span className={styles.colorLabel}>{c.name}</span>
                </motion.div>
              ))}
            </motion.div>
            <motion.p className={styles.sectionSub} initial="hidden" {...vp(nd())} variants={staggerItem}>Neutral Scale</motion.p>
            <motion.div className={styles.colorGrid} initial="hidden" {...vpGroup(nd())} variants={staggerContainer}>
              {neutralScale.map((n, i) => (
                <motion.div key={n} className={styles.colorSwatch} variants={staggerItemX} {...scrollChildX(i, neutralScale.length)}>
                  <div className={`${styles.colorBox} ${styles.colorBoxBordered}`} style={{ background: `var(--color-neutral-${n})` }} />
                  <span className={styles.colorLabel}>{n}</span>
                </motion.div>
              ))}
            </motion.div>
          </section>

          {/* ─── Alpha Variants ─── */}
          <section id="alpha" ref={setSectionRef("alpha")} className={styles.section}>
            <h2 className={styles.sectionTitle}>Alpha Variants</h2>
            <motion.p className={styles.sectionSub} initial="hidden" {...vp(nd())} variants={staggerItem}>Accent Alpha</motion.p>
            <motion.div className={styles.alphaRow} initial="hidden" {...vpGroup(nd())} variants={staggerContainer}>
              {alphaSteps.map((a, i) => (
                <motion.div key={a} style={{ flex: 1, textAlign: "center" }} variants={staggerItemX} {...scrollChildX(i, alphaSteps.length)}>
                  <div className={styles.alphaBar} style={{ background: `var(--color-accent-alpha-${a})`, height: `${8 + a * 0.4}px` }} />
                  <div className={styles.alphaLabel}>{a}%</div>
                </motion.div>
              ))}
            </motion.div>
            <motion.p className={styles.sectionSub} initial="hidden" {...vp(nd())} variants={staggerItem}>Neutral Alpha</motion.p>
            <motion.div className={styles.alphaRow} initial="hidden" {...vpGroup(nd())} variants={staggerContainer}>
              {alphaSteps.map((a, i) => (
                <motion.div key={a} style={{ flex: 1, textAlign: "center" }} variants={staggerItemX} {...scrollChildX(i, alphaSteps.length)}>
                  <div className={styles.alphaBar} style={{ background: `var(--color-neutral-alpha-${a})`, height: `${8 + a * 0.4}px` }} />
                  <div className={styles.alphaLabel}>{a}%</div>
                </motion.div>
              ))}
            </motion.div>
          </section>

          {/* ─── Semantic Colors ─── */}
          <section id="semantic" ref={setSectionRef("semantic")} className={styles.section}>
            <h2 className={styles.sectionTitle}>Semantic Colors</h2>
            <motion.div className={styles.semanticGrid} initial="hidden" {...vpGroup(nd())} variants={innerStaggerFast}>
              {semanticColors.map((c, i) => (
                <motion.div key={c.name} className={styles.semanticItem} variants={staggerItemX} {...scrollChildX(i, semanticColors.length)}>
                  <div className={styles.semanticDot} style={{ background: `var(${c.name})` }} />
                  <div className={styles.semanticInfo}>
                    <span className={styles.semanticName}>{c.name}</span>
                    <span className={styles.semanticRef}>{c.ref}</span>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </section>

          {/* ─── Typography ─── */}
          <section id="typography" ref={setSectionRef("typography")} className={styles.section}>
            <h2 className={styles.sectionTitle}>Typography</h2>
            <motion.p className={styles.sectionSub} initial="hidden" {...vp(nd())} variants={staggerItem}>Variants</motion.p>
            <motion.div className={styles.typoRow} initial="hidden" {...vpGroup(nd())} variants={staggerContainer}>
              {typoVariants.map((v, i) => (
                <motion.div key={v} className={styles.typoItem} variants={staggerItem} {...scrollChildY(i)}>
                  <span className={styles.typoLabel}>{v}</span>
                  <Typography variant={v}>Design tokens in action</Typography>
                </motion.div>
              ))}
            </motion.div>
            <motion.p className={styles.sectionSub} initial="hidden" {...vp(nd())} variants={staggerItem}>Colors</motion.p>
            <motion.div className={styles.typoRow} initial="hidden" {...vpGroup(nd())} variants={staggerContainer}>
              {typoColors.map((c, i) => (
                <motion.div key={c} className={styles.typoItem} variants={staggerItem} {...scrollChildY(i)}>
                  <span className={styles.typoLabel}>{c}</span>
                  <Typography variant="h5" color={c}>{c} color</Typography>
                </motion.div>
              ))}
            </motion.div>
            <motion.p className={styles.sectionSub} initial="hidden" {...vp(nd())} variants={staggerItem}>Gradient Tokens</motion.p>
            <motion.div style={{ display: "flex", flexDirection: "column", gap: 12 }} initial="hidden" {...vpGroup(nd())} variants={staggerContainer}>
              <motion.div style={{ display: "flex", alignItems: "center", gap: 16 }} variants={staggerItem} {...scrollChildY(0)}>
                <Typography variant="h3" gradient>--gradient-accent</Typography>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-muted)" }}>accent-light → accent-dark</span>
              </motion.div>
              <motion.div style={{ display: "flex", alignItems: "center", gap: 16 }} variants={staggerItem} {...scrollChildY(1)}>
                <span style={{ background: "var(--gradient-accent-soft)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}><Typography variant="h3">--gradient-accent-soft</Typography></span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-muted)" }}>accent-light → accent</span>
              </motion.div>
              <motion.div style={{ display: "flex", alignItems: "center", gap: 16 }} variants={staggerItem} {...scrollChildY(2)}>
                <span style={{ background: "var(--gradient-neutral)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}><Typography variant="h3">--gradient-neutral</Typography></span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-muted)" }}>neutral-300 → neutral-700</span>
              </motion.div>
            </motion.div>
            <motion.p className={styles.sectionSub} initial="hidden" {...vp(nd())} variants={staggerItem}>Weights</motion.p>
            <motion.div className={styles.componentRow} initial="hidden" {...vpGroup(nd())} variants={staggerContainer}>
              {(["light", "normal", "medium", "semibold", "bold"] as const).map((w, i) => (
                <motion.div key={w} variants={staggerItemX} {...scrollChildX(i, 5)}>
                  <Typography variant="body1" weight={w}>{w}</Typography>
                </motion.div>
              ))}
            </motion.div>
          </section>

          {/* ─── Spacing ─── */}
          <section id="spacing" ref={setSectionRef("spacing")} className={styles.section}>
            <h2 className={styles.sectionTitle}>Spacing</h2>
            <motion.div className={styles.spacingRow} initial="hidden" {...vpGroup(nd())} variants={staggerContainer}>
              {spacingScale.map((s, i) => (
                <motion.div key={s.name} className={styles.spacingItem} variants={staggerItem} {...scrollChildY(i)}>
                  <span className={styles.spacingLabel}>{s.name.replace("--spacing-", "")}</span>
                  <div className={styles.spacingBar} style={{ width: `var(${s.name})` }} />
                  <span className={styles.spacingValue}>{s.value}</span>
                </motion.div>
              ))}
            </motion.div>
          </section>

          {/* ─── Radius ─── */}
          <section id="radius" ref={setSectionRef("radius")} className={styles.section}>
            <h2 className={styles.sectionTitle}>Border Radius</h2>
            <motion.div className={styles.radiusGrid} initial="hidden" {...vpGroup(nd())} variants={innerStaggerFast}>
              {radiusScale.map((r, i) => {
                const h = 64;
                const w = r.name === "capsule" ? 160 : r.name === "circle" ? 64 : Math.min(96, Math.max(64, parseInt(r.value, 10) * 3));
                return (
                  <motion.div key={r.name} className={styles.radiusItem} variants={staggerItemX} {...scrollChildX(i, radiusScale.length)}>
                    <div className={styles.radiusBox} style={{ borderRadius: `var(${r.var})`, width: w, height: h }} />
                    <span className={styles.radiusLabel}>{r.name}<br />{r.value}</span>
                  </motion.div>
                );
              })}
            </motion.div>
          </section>

          {/* ─── Shadows ─── */}
          <section id="shadows" ref={setSectionRef("shadows")} className={styles.section}>
            <h2 className={styles.sectionTitle}>Shadows</h2>
            <motion.div className={styles.shadowGrid} initial="hidden" {...vpGroup(nd())} variants={innerStagger}>
              {shadowScale.map((s, i) => (
                <motion.div key={s} className={styles.shadowItem} variants={staggerItemX} {...scrollChildX(i, shadowScale.length)}>
                  <div className={styles.shadowBox} style={{ boxShadow: `var(${s})` }} />
                  <span className={styles.shadowLabel}>{s.replace("--shadow-", "")}</span>
                </motion.div>
              ))}
            </motion.div>
          </section>

          {/* ─── Motion ─── */}
          <section id="motion" ref={setSectionRef("motion")} className={styles.section}>
            <h2 className={styles.sectionTitle}>Motion</h2>
            <motion.div initial="hidden" {...vpGroup(nd())} variants={staggerContainer}>
              <p className={styles.sectionSub}>Duration</p>
              <div className={styles.motionGrid}>
                {durations.map((d, i) => (
                  <motion.div key={d.name} className={styles.motionItem} variants={staggerItemX} {...scrollChildX(i, durations.length)}>
                    <div className={styles.motionName}>{d.name.replace("--duration-", "")}</div>
                    <div className={styles.motionValue}>{d.value}</div>
                    <div className={styles.motionBar} style={{ transition: `transform var(${d.name}) var(--ease-material)` }} />
                  </motion.div>
                ))}
              </div>
            </motion.div>
            <motion.div initial="hidden" {...vpGroup(nd())} variants={staggerContainer}>
              <p className={styles.sectionSub}>Easing</p>
              <div className={styles.motionGrid}>
                {easings.map((e, i) => (
                  <motion.div key={e.name} className={styles.motionItem} variants={staggerItemX} {...scrollChildX(i, easings.length)}>
                    <div className={styles.motionName}>{e.name.replace("--ease-", "")}</div>
                    <div className={styles.motionValue}>{e.value}</div>
                    <div className={styles.motionBar} style={{ transition: `transform var(--duration-slow) var(${e.name})` }} />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </section>

          {/* ─── Z-index ─── */}
          <section id="z-index" ref={setSectionRef("z-index")} className={styles.section}>
            <h2 className={styles.sectionTitle}>Z-Index</h2>
            <motion.div initial="hidden" {...vpGroup(nd())} variants={staggerContainer}>
              <div className={styles.zStack}>
                {zScale.map((z, i) => (
                  <motion.div
                    key={z.name}
                    className={styles.zLayer}
                    style={{ top: `${i * 44}px`, left: `${i * 20}px`, width: `calc(100% - ${i * 40}px)` }}
                    variants={staggerItem}
                    {...scrollChildY(i)}
                  >
                    <strong>{z.label}</strong>
                    <span style={{ color: "var(--text-muted)" }}>{z.name} = {z.value}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </section>

          {/* ─── Components ─── */}
          <section id="components" ref={setSectionRef("components")} className={styles.section}>
            <h2 className={styles.sectionTitle}>Components</h2>

            {/* Logo */}
            <motion.div className={styles.componentGroup} initial="hidden" {...vpGroup(nd())} variants={staggerContainer}>
              <div className={styles.componentGroupTitle}>Logo</div>
              <div className={styles.logoRow}>
                <motion.div className={styles.logoItem} variants={staggerItemX} {...scrollChildX(0, 2)}>
                  <Logo variant="short" as="span" />
                  <span className={styles.logoLabel}>short</span>
                </motion.div>
                <motion.div className={styles.logoItem} variants={staggerItemX} {...scrollChildX(1, 2)}>
                  <Logo variant="full" as="span" />
                  <span className={styles.logoLabel}>full</span>
                </motion.div>
              </div>
            </motion.div>

            {/* CategoryLabel */}
            <motion.div className={styles.componentGroup} initial="hidden" {...vpGroup(nd())} variants={staggerContainer}>
              <div className={styles.componentGroupTitle}>CategoryLabel</div>
              <p className={styles.sectionSub} style={{ marginTop: -4, textTransform: "none" }}>{language === "ko" ? "카테고리를 현재 언어에 맞게 자동 번역" : "Auto-translates category labels to current language"}</p>
              <div className={styles.componentRow}>
                {["프론트엔드", "백엔드", "DevOps", "알고리즘", "CS"].map((cat, i) => (
                  <motion.div key={cat} variants={staggerItemX} {...scrollChildX(i, 5)}>
                    <Tooltip content={`ko: ${cat}`}>
                      <span style={{ fontFamily: "var(--font-space-grotesk)", fontSize: "var(--font-size-xs)", fontWeight: 500, color: "var(--color-accent)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                        <CategoryLabel category={cat} />
                      </span>
                    </Tooltip>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Button — Variants */}
            <motion.div className={styles.componentGroup} initial="hidden" {...vpGroup(nd())} variants={staggerContainer}>
              <div className={styles.componentGroupTitle}>Button — Variants</div>
              <div className={styles.componentRow}>
                <motion.div variants={staggerItemX} {...scrollChildX(0, 4)}><Tooltip content="variant: primary"><Button variant="primary">Primary</Button></Tooltip></motion.div>
                <motion.div variants={staggerItemX} {...scrollChildX(1, 4)}><Tooltip content="variant: outline"><Button variant="outline">Outline</Button></Tooltip></motion.div>
                <motion.div variants={staggerItemX} {...scrollChildX(2, 4)}><Tooltip content="variant: ghost"><Button variant="ghost">Ghost</Button></Tooltip></motion.div>
                <motion.div variants={staggerItemX} {...scrollChildX(3, 4)}><Tooltip content="disabled"><Button disabled>Disabled</Button></Tooltip></motion.div>
              </div>
            </motion.div>

            {/* Button — Sizes */}
            <motion.div className={styles.componentGroup} initial="hidden" {...vpGroup(nd())} variants={staggerContainer}>
              <div className={styles.componentGroupTitle}>Button — Sizes</div>
              <div className={styles.componentRow}>
                <motion.div variants={staggerItemX} {...scrollChildX(0, 5)}><Tooltip content="size: xs"><Button variant="outline" size="xs">XS</Button></Tooltip></motion.div>
                <motion.div variants={staggerItemX} {...scrollChildX(1, 5)}><Tooltip content="size: sm"><Button variant="outline" size="sm">Small</Button></Tooltip></motion.div>
                <motion.div variants={staggerItemX} {...scrollChildX(2, 5)}><Tooltip content="size: md"><Button variant="outline" size="md">Medium</Button></Tooltip></motion.div>
                <motion.div variants={staggerItemX} {...scrollChildX(3, 5)}><Tooltip content="size: lg"><Button variant="outline" size="lg">Large</Button></Tooltip></motion.div>
                <motion.div variants={staggerItemX} {...scrollChildX(4, 5)}><Tooltip content="size: xl"><Button variant="outline" size="xl">XL</Button></Tooltip></motion.div>
              </div>
            </motion.div>

            {/* Button — Shapes */}
            <motion.div className={styles.componentGroup} initial="hidden" {...vpGroup(nd())} variants={staggerContainer}>
              <div className={styles.componentGroupTitle}>Button — Shapes</div>
              <div className={styles.componentRow}>
                <motion.div variants={staggerItemX} {...scrollChildX(0, 3)}><Tooltip content="shape: circle, primary"><Button variant="primary" shape="circle" icon={<Star size={16} />} /></Tooltip></motion.div>
                <motion.div variants={staggerItemX} {...scrollChildX(1, 3)}><Tooltip content="shape: circle, outline"><Button variant="outline" shape="circle" icon={<Mail size={16} />} /></Tooltip></motion.div>
                <motion.div variants={staggerItemX} {...scrollChildX(2, 3)}><Tooltip content="shape: square, ghost"><Button variant="ghost" shape="square" icon={<Zap size={16} />} /></Tooltip></motion.div>
              </div>
            </motion.div>

            {/* Button — Icons & States */}
            <motion.div className={styles.componentGroup} initial="hidden" {...vpGroup(nd())} variants={staggerContainer}>
              <div className={styles.componentGroupTitle}>Button — Icons & States</div>
              <div className={styles.componentRow}>
                <motion.div variants={staggerItemX} {...scrollChildX(0, 4)}><Tooltip content="icon + text"><Button variant="primary" icon={<Send size={16} />}>Send</Button></Tooltip></motion.div>
                <motion.div variants={staggerItemX} {...scrollChildX(1, 4)}><Tooltip content="iconPosition: right"><Button variant="outline" icon={<ArrowRight size={16} />} iconPosition="right">Next</Button></Tooltip></motion.div>
                <motion.div variants={staggerItemX} {...scrollChildX(2, 4)}><Tooltip content="active state"><Button variant="outline" active>Active</Button></Tooltip></motion.div>
                <motion.div variants={staggerItemX} {...scrollChildX(3, 4)}><Tooltip content="fullWidth"><Button variant="outline" fullWidth>Full Width</Button></Tooltip></motion.div>
              </div>
            </motion.div>

            {/* TextLink */}
            <motion.div className={styles.componentGroup} initial="hidden" {...vpGroup(nd())} variants={staggerContainer}>
              <div className={styles.componentGroupTitle}>TextLink</div>
              <div className={styles.componentRow}>
                <motion.div variants={staggerItemX} {...scrollChildX(0, 2)}><TextLink href="/design-system">Internal Link</TextLink></motion.div>
                <motion.div variants={staggerItemX} {...scrollChildX(1, 2)}><TextLink href="https://fonts.google.com" external>External Link ↗</TextLink></motion.div>
              </div>
            </motion.div>

            {/* Input */}
            <motion.div className={styles.componentGroup} initial="hidden" {...vpGroup(nd())} variants={staggerContainer}>
              <div className={styles.componentGroupTitle}>Input</div>
              <div className={styles.sliderRow}>
                <motion.div className={styles.sliderItem} variants={staggerItemX} {...scrollChildX(0, 2)}>
                  <Input label="Label" value={inputValue} onChange={setInputValue} placeholder="Type something..." />
                </motion.div>
                <motion.div className={styles.sliderItem} variants={staggerItemX} {...scrollChildX(1, 2)}>
                  <Input value="Read-only value" onChange={() => {}} disabled />
                </motion.div>
              </div>
            </motion.div>

            {/* Checkbox */}
            <motion.div className={styles.componentGroup} initial="hidden" {...vpGroup(nd())} variants={staggerContainer}>
              <div className={styles.componentGroupTitle}>Checkbox</div>
              <div className={styles.componentRow}>
                <motion.div variants={staggerItemX} {...scrollChildX(0, 4)}><Tooltip content="shape: square"><Checkbox checked={checkSquare} onChange={setCheckSquare} shape="square" label="Square" /></Tooltip></motion.div>
                <motion.div variants={staggerItemX} {...scrollChildX(1, 4)}><Tooltip content="shape: circle"><Checkbox checked={checkCircle} onChange={setCheckCircle} shape="circle" label="Circle" /></Tooltip></motion.div>
                <motion.div variants={staggerItemX} {...scrollChildX(2, 4)}><Tooltip content="indeterminate"><Checkbox checked={checkIndet} onChange={setCheckIndet} indeterminate label="Indeterminate" /></Tooltip></motion.div>
                <motion.div variants={staggerItemX} {...scrollChildX(3, 4)}><Tooltip content="disabled"><Checkbox checked={false} onChange={() => {}} disabled label="Disabled" /></Tooltip></motion.div>
              </div>
            </motion.div>

            {/* Switch */}
            <motion.div className={styles.componentGroup} initial="hidden" {...vpGroup(nd())} variants={staggerContainer}>
              <div className={styles.componentGroupTitle}>Switch</div>
              <div className={styles.componentRow}>
                <motion.div variants={staggerItemX} {...scrollChildX(0, 4)}>
                  <Tooltip content="interactive"><Switch checked={switchOn} onCheckedChange={setSwitchOn} /></Tooltip>
                </motion.div>
                <motion.div variants={staggerItemX} {...scrollChildX(1, 4)}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--text-muted)", display: "inline-block", minWidth: "24px", textAlign: "center" }}>
                    {switchOn ? "ON" : "OFF"}
                  </span>
                </motion.div>
                <motion.div variants={staggerItemX} {...scrollChildX(2, 4)}><Tooltip content="disabled off"><Switch disabled /></Tooltip></motion.div>
                <motion.div variants={staggerItemX} {...scrollChildX(3, 4)}><Tooltip content="disabled on"><Switch disabled defaultChecked /></Tooltip></motion.div>
              </div>
            </motion.div>

            {/* Slider */}
            <motion.div className={styles.componentGroup} initial="hidden" {...vpGroup(nd())} variants={staggerContainer}>
              <div className={styles.componentGroupTitle}>Slider</div>
              <div className={styles.sliderRow}>
                <motion.div className={styles.sliderItem} variants={staggerItemX} {...scrollChildX(0, 3)}>
                  <span className={styles.sliderLabel}>Single — {sliderValue[0]}</span>
                  <Slider value={sliderValue} onValueChange={setSliderValue} max={100} step={1} />
                </motion.div>
                <motion.div className={styles.sliderItem} variants={staggerItemX} {...scrollChildX(1, 3)}>
                  <span className={styles.sliderLabel}>Range — {rangeValue[0]}~{rangeValue[1]}</span>
                  <Slider value={rangeValue} onValueChange={setRangeValue} max={100} step={1} />
                </motion.div>
                <motion.div className={styles.sliderItem} variants={staggerItemX} {...scrollChildX(2, 3)}>
                  <span className={styles.sliderLabel}>Disabled</span>
                  <Slider defaultValue={[60]} max={100} disabled />
                </motion.div>
              </div>
            </motion.div>

            {/* Modal */}
            <motion.div className={styles.componentGroup} initial="hidden" {...vpGroup(nd())} variants={staggerContainer}>
              <div className={styles.componentGroupTitle}>Modal</div>
              <div className={styles.modalDemo}>
                <motion.div variants={staggerItemX} {...scrollChildX(0, 3)}>
                  <Tooltip content="Modal with header + actions">
                    <Button
                      variant="outline"
                      onClick={() => handleOpenModal("Confirm Action", (
                        <div className={styles.modalContent}>
                          <Typography variant="body1" color="secondary">Are you sure you want to proceed? This action cannot be undone.</Typography>
                          <div className={styles.modalActions}>
                            <Button variant="ghost" size="sm" onClick={() => useModalStore.getState().closeModal()}>Cancel</Button>
                            <Button variant="primary" size="sm" onClick={() => useModalStore.getState().closeModal()}>Confirm</Button>
                          </div>
                        </div>
                      ))}
                    >
                      Confirm
                    </Button>
                  </Tooltip>
                </motion.div>
                <motion.div variants={staggerItemX} {...scrollChildX(1, 3)}>
                  <Tooltip content="Modal with icon + centered layout">
                    <Button
                      variant="outline"
                      icon={<Star size={16} />}
                      onClick={() => handleOpenModal("Feature Highlight", (
                        <div className={styles.modalContentCenter}>
                          <Zap size={48} color="var(--color-accent)" />
                          <Typography variant="h4">Design Tokens</Typography>
                          <Typography variant="body2" color="secondary">A 3-layer token system powering every component with raw, semantic, and contextual variables.</Typography>
                        </div>
                      ))}
                    >
                      Showcase
                    </Button>
                  </Tooltip>
                </motion.div>
                <motion.div variants={staggerItemX} {...scrollChildX(2, 3)}>
                  <Tooltip content="Modal without header">
                    <Button
                      variant="outline"
                      onClick={() => openModal((
                        <div className={styles.modalContentCompact}>
                          <Typography variant="body2" color="secondary">Minimal modal without a header. Useful for quick notifications or lightweight confirmations.</Typography>
                        </div>
                      ), { closeButton: true, width: "420px" })}
                    >
                      No Header
                    </Button>
                  </Tooltip>
                </motion.div>
              </div>
            </motion.div>

            {/* Select / Dropdown */}
            <motion.div className={styles.componentGroup} initial="hidden" {...vpGroup(nd())} variants={staggerContainer}>
              <div className={styles.componentGroupTitle}>Select / Dropdown</div>
              <div className={styles.sliderRow}>
                <motion.div className={styles.sliderItem} variants={staggerItemX} {...scrollChildX(0, 1)}>
                  <Tooltip content="Custom dropdown select">
                    <Select
                      value={selectValue}
                      options={[
                        { value: "option1", label: "Option One" },
                        { value: "option2", label: "Option Two" },
                        { value: "option3", label: "Option Three" },
                      ]}
                      onChange={setSelectValue}
                      placeholder="Choose..."
                    />
                  </Tooltip>
                </motion.div>
              </div>
            </motion.div>

            {/* DatePicker */}
            <motion.div className={styles.componentGroup} initial="hidden" {...vpGroup(nd())} variants={staggerContainer}>
              <div className={styles.componentGroupTitle}>DatePicker</div>
              <motion.div variants={staggerItemX} {...scrollChildX(0, 1)} style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-md)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-sm)" }}>
                  <span style={{ fontSize: "var(--font-size-xs)", color: "var(--text-tertiary)" }}>Format</span>
                  <div style={{ display: "flex", border: "1px solid var(--border-tertiary-color)", borderRadius: "var(--radius-capsule)", overflow: "hidden" }}>
                    {(["year", "yearMonth", "date"] as const).map((f, i, arr) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setDpFormat(f)}
                        style={{
                          padding: "var(--spacing-2xs) var(--spacing-sm)",
                          border: "none",
                          borderRight: i < arr.length - 1 ? "1px solid var(--border-tertiary-color)" : "none",
                          borderRadius: 0,
                          background: dpFormat === f ? "var(--text-primary)" : "transparent",
                          color: dpFormat === f ? "var(--bg-primary)" : "var(--text-secondary)",
                          fontSize: "var(--font-size-xs)",
                          fontFamily: "var(--font-space-grotesk)",
                          cursor: "pointer",
                        }}
                      >
                        {f === "year" ? (language === "ko" ? "연도" : "Year") : f === "yearMonth" ? (language === "ko" ? "연.월" : "Y.M") : (language === "ko" ? "연.월.일" : "Y.M.D")}
                      </button>
                    ))}
                  </div>
                  <span style={{ fontSize: "var(--font-size-xs)", color: "var(--text-primary)", marginLeft: "var(--spacing-xs)", fontFamily: "var(--font-space-grotesk)", fontWeight: 600 }}>
                    {dpFormat === "year" ? dpDate.year : dpFormat === "yearMonth" ? `${dpDate.year}.${dpDate.month}` : `${dpDate.year}.${dpDate.month}.${dpDate.day}`}
                  </span>
                </div>
                <div style={{ display: "flex", gap: "var(--spacing-lg)", flexWrap: "wrap", alignItems: "flex-start" }}>
                  <div style={{ minWidth: 230 }}>
                    <div style={{ display: "inline-block", fontSize: "var(--font-size-xs)", color: "var(--text-tertiary)", marginBottom: "var(--spacing-xs)", padding: "var(--spacing-2xs) var(--spacing-sm)", border: "1px solid var(--border-tertiary-color)", borderRadius: "var(--radius-capsule)" }}>Spinner</div>
                    <div style={{ border: "1px solid var(--border-tertiary-color)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
                      <DatePicker
                        year={dpDate.year}
                        month={dpDate.month}
                        day={dpDate.day}
                        format={dpFormat}
                        mode="spinner"
                        language={language}
                        onSelect={(y, m, d) => setDpDate({ year: y, month: m, day: d })}
                      />
                    </div>
                  </div>
                  <div style={{ minWidth: 230 }}>
                    <div style={{ display: "inline-block", fontSize: "var(--font-size-xs)", color: "var(--text-tertiary)", marginBottom: "var(--spacing-xs)", padding: "var(--spacing-2xs) var(--spacing-sm)", border: "1px solid var(--border-tertiary-color)", borderRadius: "var(--radius-capsule)" }}>Calendar</div>
                    <div style={{ border: "1px solid var(--border-tertiary-color)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
                      <DatePicker
                        year={dpDate.year}
                        month={dpDate.month}
                        day={dpDate.day}
                        format={dpFormat}
                        mode="calendar"
                        language={language}
                        onSelect={(y, m, d) => setDpDate({ year: y, month: m, day: d })}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>

            {/* TypeWriter */}
            <motion.div className={styles.componentGroup} initial="hidden" {...vpGroup(nd())} variants={staggerContainer}>
              <div className={styles.componentGroupTitle}>TypeWriter</div>
              <motion.div className={styles.typewriterDemo} variants={staggerItemX} {...scrollChildX(0, 1)}>
                <TypeWriter text="Design tokens bring consistency." typingSpeed={80} caption="— Design System" fontSize="var(--font-size-xl)" align="center" replayTrigger={twReplay} />
                <button className={styles.replayBtn} onClick={() => setTwReplay((n) => n + 1)} aria-label="Replay">
                  <RotateCcw size={14} />
                </button>
              </motion.div>
            </motion.div>
          </section>

          {/* ─── Tooltip ─── */}
          <section id="tooltip" ref={setSectionRef("tooltip")} className={styles.section}>
            <h2 className={styles.sectionTitle}>Tooltip</h2>
            <motion.div className={styles.componentGroup} initial="hidden" {...vpGroup(nd())} variants={staggerContainer}>
              <div className={styles.componentGroupTitle}>Basic</div>
              <div className={styles.componentRow}>
                <motion.div variants={staggerItemX} {...scrollChildX(0, 4)}>
                  <Tooltip content="Instant tooltip"><Button variant="outline" size="sm">Hover me</Button></Tooltip>
                </motion.div>
                <motion.div variants={staggerItemX} {...scrollChildX(1, 4)}>
                  <Tooltip content="Delayed 600ms" delay={600}><Button variant="outline" size="sm">Long hover</Button></Tooltip>
                </motion.div>
                <motion.div variants={staggerItemX} {...scrollChildX(2, 4)}>
                  <Tooltip content="Positioned below" placement="bottom"><Button variant="ghost" size="sm">Bottom</Button></Tooltip>
                </motion.div>
                <motion.div variants={staggerItemX} {...scrollChildX(3, 4)}>
                  <Tooltip content={<><span style={{ opacity: 0.5, marginRight: 4 }}>EN</span><span>Test JSX</span></>}>
                    <span className={styles.tooltipDemoText}>JSX content</span>
                  </Tooltip>
                </motion.div>
              </div>
            </motion.div>
            <motion.div className={styles.componentGroup} initial="hidden" {...vpGroup(nd())} variants={staggerContainer}>
              <div className={styles.componentGroupTitle}>Translation Tooltip — &lt;T&gt;</div>
              <p className={styles.sectionSub} style={{ marginTop: -4, textTransform: "none" }}>{language === "ko" ? "Hover 시 반대 언어 번역 표시 (delay: 0ms / 600ms)" : "Shows opposite language on hover (delay: 0ms / 600ms)"}</p>
              <div className={styles.componentRow}>
                <motion.div variants={staggerItemX} {...scrollChildX(0, 4)}><T k="contact.title" delay={0} className={styles.tooltipDemoText} /></motion.div>
                <motion.div variants={staggerItemX} {...scrollChildX(1, 4)}><T k="contact.send" delay={0} className={styles.tooltipDemoText} /></motion.div>
                <motion.div variants={staggerItemX} {...scrollChildX(2, 4)}><T k="contact.successTitle" className={styles.tooltipDemoText} /></motion.div>
                <motion.div variants={staggerItemX} {...scrollChildX(3, 4)}><T k="postsPage.subtitle" className={styles.tooltipDemoText} /></motion.div>
              </div>
            </motion.div>
          </section>

          {/* ─── Banner Layouts ─── */}
          <section id="banner" ref={setSectionRef("banner")} className={styles.section}>
            <h2 className={styles.sectionTitle} style={{ marginBottom: 8 }}>Banner Layouts</h2>
            <div>
              <motion.p className={styles.sectionSub} initial="hidden" whileInView="visible" viewport={viewportOpts} variants={staggerItem} style={{ marginTop: 0, marginBottom: 24, textTransform: "none" }}>{language === "ko" ? "Posts 배너 슬라이더의 4가지 레이아웃" : "4 layout variants for the Posts banner slider"}</motion.p>
              {BANNER_LAYOUTS.map((layout) => (
                <motion.div key={layout} className={styles.bannerLayoutItem} initial="hidden" whileInView="visible" viewport={viewportOpts} variants={staggerItem}>
                  <span className={styles.bannerPreviewLabel}>{BANNER_LAYOUT_LABELS[layout][language]}</span>
                  <div className={styles.bannerPreviewBox}>
                    <PostsBanner
                      posts={MOCK_POSTS}
                      imgErrors={new Set()}
                      onImgError={() => {}}
                      overrideLayout={layout}
                    />
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        </div>
      </div>

      <Modal />
    </div>
  );
}
