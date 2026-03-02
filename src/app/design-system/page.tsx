"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useLenis } from "@/providers/LenisProvider";
import { Mail, Send, Star, ArrowRight, Heart, Zap } from "lucide-react";
import Button from "@/components/ui/Button";
import { Typography } from "@/components/ui/Typography";
import { Switch } from "@/components/ui/Switch";
import { Slider } from "@/components/ui/Slider";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Checkbox from "@/components/ui/Checkbox";
import { useModalStore } from "@/stores/modalStore";
import { useTheme } from "@/providers/ThemeProvider";
import { THEME_PRESETS } from "@/app/admin/(dashboard)/settings/_data/settingsConstants";
import Logo from "@/components/common/Logo";
import TypeWriter from "@/components/effects/TypeWriter";
import styles from "./DesignSystem.module.css";

// ─── Preset application helpers ───
const ACCENT_ALPHAS = [1, 5, 10, 15, 20, 30, 40, 50, 60, 70, 80, 90, 95, 100];
const ACCENT_LIGHT_ALPHAS = [40, 60, 70, 90];

function hexToRgb(hex: string): [number, number, number] | null {
  const m = hex.match(/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!m) return null;
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
}

function getThemeVarKeys(): string[] {
  const keys = ["--color-accent", "--color-accent-dark", "--color-accent-light", "--bg-primary", "--text-primary"];
  for (const a of ACCENT_ALPHAS) keys.push(`--color-accent-alpha-${a}`);
  for (const a of ACCENT_LIGHT_ALPHAS) keys.push(`--color-accent-light-alpha-${a}`);
  return keys;
}

function snapshotVars(root: HTMLElement): Map<string, string> {
  const map = new Map<string, string>();
  for (const key of getThemeVarKeys()) {
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

  root.style.setProperty("--bg-primary", currentTheme === "light" ? preset.lightBg : preset.darkBg);
  root.style.setProperty("--text-primary", currentTheme === "light" ? preset.lightText : preset.darkText);
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] as const },
  },
};

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
  { name: "--z-overlay", value: "9000", label: "Overlay / Drawer" },
  { name: "--z-top", value: "10000", label: "Cursor / Transition" },
];

// ─── Typography Data ───
const typoVariants = [
  "h1", "h2", "h3", "h4", "h5", "h6", "body1", "body2", "caption", "overline",
] as const;

const typoColors = ["primary", "secondary", "tertiary", "muted", "accent"] as const;

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
];


