"use client";

import { useState } from "react";
import Image from "next/image";
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
  return (
    <div className={styles.dcDemo}>
      <div className={styles.dcSpringTrack}>
        <div className={styles.dcSpringBall} />
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
  return (
    <div className={`${styles.panel} ${styles.panelWide}`}>
      <span className={`${styles.panelNumber} ${styles.animate}`}>04</span>
      <h3 className={`${styles.panelTitle} ${styles.animate}`}>
        Design Concept.
      </h3>

      <div className={styles.dcGrid}>
        {concepts.map((concept) => {
          const Demo = demoMap[concept.id];
          return (
            <div key={concept.id} className={`${styles.dcCard} ${styles.animate}`}>
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
  );
}
