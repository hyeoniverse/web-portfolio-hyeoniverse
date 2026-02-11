"use client";

import { useRef, useState, useCallback, useLayoutEffect, useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}
import Image from "next/image";
import { useLenis } from "@/providers/LenisProvider";
import {
  Code,
  Palette,
  LayoutGrid,
  Zap,
  Globe,
  Mail,
} from "lucide-react";
import type { Language } from "@/providers/LanguageProvider";
import type { DesignConceptItem } from "@/data/webflow";
import styles from "../WebFlowSection.module.css";

interface DesignConceptPanelProps {
  language: Language;
  concepts: DesignConceptItem[];
}

/* ── Typography Demo ── */
const fonts = [
  { label: "Inter", family: "var(--font-inter)" },
  { label: "Instrument", family: "var(--font-instrument)" },
  { label: "JetBrains", family: "var(--font-jetbrains)" },
  { label: "Grotesk", family: "var(--font-space-grotesk)" },
];

function TypographyDemo() {
  const [activeFont, setActiveFont] = useState(0);

  return (
    <div className={styles.dcDemo}>
      <div className={styles.dcFontTabs}>
        {fonts.map((f, i) => (
          <button
            key={f.label}
            className={`${styles.dcFontTab} ${i === activeFont ? styles.dcFontTabActive : ""}`}
            onClick={() => setActiveFont(i)}
          >
            {f.label}
          </button>
        ))}
      </div>
      <div
        className={styles.dcSpecimen}
        style={{ fontFamily: fonts[activeFont].family }}
      >
        Aa Bb Cc 123
      </div>
    </div>
  );
}

/* ── Color System Demo ── */
const palettes = {
  dark: [
    { label: "primary", hex: "#D40063" },
    { label: "accent", hex: "#667EEA" },
    { label: "bg", hex: "#0A0A0A" },
    { label: "text", hex: "#F5F5F5" },
    { label: "border", hex: "#2A2A2A" },
    { label: "muted", hex: "#6B7280" },
  ],
  light: [
    { label: "primary", hex: "#D40063" },
    { label: "accent", hex: "#667EEA" },
    { label: "bg", hex: "#FFFFFF" },
    { label: "text", hex: "#111111" },
    { label: "border", hex: "#E5E5E5" },
    { label: "muted", hex: "#9CA3AF" },
  ],
};