export default function DesignSystemPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const { setInfinite, scrollTo, lenis, stop, start } = useLenis();
  const { openModal } = useModalStore();
  const [activeSection, setActiveSection] = useState("");
  const sectionRefs = useRef<Map<string, HTMLElement>>(new Map());
  const [activePreset, setActivePreset] = useState<number | null>(null);
  const snapRef = useRef<Map<string, string> | null>(null);

  useEffect(() => {
    stop();
    setInfinite(false);
    window.scrollTo(0, 0);

    const timer = setTimeout(() => {
      if (lenis) {
        lenis.scrollTo(0, { immediate: true });
      }
      start();
    }, 50);

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

  // 라이트/다크 전환 시 활성 프리셋 재적용
  useEffect(() => {
    if (activePreset !== null) {
      applyPresetColors(document.documentElement, theme, THEME_PRESETS[activePreset].theme);
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

  const handleBack = useCallback(() => {
    if (window.history.length > 1 && document.referrer) {
      router.back();
    } else {
      router.push("/");
    }
  }, [router]);

  const handleOpenModal = (title: string, content: React.ReactNode) => {
    openModal(content, { header: { title }, closeButton: true });
  };

  return (
    <div className={styles.page}>
      {/* ─── TOC Sidebar ─── */}
      <nav className={styles.toc}>
        <ul className={styles.tocList}>
          {tocSections.map((s) => (
            <li key={s.id}>
              <button
                className={`${styles.tocItem} ${activeSection === s.id ? styles.tocItemActive : ""}`}
                onClick={() => handleTocClick(s.id)}
              >
                {s.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* ─── Main Content ─── */}
      <div className={styles.main}>
        <motion.div className={styles.container} variants={containerVariants} initial="hidden" animate="visible">
          {/* Header */}
          <motion.div className={styles.header} variants={itemVariants}>
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
          <motion.div variants={itemVariants}>
            <h1 className={styles.title}>Design System</h1>
          </motion.div>
          <motion.div variants={itemVariants}>
            <p className={styles.subtitle}>Raw Tokens → Semantic Tokens → Context Variables</p>
          </motion.div>

          {/* ─── Preset Bar ─── */}
          <motion.div className={styles.presetBar} variants={itemVariants}>
            <span className={styles.presetBarLabel}>Presets</span>
            {THEME_PRESETS.map((p, i) => (
              <button
                key={p.name}
                className={`${styles.presetSwatch} ${activePreset === i ? styles.presetSwatchActive : ""}`}
                onClick={() => handlePresetClick(i)}
                aria-label={p.name}
              >
                <div className={styles.presetSwatchInner} style={{ background: p.theme.accentColor }} />
                <span className={styles.presetName}>{p.name}</span>
              </button>
            ))}
          </motion.div>

          {/* ─── Colors ─── */}
          <motion.section id="colors" ref={setSectionRef("colors")} className={styles.section} variants={itemVariants}>
            <h2 className={styles.sectionTitle}>Colors</h2>
            <p className={styles.sectionSub}>Brand</p>
            <div className={styles.brandRow}>
              {brandColors.map((c) => (
                <div key={c.name} className={styles.brandSwatch}>
                  <div className={styles.brandBox} style={{ background: `var(${c.var})` }} />
                  <span className={styles.colorLabel}>{c.name}</span>
                </div>
              ))}
            </div>
            <p className={styles.sectionSub}>Neutral Scale</p>
            <div className={styles.colorGrid}>
              {neutralScale.map((n) => (
                <div key={n} className={styles.colorSwatch}>
                  <div className={styles.colorBox} style={{ background: `var(--color-neutral-${n})` }} />
                  <span className={styles.colorLabel}>{n}</span>
                </div>
              ))}
            </div>
          </motion.section>

          {/* ─── Alpha Variants ─── */}
          <motion.section id="alpha" ref={setSectionRef("alpha")} className={styles.section} variants={itemVariants}>
            <h2 className={styles.sectionTitle}>Alpha Variants</h2>
            <p className={styles.sectionSub}>Accent Alpha</p>
            <div className={styles.alphaRow}>
              {alphaSteps.map((a) => (
                <div key={a} style={{ flex: 1, textAlign: "center" }}>
                  <div className={styles.alphaBar} style={{ background: `var(--color-accent-alpha-${a})`, height: `${8 + a * 0.4}px` }} />
                  <div className={styles.alphaLabel}>{a}%</div>
                </div>
              ))}
            </div>
            <p className={styles.sectionSub}>Neutral Alpha</p>
            <div className={styles.alphaRow}>
              {alphaSteps.map((a) => (
                <div key={a} style={{ flex: 1, textAlign: "center" }}>
                  <div className={styles.alphaBar} style={{ background: `var(--color-neutral-alpha-${a})`, height: `${8 + a * 0.4}px` }} />
                  <div className={styles.alphaLabel}>{a}%</div>
                </div>
              ))}
            </div>
          </motion.section>

          {/* ─── Semantic Colors ─── */}
          <motion.section id="semantic" ref={setSectionRef("semantic")} className={styles.section} variants={itemVariants}>
            <h2 className={styles.sectionTitle}>Semantic Colors</h2>
            <div className={styles.semanticGrid}>
              {semanticColors.map((c) => (
                <div key={c.name} className={styles.semanticItem}>
                  <div className={styles.semanticDot} style={{ background: `var(${c.name})` }} />
                  <div className={styles.semanticInfo}>
                    <span className={styles.semanticName}>{c.name}</span>
                    <span className={styles.semanticRef}>{c.ref}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.section>

          {/* ─── Typography ─── */}
          <motion.section id="typography" ref={setSectionRef("typography")} className={styles.section} variants={itemVariants}>
            <h2 className={styles.sectionTitle}>Typography</h2>

            <p className={styles.sectionSub}>Variants</p>
            <div className={styles.typoRow}>
              {typoVariants.map((v) => (
                <div key={v} className={styles.typoItem}>
                  <span className={styles.typoLabel}>{v}</span>
                  <Typography variant={v}>Design tokens in action</Typography>
                </div>
              ))}
            </div>

            <div style={{ height: 32 }} />
            <p className={styles.sectionSub}>Colors</p>
            <div className={styles.typoRow}>
              {typoColors.map((c) => (
                <div key={c} className={styles.typoItem}>
                  <span className={styles.typoLabel}>{c}</span>
                  <Typography variant="h5" color={c}>{c} color</Typography>
                </div>
              ))}
            </div>

            <div style={{ height: 32 }} />
            <p className={styles.sectionSub}>Gradient</p>
            <Typography variant="h2" gradient>Gradient text effect</Typography>

            <div style={{ height: 32 }} />
            <p className={styles.sectionSub}>Weights</p>
            <div className={styles.componentRow}>
              {(["light", "normal", "medium", "semibold", "bold"] as const).map((w) => (
                <Typography key={w} variant="body1" weight={w}>{w}</Typography>
              ))}
            </div>
          </motion.section>

          {/* ─── Spacing ─── */}
          <motion.section id="spacing" ref={setSectionRef("spacing")} className={styles.section} variants={itemVariants}>
            <h2 className={styles.sectionTitle}>Spacing</h2>
            <div className={styles.spacingRow}>
              {spacingScale.map((s) => (
                <div key={s.name} className={styles.spacingItem}>
                  <span className={styles.spacingLabel}>{s.name.replace("--spacing-", "")}</span>
                  <div className={styles.spacingBar} style={{ width: `var(${s.name})` }} />
                  <span className={styles.spacingValue}>{s.value}</span>
                </div>
              ))}
            </div>
          </motion.section>

          {/* ─── Radius ─── */}
          <motion.section id="radius" ref={setSectionRef("radius")} className={styles.section} variants={itemVariants}>
            <h2 className={styles.sectionTitle}>Border Radius</h2>
            <div className={styles.radiusGrid}>
              {radiusScale.map((r) => (
                <div key={r.name} className={styles.radiusItem}>
                  <div className={styles.radiusBox} style={{ borderRadius: `var(${r.var})` }} />
                  <span className={styles.radiusLabel}>{r.name}<br />{r.value}</span>
                </div>
              ))}
            </div>
          </motion.section>

          {/* ─── Shadows ─── */}
          <motion.section id="shadows" ref={setSectionRef("shadows")} className={styles.section} variants={itemVariants}>
            <h2 className={styles.sectionTitle}>Shadows</h2>
            <div className={styles.shadowGrid}>
              {shadowScale.map((s) => (
                <div key={s} className={styles.shadowItem}>
                  <div className={styles.shadowBox} style={{ boxShadow: `var(${s})` }} />
                  <span className={styles.shadowLabel}>{s.replace("--shadow-", "")}</span>
                </div>
              ))}
            </div>
          </motion.section>

          {/* ─── Motion ─── */}
          <motion.section id="motion" ref={setSectionRef("motion")} className={styles.section} variants={itemVariants}>
            <h2 className={styles.sectionTitle}>Motion</h2>
            <p className={styles.sectionSub}>Duration</p>
            <div className={styles.motionGrid}>
              {durations.map((d) => (
                <div key={d.name} className={styles.motionItem}>
                  <div className={styles.motionName}>{d.name.replace("--duration-", "")}</div>
                  <div className={styles.motionValue}>{d.value}</div>
                  <div className={styles.motionBar} style={{ transition: `transform var(${d.name}) var(--ease-material)` }} />
                </div>
              ))}
            </div>
            <div style={{ height: 24 }} />
            <p className={styles.sectionSub}>Easing</p>
            <div className={styles.motionGrid}>
              {easings.map((e) => (
                <div key={e.name} className={styles.motionItem}>
                  <div className={styles.motionName}>{e.name.replace("--ease-", "")}</div>
                  <div className={styles.motionValue}>{e.value}</div>
                  <div className={styles.motionBar} style={{ transition: `transform var(--duration-slow) var(${e.name})` }} />
                </div>
              ))}
            </div>
          </motion.section>

          {/* ─── Z-index ─── */}
          <motion.section id="z-index" ref={setSectionRef("z-index")} className={styles.section} variants={itemVariants}>
            <h2 className={styles.sectionTitle}>Z-Index</h2>
            <div className={styles.zStack}>
              {zScale.map((z, i) => (
                <div key={z.name} className={styles.zLayer} style={{ top: `${i * 44}px`, left: `${i * 20}px`, zIndex: Number(z.value), width: `calc(100% - ${i * 40}px)` }}>
                  <strong>{z.label}</strong>
                  <span style={{ color: "var(--text-muted)" }}>{z.name} = {z.value}</span>
                </div>
              ))}
            </div>
          </motion.section>

          {/* ─── Components ─── */}
          <motion.section id="components" ref={setSectionRef("components")} className={styles.section} variants={itemVariants}>
            <h2 className={styles.sectionTitle}>Components</h2>

            {/* Logo */}
            <div className={styles.componentGroup}>
              <div className={styles.componentGroupTitle}>Logo</div>
              <div className={styles.logoRow}>
                <div className={styles.logoItem}>
                  <Logo variant="short" as="span" />
                  <span className={styles.logoLabel}>short</span>
                </div>
                <div className={styles.logoItem}>
                  <Logo variant="full" as="span" />
                  <span className={styles.logoLabel}>full</span>
                </div>
              </div>
            </div>

            {/* Button — Variants */}
            <div className={styles.componentGroup}>
              <div className={styles.componentGroupTitle}>Button — Variants</div>
              <div className={styles.componentRow}>
                <Button variant="primary">Primary</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button disabled>Disabled</Button>
              </div>
            </div>

            {/* Button — Sizes */}
            <div className={styles.componentGroup}>
              <div className={styles.componentGroupTitle}>Button — Sizes</div>
              <div className={styles.componentRow}>
                <Button variant="outline" size="xs">XS</Button>
                <Button variant="outline" size="sm">Small</Button>
                <Button variant="outline" size="md">Medium</Button>
                <Button variant="outline" size="lg">Large</Button>
                <Button variant="outline" size="xl">XL</Button>
              </div>
            </div>

            {/* Button — Shapes */}
            <div className={styles.componentGroup}>
              <div className={styles.componentGroupTitle}>Button — Shapes</div>
              <div className={styles.componentRow}>
                <Button variant="primary" shape="circle" icon={<Star size={16} />} />
                <Button variant="outline" shape="circle" icon={<Mail size={16} />} />
                <Button variant="ghost" shape="square" icon={<Zap size={16} />} />
              </div>
            </div>

            {/* Button — Icons & States */}
            <div className={styles.componentGroup}>
              <div className={styles.componentGroupTitle}>Button — Icons & States</div>
              <div className={styles.componentRow}>
                <Button variant="primary" icon={<Send size={16} />}>Send</Button>
                <Button variant="outline" icon={<ArrowRight size={16} />} iconPosition="right">Next</Button>
                <Button variant="outline" active>Active</Button>
                <Button variant="outline" fullWidth>Full Width</Button>
              </div>
            </div>

            {/* Input */}
            <div className={styles.componentGroup}>
              <div className={styles.componentGroupTitle}>Input</div>
              <div className={styles.sliderRow}>
                <div className={styles.sliderItem}>
                  <Input label="Label" value={inputValue} onChange={setInputValue} placeholder="Type something..." />
                </div>
                <div className={styles.sliderItem}>
                  <Input value="Read-only value" onChange={() => {}} disabled />
                </div>
              </div>
            </div>

            {/* Checkbox */}
            <div className={styles.componentGroup}>
              <div className={styles.componentGroupTitle}>Checkbox</div>
              <div className={styles.componentRow}>
                <Checkbox checked={checkSquare} onChange={setCheckSquare} shape="square" label="Square" />
                <Checkbox checked={checkCircle} onChange={setCheckCircle} shape="circle" label="Circle" />
                <Checkbox checked={checkIndet} onChange={setCheckIndet} indeterminate label="Indeterminate" />
                <Checkbox checked={false} onChange={() => {}} disabled label="Disabled" />
              </div>
            </div>

            {/* Switch */}
            <div className={styles.componentGroup}>
              <div className={styles.componentGroupTitle}>Switch</div>
              <div className={styles.componentRow}>
                <Switch checked={switchOn} onCheckedChange={setSwitchOn} />
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--text-muted)" }}>
                  {switchOn ? "ON" : "OFF"}
                </span>
                <Switch defaultChecked />
                <Switch disabled />
                <Switch disabled defaultChecked />
              </div>
            </div>

            {/* Slider */}
            <div className={styles.componentGroup}>
              <div className={styles.componentGroupTitle}>Slider</div>
              <div className={styles.sliderRow}>
                <div className={styles.sliderItem}>
                  <span className={styles.sliderLabel}>Single — {sliderValue[0]}</span>
                  <Slider value={sliderValue} onValueChange={setSliderValue} max={100} step={1} />
                </div>
                <div className={styles.sliderItem}>
                  <span className={styles.sliderLabel}>Range — {rangeValue[0]}~{rangeValue[1]}</span>
                  <Slider value={rangeValue} onValueChange={setRangeValue} max={100} step={1} />
                </div>
                <div className={styles.sliderItem}>
                  <span className={styles.sliderLabel}>Disabled</span>
                  <Slider defaultValue={[60]} max={100} disabled />
                </div>
              </div>
            </div>

            {/* Modal */}
            <div className={styles.componentGroup}>
              <div className={styles.componentGroupTitle}>Modal</div>
              <div className={styles.modalDemo}>
                <Button variant="outline" onClick={() => handleOpenModal("Basic Modal", <div style={{ padding: "1.5rem" }}><Typography variant="body1">This is a basic modal with header and close button.</Typography></div>)}>
                  Basic Modal
                </Button>
                <Button variant="outline" icon={<Heart size={16} />} onClick={() => handleOpenModal("Rich Content", <div style={{ padding: "2rem", textAlign: "center", display: "flex", flexDirection: "column", gap: "1rem", alignItems: "center" }}><Zap size={48} color="var(--color-accent)" /><Typography variant="h4">Rich Content</Typography><Typography variant="body2" color="secondary">Modals support any React content.</Typography></div>)}>
                  Rich Content
                </Button>
                <Button variant="outline" onClick={() => openModal(<div style={{ padding: "1.5rem" }}><Typography variant="body1">No header, just content.</Typography></div>, { closeButton: true })}>
                  No Header
                </Button>
              </div>
            </div>

            {/* TypeWriter */}
            <div className={styles.componentGroup}>
              <div className={styles.componentGroupTitle}>TypeWriter</div>
              <div className={styles.typewriterDemo}>
                <TypeWriter text="Design tokens bring consistency." typingSpeed={80} caption="— Design System" fontSize="var(--font-size-xl)" align="center" />
              </div>
            </div>
          </motion.section>
        </motion.div>
      </div>

      <Modal />
    </div>
  );
}