function hexLuminance(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function ColorSystemDemo() {
  const [demoTheme, setDemoTheme] = useState<"dark" | "light">("dark");
  const swatches = palettes[demoTheme];

  return (
    <div className={styles.dcDemo}>
      <div className={styles.dcThemeToggle}>
        <button
          className={`${styles.dcThemeBtn} ${demoTheme === "light" ? styles.dcThemeBtnActive : ""}`}
          onClick={() => setDemoTheme("light")}
        >
          Light
        </button>
        <button
          className={`${styles.dcThemeBtn} ${demoTheme === "dark" ? styles.dcThemeBtnActive : ""}`}
          onClick={() => setDemoTheme("dark")}
        >
          Dark
        </button>
      </div>
      <div className={styles.dcSwatchRow}>
        {swatches.map((s) => (
          <div
            key={s.label}
            className={styles.dcSwatch}
            style={{
              backgroundColor: s.hex,
              color: hexLuminance(s.hex) > 0.5 ? "#111" : "rgba(255,255,255,0.8)",
            }}
            title={`${s.label}: ${s.hex}`}
          >
            {s.label.slice(0, 2)}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Motion & Scroll Demo ── */
function MotionScrollDemo() {
  const { lenis } = useLenis();
  const ballRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!lenis || !ballRef.current || !trackRef.current) return;

    const MAX_VELOCITY = 8;
    let rafId: number;

    const update = () => {
      const ball = ballRef.current;
      const track = trackRef.current;
      if (!ball || !track) return;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const velocity = (lenis as any).velocity as number;
      // Map velocity [-MAX, +MAX] → position [4px, trackWidth - ballWidth - 4px]
      const normalized = Math.max(-1, Math.min(1, velocity / MAX_VELOCITY));
      const trackWidth = track.clientWidth;
      const ballWidth = ball.clientWidth;
      const maxLeft = trackWidth - ballWidth - 4;
      const left = 4 + ((normalized + 1) / 2) * maxLeft;

      ball.style.left = `${left}px`;

      rafId = requestAnimationFrame(update);
    };

    rafId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(rafId);
  }, [lenis]);

  return (
    <div className={styles.dcDemo}>
      <div ref={trackRef} className={styles.dcSpringTrack}>
        <div ref={ballRef} className={styles.dcSpringBall} />
      </div>
      <div className={styles.dcMotionLabels}>
        <span>Lenis</span>
        <span>&middot;</span>
        <span>GSAP</span>
        <span>&middot;</span>
        <span>Framer Motion</span>
      </div>
    </div>
  );
}

/* ── Layout & Spacing Demo ── */
const spacingTokens = [
  { token: "2xs", px: 4 },
  { token: "xs", px: 8 },
  { token: "sm", px: 12 },
  { token: "md", px: 16 },
  { token: "lg", px: 24 },
  { token: "xl", px: 32 },
  { token: "2xl", px: 48 },
];

function LayoutSpacingDemo() {
  const maxPx = spacingTokens[spacingTokens.length - 1].px;

  return (
    <div className={styles.dcDemo}>
      <div className={styles.dcSpacingList}>
        {spacingTokens.map((t) => (
          <div key={t.token} className={styles.dcSpacingRow}>
            <span className={styles.dcSpacingLabel}>{t.token}</span>
            <div
              className={styles.dcSpacingBar}
              style={{ width: `${(t.px / maxPx) * 100}%` }}
            />
            <span className={styles.dcSpacingPx}>{t.px}px</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Grid System Demo (Breakpoint bars) ── */
const breakpoints = [
  { name: "XS", px: 320 },
  { name: "SM", px: 480 },
  { name: "MD", px: 768 },
  { name: "LG", px: 1024 },
  { name: "XL", px: 1280 },
  { name: "2XL", px: 1440 },
  { name: "4K", px: 1920 },
];

function GridSystemDemo() {
  const maxPx = breakpoints[breakpoints.length - 1].px;

  return (
    <div className={styles.dcDemo}>
      <div className={styles.dcBreakpoints}>
        {breakpoints.map((bp) => (
          <div
            key={bp.name}
            className={styles.dcBpBar}
            style={{ height: `${(bp.px / maxPx) * 100}%` }}
          >
            <span className={styles.dcBpName}>{bp.name}</span>
            <span className={styles.dcBpLabel}>{bp.px}px</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Iconography Demo (icon grid + toggle) ── */
const lucideIcons = [
  { icon: Code, label: "Code" },
  { icon: Palette, label: "Palette" },
  { icon: LayoutGrid, label: "Layout" },
  { icon: Zap, label: "Zap" },
  { icon: Globe, label: "Globe" },
  { icon: Mail, label: "Mail" },
];

function IconographyDemo() {
  return (
    <div className={styles.dcDemo}>
      <div className={styles.dcIconGrid}>
        {lucideIcons.map((item) => (
          <div key={item.label} className={styles.dcIconCell}>
            <item.icon size={20} />
            <span className={styles.dcIconCellLabel}>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Demo map ── */
const demoMap: Record<string, React.FC> = {
  typography: TypographyDemo,
  color: ColorSystemDemo,
  motion: MotionScrollDemo,
  layout: LayoutSpacingDemo,
  grid: GridSystemDemo,
  icons: IconographyDemo,
};

export default function DesignConceptPanel({
  language,
  concepts,
}: DesignConceptPanelProps) {
  const stackRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  /* ── 1) useLayoutEffect: set initial visual state (prevents flash) ── */
  useLayoutEffect(() => {
    const grid = stackRef.current;
    if (!grid) return;

    const cards = Array.from(
      grid.querySelectorAll<HTMLElement>(`.${styles.dcCard}`),
    );

    /* Card 0 always visible (provides fixed background + frame).
       Cards 1+ visible but bg hidden, overlay hidden — only overlays crossfade. */
    cards.forEach((card, i) => {
      if (i === 0) {
        gsap.set(card, { opacity: 1 });
      } else {
        gsap.set(card, { opacity: 1, borderColor: "transparent" });
        const bg = card.querySelector(`.${styles.dcCardBg}`);
        if (bg) gsap.set(bg, { visibility: "hidden" });
        const overlay = card.querySelector(`.${styles.dcCardOverlay}`);
        if (overlay) gsap.set(overlay, { opacity: 0 });
      }
    });
  }, []);

  /* ── 2) Desktop: RAF counter-translation + overlay switching (same as CodeHighlights) ── */
  useEffect(() => {
    if (typeof window === "undefined" || window.innerWidth <= 1024 || window.innerHeight <= 700) return;

    const grid = stackRef.current;
    if (!grid) return;

    const overlays = Array.from(
      grid.querySelectorAll<HTMLElement>(`.${styles.dcCardOverlay}`),
    );

    let rafId: number;
    let prevIndex = 0;

    const update = () => {
      if (panelRef.current && contentRef.current) {
        const rect = panelRef.current.getBoundingClientRect();
        const vw = window.innerWidth;
        const extraWidth = rect.width - vw;

        if (extraWidth > 0) {
          /* Counter-translate so content appears pinned */
          const offset = Math.max(0, Math.min(-rect.left, extraWidth));
          contentRef.current.style.transform = `translateX(${offset}px)`;

          /* Switch active overlay based on scroll progress */
          const progress = Math.max(0, Math.min(1, -rect.left / extraWidth));
          const newIndex = Math.min(
            concepts.length - 1,
            Math.floor(progress * concepts.length),
          );
          if (newIndex !== prevIndex) {
            prevIndex = newIndex;
            setActiveIndex(newIndex);
            overlays.forEach((overlay, i) => {
              overlay.style.opacity = i === newIndex ? "1" : "0";
            });
          }
        }
      }
      rafId = requestAnimationFrame(update);
    };

    rafId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(rafId);
  }, [concepts.length]);

  /* ── 3) Mobile: GSAP pin + scrub crossfade ── */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const isMobile = window.innerWidth <= 1024 || window.innerHeight <= 700;
    if (!isMobile) return;

    const content = contentRef.current;
    const panel = panelRef.current;
    const grid = stackRef.current;
    if (!content || !panel || !grid) return;

    const overlays = Array.from(
      grid.querySelectorAll<HTMLElement>(`.${styles.dcCardOverlay}`),
    );
    if (overlays.length < 2) return;
    const count = overlays.length;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: content,
          start: "top top",
          end: `+=${count * 500}`,
          pin: true,
          pinSpacing: true,
          scrub: 0.5,
        },
      });
      tl.to({}, { duration: 1.0 });
      for (let i = 0; i < count - 1; i++) {
        tl.to(overlays[i], { opacity: 0, duration: 0.5 });
        tl.to(overlays[i + 1], { opacity: 1, duration: 0.5 }, "<");
        tl.to({}, { duration: 1.0 });
      }
    }, panel);

    return () => ctx.revert();
  }, []);

  const handleDotClick = useCallback(
    (index: number) => {
      if (!panelRef.current || window.innerWidth <= 1024 || window.innerHeight <= 700) return;

      const rect = panelRef.current.getBoundingClientRect();
      const extraWidth = rect.width - window.innerWidth;
      if (extraWidth <= 0) return;

      const targetProgress = (index + 0.5) / concepts.length;
      const targetLeft = -(targetProgress * extraWidth);
      const deltaScrollY = rect.left - targetLeft;

      window.scrollTo({ top: window.scrollY + deltaScrollY });
    },
    [concepts.length],
  );

  return (
    <div ref={panelRef} className={`${styles.panel} ${styles.panelExtraWide}`}>
      {/* Inner wrapper: counter-translated to appear pinned */}
      <div ref={contentRef} className={styles.dcFixed}>
        <div className={styles.dcTitleRow}>
          <div>
            <span className={styles.panelNumber}>04</span>
            <h3 className={styles.panelTitle}>
              Design Concept.
            </h3>
          </div>
          <div className={styles.dcDotNav}>
            {concepts.map((_, i) => (
              <div
                data-clickable="true"
                key={i}
                className={`${styles.dcDot} ${i === activeIndex ? styles.dcDotActive : ""}`}
                onClick={() => handleDotClick(i)}
              />
            ))}
          </div>
        </div>

        <div ref={stackRef} className={styles.dcCardStack}>
          {concepts.map((concept) => {
            const Demo = demoMap[concept.id];
            return (
              <div key={concept.id} className={styles.dcCard}>
                <div className={styles.dcCardBg}>
                  <Image
                    src={concept.image}
                    alt={concept.title}
                    fill
                    sizes="(max-width: 1024px) 100vw, 50vw"
                  />
                </div>
                <div className={styles.dcCardOverlay}>
                  <span className={styles.dcCardTitle}>{concept.title}</span>
                  <h4 className={styles.dcCardSubtitle}>
                    {concept.subtitle[language]}
                  </h4>
                  <p className={styles.dcCardDesc}>
                    {concept.description[language]}
                  </p>
                  {Demo && <Demo />}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
