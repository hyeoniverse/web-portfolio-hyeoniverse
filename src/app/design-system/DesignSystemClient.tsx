"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowLeft } from "@/components/icons";
import { useRouter } from "next/navigation";
import { useLenis } from "@/providers/LenisProvider";
import TOC from "@/components/ui/TOC/TOC";
import { useLoadingScreen } from "@/hooks/useLoadingProgress";
import Button from "@/components/ui/Button";
import SectionHeader from "@/components/ui/SectionHeader";
import { Typography } from "@/components/ui/Typography";
import Tooltip from "@/components/ui/Tooltip";
import T from "@/components/ui/T";
import { useTheme } from "@/providers/ThemeProvider";
import { useLanguage } from "@/providers/LanguageProvider";
import { THEME_PRESETS } from "@/app/admin/(dashboard)/settings/_data/settingsConstants";
import { snapshotVars, restoreVars, applyPresetColors } from "./_data/presetHelpers";
import {
  staggerContainer, staggerItem, staggerItemX,
  innerStagger, innerStaggerFast,
  createSequence, makeVp, makeVpGroup, makeScrollChildX, makeScrollChildY,
} from "./_data/animations";
import {
  brandColors, neutralScale, alphaSteps, semanticColors,
  typoVariants, typoColors, spacingScale, radiusScale, gridColsScale,
  shadowScale, durations, easings, zScale, tocSections,
} from "./_data/tokenData";
import dynamic from "next/dynamic";
import ComponentsSection from "./_sections/ComponentsSection";
const EditorSection = dynamic(() => import("./_sections/EditorSection"), { ssr: false });
const CoffeeCanvas = dynamic(
  () => import("@/app/(home)/_sections/CTASection/CoffeeCanvas"),
  { ssr: false }
);
const BunnyPreviewScene = dynamic(
  () => import("@/app/profile/_components/BunnyShowcase/BunnyPreviewScene"),
  { ssr: false }
);
import { Canvas } from "@react-three/fiber";
import BannerSection from "./_sections/BannerSection";

const SpinningTorus = dynamic(
  () => import("@/components/effects/ScrollTorus/SpinningTorus"),
  { ssr: false }
);
import styles from "./DesignSystem.module.css";


export default function DesignSystemClient() {
  const router = useRouter();
  const { theme } = useTheme();
  const { language } = useLanguage();
  const { setInfinite, lenis, stop, start } = useLenis();
  const { isLoading: isScreenLoading } = useLoadingScreen();
  const sectionRefs = useRef<Map<string, HTMLElement>>(new Map());
  const [activePreset, setActivePreset] = useState<number | null>(null);
  const snapRef = useRef<Map<string, string> | null>(null);
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

    snapRef.current = snapshotVars(document.documentElement);
    return () => {
      clearTimeout(timer);
      if (snapRef.current) restoreVars(document.documentElement, snapRef.current);
    };
  }, [setInfinite, lenis, stop, start]);

  const handlePresetClick = useCallback((index: number) => {
    setActivePreset((prev) => {
      if (prev === index) {
        if (snapRef.current) restoreVars(document.documentElement, snapRef.current);
        return null;
      }
      applyPresetColors(document.documentElement, theme, THEME_PRESETS[index].theme);
      return index;
    });
  }, [theme]);

  useEffect(() => {
    if (!isScreenLoading && !ready) {
      const t = setTimeout(() => setReady(true), 300);
      return () => clearTimeout(t);
    }
  }, [isScreenLoading, ready]);

  useEffect(() => {
    if (ready && !scrollMode) {
      const t = setTimeout(() => setScrollMode(true), 4000);
      return () => clearTimeout(t);
    }
  }, [ready, scrollMode]);

  useEffect(() => {
    if (activePreset !== null) {
      const id = requestAnimationFrame(() => {
        applyPresetColors(document.documentElement, theme, THEME_PRESETS[activePreset].theme);
      });
      return () => cancelAnimationFrame(id);
    }
  }, [theme, activePreset]);

  const setSectionRef = useCallback((id: string) => (el: HTMLElement | null) => {
    if (el) sectionRefs.current.set(id, el);
  }, []);

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

  // 애니메이션 헬퍼 — ready/scrollMode/isExiting 변경 시만 재생성
  const vp = useMemo(() => makeVp(ready, scrollMode, isExiting), [ready, scrollMode, isExiting]);
  const vpGroup = useMemo(() => makeVpGroup(ready, scrollMode, isExiting), [ready, scrollMode, isExiting]);
  const scrollChildX = useMemo(() => makeScrollChildX(scrollMode, isExiting), [scrollMode, isExiting]);
  const scrollChildY = useMemo(() => makeScrollChildY(scrollMode, isExiting), [scrollMode, isExiting]);
  const nd = createSequence();

  return (
    <div className={styles.page}>
      {/* ─── TOC Sidebar ─── */}
      <TOC items={tocSections.map((s) => ({ id: s.id, text: s.label }))} position="left" />

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
              icon={<ArrowLeft size={20} />}
            >
              Back
            </Button>
          </motion.div>
          <h1 className={styles.title}>Design System</h1>
          <motion.p className={styles.subtitle} initial="hidden" {...vp(nd())} variants={staggerItem}>
            Raw → Semantic → Component → Context
          </motion.p>

          {/* ─── Principles ─── */}
          <section id="principles" ref={setSectionRef("principles")} className={styles.section}>
            <SectionHeader title="Principles" />

            {/* Principle items — SVG + text rows */}
            {[
              {
                title: "4-Tier Abstraction",
                desc: language === "ko"
                  ? "원시 값을 직접 쓰지 않고 Raw → Semantic → Component → Context 네 단계로 감싸기 때문에, 어디를 바꿔도 영향 범위가 그 계층 안에서 통제됩니다. Component 토큰은 button·input 처럼 컴포넌트마다 타입이 정해져 있어서, 엉뚱한 값을 골라 일관성이 깨지는 실수를 막아 줍니다."
                  : "Raw → Semantic → Component → Context. Four layers control the blast radius of any change. Component tokens (typed by button/input/etc.) act as guardrails against inconsistency.",
                icon: (
                  <svg viewBox="0 0 160 80" fill="none" className={styles.pIcon}>
                    {/* Raw */}
                    <rect x="0" y="28" width="28" height="24" rx="12" fill="var(--color-neutral-alpha-10)" />
                    <text x="14" y="44" textAnchor="middle" fontSize="8" fontWeight="600" fill="var(--text-primary)">RAW</text>
                    <line x1="30" y1="40" x2="38" y2="40" stroke="var(--text-primary)" strokeWidth="1.5" opacity="0.4" />
                    <polygon points="38,37 44,40 38,43" fill="var(--text-primary)" opacity="0.4" />
                    {/* Semantic */}
                    <rect x="46" y="24" width="28" height="32" rx="14" fill="color-mix(in srgb, var(--color-accent) 25%, transparent)" />
                    <text x="60" y="44" textAnchor="middle" fontSize="7" fontWeight="600" fill="var(--text-accent)">SEM</text>
                    <line x1="76" y1="40" x2="84" y2="40" stroke="var(--text-primary)" strokeWidth="1.5" opacity="0.4" />
                    <polygon points="84,37 90,40 84,43" fill="var(--text-primary)" opacity="0.4" />
                    {/* Component */}
                    <rect x="92" y="26" width="28" height="28" rx="13" fill="color-mix(in srgb, var(--color-info) 25%, transparent)" />
                    <text x="106" y="44" textAnchor="middle" fontSize="7" fontWeight="600" fill="var(--color-info)">CMP</text>
                    <line x1="122" y1="40" x2="130" y2="40" stroke="var(--text-primary)" strokeWidth="1.5" opacity="0.4" />
                    <polygon points="130,37 136,40 130,43" fill="var(--text-primary)" opacity="0.4" />
                    {/* Context */}
                    <rect x="138" y="28" width="22" height="24" rx="11" fill="color-mix(in srgb, var(--color-success) 20%, transparent)" />
                    <text x="149" y="44" textAnchor="middle" fontSize="6" fontWeight="600" fill="var(--color-success)">CTX</text>
                    {/* Codes */}
                    <text x="14" y="64" textAnchor="middle" fontSize="5" fill="var(--text-muted)">--size-sm</text>
                    <text x="60" y="64" textAnchor="middle" fontSize="5" fill="var(--text-muted)">--text-primary</text>
                    <text x="106" y="64" textAnchor="middle" fontSize="5" fill="var(--text-muted)">--button-h-sm</text>
                    <text x="149" y="64" textAnchor="middle" fontSize="5" fill="var(--text-muted)">--_h</text>
                  </svg>
                ),
              },
              {
                title: "Single Source of Truth",
                desc: language === "ko"
                  ? "토큰 하나를 바꾸면 모든 참조가 함께 바뀝니다. hex 값이 코드베이스에 흩어지지 않습니다."
                  : "Change one token and every reference updates. No scattered hex values across the codebase.",
                icon: (
                  <svg viewBox="0 0 80 80" fill="none" className={styles.pIcon}>
                    <circle cx="40" cy="24" r="12" fill="var(--color-accent)" opacity="0.3" />
                    <circle cx="40" cy="24" r="6" fill="var(--color-accent)" />
                    <line x1="40" y1="36" x2="20" y2="60" stroke="var(--text-primary)" strokeWidth="1.5" opacity="0.3" />
                    <line x1="40" y1="36" x2="40" y2="64" stroke="var(--text-primary)" strokeWidth="1.5" opacity="0.3" />
                    <line x1="40" y1="36" x2="60" y2="60" stroke="var(--text-primary)" strokeWidth="1.5" opacity="0.3" />
                    <circle cx="20" cy="62" r="5" fill="var(--color-neutral-alpha-20)" />
                    <circle cx="40" cy="66" r="5" fill="var(--color-neutral-alpha-20)" />
                    <circle cx="60" cy="62" r="5" fill="var(--color-neutral-alpha-20)" />
                  </svg>
                ),
              },
              {
                title: language === "ko" ? "Semantic 레이어에서 테마 전환" : "Theme at the Semantic Layer",
                desc: language === "ko"
                  ? "Semantic 변수만 재정의하면 dark/light 전환이 모든 컴포넌트에 자동 반영됩니다."
                  : "Redefine Semantic variables and dark/light switching propagates to every component automatically.",
                icon: (
                  <svg viewBox="0 0 80 80" fill="none" className={styles.pIcon}>
                    <rect x="4" y="12" width="34" height="56" rx="6" fill="var(--bg-primary)" stroke="var(--text-primary)" strokeWidth="1.5" opacity="0.8" />
                    <rect x="42" y="12" width="34" height="56" rx="6" fill="var(--text-primary)" stroke="var(--text-primary)" strokeWidth="1.5" opacity="0.8" />
                    <circle cx="21" cy="36" r="8" fill="var(--color-accent)" opacity="0.6" />
                    <circle cx="59" cy="36" r="8" fill="var(--color-accent)" opacity="0.6" />
                    <rect x="12" y="50" width="18" height="3" rx="1.5" fill="var(--text-primary)" opacity="0.3" />
                    <rect x="12" y="56" width="12" height="3" rx="1.5" fill="var(--text-primary)" opacity="0.15" />
                    <rect x="50" y="50" width="18" height="3" rx="1.5" fill="var(--bg-primary)" opacity="0.3" />
                    <rect x="50" y="56" width="12" height="3" rx="1.5" fill="var(--bg-primary)" opacity="0.15" />
                  </svg>
                ),
              },
              {
                title: language === "ko" ? "컴포넌트에 raw 값 금지" : "No Raw Values in Components",
                desc: language === "ko"
                  ? "#hex 나 rgba 를 직접 쓰지 않고 반드시 토큰을 거쳐 참조합니다. 그래서 모든 시각적 결정을 토큰 단위로 되짚어 추적할 수 있습니다."
                  : "No raw #hex or rgba. Always reference through tokens. Every visual decision becomes traceable.",
                icon: (
                  <svg viewBox="0 0 80 80" fill="none" className={styles.pIcon}>
                    {/* Shield with lock — protected values */}
                    <path d="M40 8L12 22v20c0 16.6 12 30.4 28 34 16-3.6 28-17.4 28-34V22L40 8z" fill="var(--color-neutral-alpha-10)" stroke="var(--text-primary)" strokeWidth="1.5" opacity="0.6" />
                    {/* Inner token symbol */}
                    <circle cx="40" cy="38" r="10" fill="var(--color-accent)" opacity="0.3" />
                    <text x="40" y="42" textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--color-accent)">T</text>
                    {/* Blocked raw values — small crossed circles */}
                    <circle cx="20" cy="58" r="4" fill="var(--color-error)" opacity="0.2" />
                    <line x1="17.2" y1="55.2" x2="22.8" y2="60.8" stroke="var(--color-error)" strokeWidth="1.2" opacity="0.6" />
                    <circle cx="60" cy="58" r="4" fill="var(--color-error)" opacity="0.2" />
                    <line x1="57.2" y1="55.2" x2="62.8" y2="60.8" stroke="var(--color-error)" strokeWidth="1.2" opacity="0.6" />
                  </svg>
                ),
              },
            ].map((p, i) => (
              <motion.div key={i} className={styles.pRow} initial="hidden" {...vp(nd())} variants={staggerItem}>
                <div className={styles.pRowVisual}>{p.icon}</div>
                <div className={styles.pRowText}>
                  <h3 className={styles.pRowTitle}>{p.title}</h3>
                  <p className={styles.pRowDesc}>{p.desc}</p>
                </div>
              </motion.div>
            ))}

            {/* Token file tree */}
            <motion.p className={styles.sectionSub} initial="hidden" {...vp(nd())} variants={staggerItem}>Token Files</motion.p>
            <motion.div className="tw:flex tw:flex-col tw:gap-md" initial="hidden" {...vp(nd())} variants={staggerItem}>
              <div className="tw:flex tw:flex-col">
                <span className={styles.pFileFolder}>src/styles/tokens/</span>
                {[
                  { file: "_color.css", desc: language === "ko" ? "브랜드·중립·알파" : "brand, neutral, alpha" },
                  { file: "_typography.css", desc: language === "ko" ? "폰트·크기·굵기" : "font, size, weight" },
                  { file: "_spacing.css", desc: "--spacing-*, --box-*" },
                  { file: "_radius.css", desc: "xs → capsule → circle" },
                  { file: "_shadow.css", desc: "xs → 2xl" },
                  { file: "_motion.css", desc: "duration, easing, delay" },
                  { file: "_z-index.css", desc: language === "ko" ? "레이어 순서" : "layer order" },
                  { file: "_sizing.css", desc: language === "ko" ? "컴포넌트 크기" : "component sizes" },
                  { file: "_index.css", desc: "barrel" },
                ].map((f) => (
                  <div key={f.file} className={styles.pFileItem}>
                    <code className={styles.pFileName}>{f.file}</code>
                    <span className={styles.pFileDesc}>{f.desc}</span>
                  </div>
                ))}
              </div>
              <div className="tw:flex tw:flex-col">
                <span className={styles.pFileFolder}>src/styles/globals/</span>
                <div className={styles.pFileItem}>
                  <code className={styles.pFileName}>_semantic.css</code>
                  <span className={styles.pFileDesc}>{language === "ko" ? "용도별 의미 매핑" : "purpose-based mapping"}</span>
                </div>
              </div>
            </motion.div>
          </section>

          {/* ─── Colors ─── */}
          <section id="colors" ref={setSectionRef("colors")} className={styles.section}>
            <SectionHeader title="Colors" />
            <motion.p className={styles.sectionSub} initial="hidden" {...vp(nd())} variants={staggerItem} style={{ marginTop: 0 }}>Presets</motion.p>
            <motion.div className={styles.presetBar} initial="hidden" {...vpGroup(nd())} variants={staggerContainer}>
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
            <motion.p className={styles.sectionSub} initial="hidden" {...vp(nd())} variants={staggerItem}>Brand</motion.p>
            <motion.div className={styles.brandRow} initial="hidden" {...vpGroup(nd())} variants={staggerContainer}>
              {brandColors.map((c, i) => (
                <motion.div key={c.name} className="tw:flex tw:flex-col tw:items-center tw:gap-xs" variants={staggerItemX} {...scrollChildX(i, brandColors.length)}>
                  <div className={styles.brandBox} style={{ background: `var(${c.var})` }} />
                  <span className={styles.colorLabel}>{c.name}</span>
                </motion.div>
              ))}
            </motion.div>
            <motion.p className={styles.sectionSub} initial="hidden" {...vp(nd())} variants={staggerItem}>Neutral Scale</motion.p>
            <motion.div className={styles.colorGrid} initial="hidden" {...vpGroup(nd())} variants={staggerContainer}>
              {neutralScale.map((n, i) => (
                <motion.div key={n} className="tw:flex tw:flex-col tw:items-center tw:gap-xs" variants={staggerItemX} {...scrollChildX(i, neutralScale.length)}>
                  <div className={`${styles.colorBox} ${styles.colorBoxBordered}`} style={{ background: `var(--color-neutral-${n})` }} />
                  <span className={styles.colorLabel}>{n}</span>
                </motion.div>
              ))}
            </motion.div>
          </section>

          {/* ─── Alpha Variants ─── */}
          <section id="alpha" ref={setSectionRef("alpha")} className={styles.section}>
            <SectionHeader title="Alpha Variants" />
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
            <SectionHeader title="Semantic Colors" />
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
            <SectionHeader title="Typography" />
            <motion.p className={styles.sectionSub} initial="hidden" {...vp(nd())} variants={staggerItem}>Variants</motion.p>
            <motion.div className="tw:flex tw:flex-col tw:gap-lg" initial="hidden" {...vpGroup(nd())} variants={staggerContainer}>
              {typoVariants.map((v, i) => (
                <motion.div key={v} className={styles.typoItem} variants={staggerItem} {...scrollChildY(i)}>
                  <span className={styles.typoLabel}>{v}</span>
                  <Typography variant={v}>Design tokens in action</Typography>
                </motion.div>
              ))}
            </motion.div>
            <motion.p className={styles.sectionSub} initial="hidden" {...vp(nd())} variants={staggerItem}>Colors</motion.p>
            <motion.div className="tw:flex tw:flex-col tw:gap-lg" initial="hidden" {...vpGroup(nd())} variants={staggerContainer}>
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
            <motion.div className="tw:flex tw:flex-wrap tw:gap-sm tw:items-center" initial="hidden" {...vpGroup(nd())} variants={staggerContainer}>
              {(["light", "normal", "medium", "semibold", "bold"] as const).map((w, i) => (
                <motion.div key={w} variants={staggerItemX} {...scrollChildX(i, 5)}>
                  <Typography variant="body1" weight={w}>{w}</Typography>
                </motion.div>
              ))}
            </motion.div>
          </section>

          {/* ─── Spacing ─── */}
          <section id="spacing" ref={setSectionRef("spacing")} className={styles.section}>
            <SectionHeader title="Spacing" />
            <motion.div className="tw:flex tw:flex-col tw:gap-xs" initial="hidden" {...vpGroup(nd())} variants={staggerContainer}>
              {spacingScale.map((s, i) => (
                <motion.div key={s.name} className="tw:flex tw:items-center tw:gap-sm" variants={staggerItem} {...scrollChildY(i)}>
                  <span className={styles.spacingLabel}>{s.name.replace("--spacing-", "")}</span>
                  <div className={styles.spacingBar} style={{ width: `var(${s.name})` }} />
                  <span className={styles.spacingValue}>{s.value}</span>
                </motion.div>
              ))}
            </motion.div>
          </section>

          {/* ─── Radius ─── */}
          <section id="radius" ref={setSectionRef("radius")} className={styles.section}>
            <SectionHeader title="Border Radius" />
            <motion.div className="tw:flex tw:flex-wrap tw:gap-md" initial="hidden" {...vpGroup(nd())} variants={innerStaggerFast}>
              {radiusScale.map((r, i) => {
                const h = 64;
                const w = r.name === "capsule" ? 160 : r.name === "circle" ? 64 : Math.min(96, Math.max(64, parseInt(r.value, 10) * 3));
                return (
                  <motion.div key={r.name} className="tw:flex tw:flex-col tw:items-center tw:gap-xs" variants={staggerItemX} {...scrollChildX(i, radiusScale.length)}>
                    <div className={styles.radiusBox} style={{ borderRadius: `var(${r.var})`, width: w, height: h }} />
                    <span className={styles.radiusLabel}>{r.name}<br />{r.value}</span>
                  </motion.div>
                );
              })}
            </motion.div>
          </section>

          {/* ─── Grid ─── */}
          <section id="grid" ref={setSectionRef("grid")} className={styles.section}>
            <SectionHeader title="Grid Templates" />
            <motion.div className="tw:flex tw:flex-col tw:gap-md" initial="hidden" {...vpGroup(nd())} variants={staggerContainer}>
              {gridColsScale.map((g, i) => (
                <motion.div key={g.name} className="tw:flex tw:flex-col tw:gap-2xs" variants={staggerItem} {...scrollChildY(i)}>
                  <span className={styles.spacingLabel}>{g.name.replace("--grid-cols-", "")} cols · repeat({g.cols}, minmax(0, 1fr))</span>
                  <div className="tw:grid tw:gap-2xs" style={{ gridTemplateColumns: `var(${g.name})` }}>
                    {Array.from({ length: g.cols }).map((_, c) => (
                      <div key={c} style={{ height: "1.75rem", background: "var(--bg-accent-solid)", borderRadius: "var(--radius-sm)" }} />
                    ))}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </section>

          {/* ─── Shadows ─── */}
          <section id="shadows" ref={setSectionRef("shadows")} className={styles.section}>
            <SectionHeader title="Shadows" />
            <motion.div className={styles.shadowGrid} initial="hidden" {...vpGroup(nd())} variants={innerStagger}>
              {shadowScale.map((s, i) => (
                <motion.div key={s} className="tw:flex tw:flex-col tw:items-center tw:gap-sm" variants={staggerItemX} {...scrollChildX(i, shadowScale.length)}>
                  <div className={styles.shadowBox} style={{ boxShadow: `var(${s})` }} />
                  <span className={styles.shadowLabel}>{s.replace("--shadow-", "")}</span>
                </motion.div>
              ))}
            </motion.div>
          </section>

          {/* ─── Motion ─── */}
          <section id="motion" ref={setSectionRef("motion")} className={styles.section}>
            <SectionHeader title="Motion" />
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
            <SectionHeader title="Z-Index" />
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

          {/* ─── 3D (Three.js) ─── */}
          <section id="threejs" ref={setSectionRef("threejs")} className={styles.section}>
            <SectionHeader title="3D (Three.js)" />

            {/* ── Coffee Cup ── */}
            <motion.div initial="hidden" {...vp(nd())} variants={staggerItem} style={{ display: "flex", alignItems: "center", gap: "var(--spacing-3xl)", marginTop: "var(--spacing-2xl)" }}>
              <div style={{ flex: "0 0 50%", aspectRatio: "1", maxHeight: 360, borderRadius: "var(--radius-2xl)", overflow: "hidden" }}>
                <CoffeeCanvas />
              </div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "var(--spacing-sm)" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.25em", color: "var(--text-muted)", textTransform: "uppercase" }}>CTA Section</span>
                <h3 style={{ fontSize: 24, fontFamily: "var(--font-instrument)", fontWeight: 400, margin: 0 }}>Coffee Cup</h3>
                <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7, margin: 0 }}>
                  {language === "ko"
                    ? "컵과 소서는 LatheGeometry, 손잡이는 TorusGeometry, 액면은 CylinderGeometry 로 만듭니다. Canvas 2D 로 parametric heart curve 와 80-band cream↔coffee wave, blur 엽맥 라떼아트 텍스처를 생성해 MeshPhysicalMaterial 에 매핑합니다. 마우스를 따라 lerp 로 부드럽게 회전합니다."
                    : "LatheGeometry cup/saucer profiles, TorusGeometry handle, CylinderGeometry liquid. Canvas 2D parametric heart curve + 80-band cream↔coffee wave + blur vein latte art texture mapped to MeshPhysicalMaterial. Mouse-tracked lerp rotation."}
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: "var(--spacing-xs)" }}>
                  {["LatheGeometry", "MeshPhysicalMaterial", "clearcoat", "CanvasTexture", "Environment IBL"].map((t) => (
                    <span key={t} style={{ fontSize: 10, padding: "3px 10px", borderRadius: "var(--radius-capsule)", border: "var(--border-light)", color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>{t}</span>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* ── Divider ── */}
            <div style={{ height: 1, background: "var(--border-light-color)", margin: "var(--spacing-3xl) 0" }} />

            {/* ── Scroll Torus ── */}
            <motion.div initial="hidden" {...vp(nd())} variants={staggerItem} style={{ display: "flex", flexDirection: "row-reverse", alignItems: "center", gap: "var(--spacing-3xl)" }}>
              <div style={{ flex: "0 0 50%", aspectRatio: "1", maxHeight: 360, borderRadius: "var(--radius-2xl)", overflow: "hidden" }}>
                <Canvas camera={{ position: [0, 0, 3], fov: 40 }} gl={{ alpha: true }} style={{ background: "transparent" }}>
                  <ambientLight intensity={0.6} />
                  <directionalLight position={[5, 5, 5]} intensity={1} />
                  <SpinningTorus />
                </Canvas>
              </div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "var(--spacing-sm)" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.25em", color: "var(--text-muted)", textTransform: "uppercase" }}>Hero Section</span>
                <h3 style={{ fontSize: 24, fontFamily: "var(--font-instrument)", fontWeight: 400, margin: 0 }}>Scroll Torus</h3>
                <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7, margin: 0 }}>
                  {language === "ko"
                    ? "누적 스크롤을 따라 리사주 곡선(X·Y·Z 주파수 차이) 경로를 끝없이 순환하는 메탈릭 토러스입니다. 테마에 따라 색상과 emissive 가 바뀌고, 커서가 가까우면 자석처럼 끌리고 멀면 반발하는 물리 인터랙션이 동작합니다."
                    : "Metallic torus orbiting endlessly along Lissajous curve (X·Y·Z frequency offset) driven by cumulative scroll. Theme-specific color/emissive switching, cursor proximity magnet attraction + far-range repulsion physics."}
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: "var(--spacing-xs)" }}>
                  {["TorusGeometry", "MeshStandardMaterial", "Lissajous path", "scroll-driven", "pointer repulsion"].map((t) => (
                    <span key={t} style={{ fontSize: 10, padding: "3px 10px", borderRadius: "var(--radius-capsule)", border: "var(--border-light)", color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>{t}</span>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* ── Divider ── */}
            <div style={{ height: 1, background: "var(--border-light-color)", margin: "var(--spacing-3xl) 0" }} />

            {/* ── Bunny Character ── */}
            <motion.div initial="hidden" {...vp(nd())} variants={staggerItem} style={{ display: "flex", alignItems: "center", gap: "var(--spacing-3xl)" }}>
              <div style={{ flex: "0 0 50%", aspectRatio: "1", maxHeight: 360, borderRadius: "var(--radius-2xl)", overflow: "hidden" }}>
                <Canvas camera={{ position: [0, 0, 5], fov: 45 }} gl={{ alpha: true }} style={{ background: "transparent" }}>
                  <ambientLight intensity={0.6} />
                  <directionalLight position={[3, 5, 4]} intensity={0.8} />
                  <BunnyPreviewScene expression="normal" />
                </Canvas>
              </div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "var(--spacing-sm)" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.25em", color: "var(--text-muted)", textTransform: "uppercase" }}>Profile Section</span>
                <h3 style={{ fontSize: 24, fontFamily: "var(--font-instrument)", fontWeight: 400, margin: 0 }}>Bunny Character</h3>
                <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7, margin: 0 }}>
                  {language === "ko"
                    ? "몸·귀·팔·발은 LatheGeometry, 머리·눈·꼬리는 SphereGeometry, 찡그린 눈은 CapsuleGeometry 로 조합한 마스코트입니다. 자동으로 눈을 깜빡이고, 클릭하면 놀람·기쁨 표정으로 전환됩니다. RAF 물리 기반으로 벽에 부딪혀 튕기며 이동하고, 충돌 시 사운드가 재생됩니다."
                    : "LatheGeometry (body/ears/arms/feet) + SphereGeometry (head/eyes/tail) + CapsuleGeometry (squint eyes) mascot. Auto-blink + click expression toggle (surprise/happy). RAF physics wall-bounce movement, collision sounds."}
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: "var(--spacing-xs)" }}>
                  {["LatheGeometry", "SphereGeometry", "CapsuleGeometry", "expressions", "useFrame", "physics"].map((t) => (
                    <span key={t} style={{ fontSize: 10, padding: "3px 10px", borderRadius: "var(--radius-capsule)", border: "var(--border-light)", color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>{t}</span>
                  ))}
                </div>
              </div>
            </motion.div>
          </section>

          {/* ─── Components (분리된 섹션 — 자체 상태 관리) ─── */}
          <ComponentsSection
            language={language}
            setSectionRef={setSectionRef}
            vpGroup={vpGroup}
            scrollChildX={scrollChildX}
            nd={nd}
          />

          {/* ─── Tooltip ─── */}
          <section id="tooltip" ref={setSectionRef("tooltip")} className={styles.section}>
            <SectionHeader title="Tooltip" />
            <motion.div className={styles.componentGroup} initial="hidden" {...vpGroup(nd())} variants={staggerContainer}>
              <div className={styles.componentGroupTitle}>Basic</div>
              <div className="tw:flex tw:flex-wrap tw:gap-sm tw:items-center">
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
              <p className={styles.sectionSub} style={{ marginTop: -4, textTransform: "none" }}>{language === "ko" ? "마우스를 올리면 반대 언어 번역을 보여 줍니다. (지연: 0ms / 600ms)" : "Shows opposite language on hover (delay: 0ms / 600ms)"}</p>
              <div className="tw:flex tw:flex-wrap tw:gap-sm tw:items-center">
                <motion.div variants={staggerItemX} {...scrollChildX(0, 4)}><T k="contact.title" delay={0} className={styles.tooltipDemoText} /></motion.div>
                <motion.div variants={staggerItemX} {...scrollChildX(1, 4)}><T k="contact.send" delay={0} className={styles.tooltipDemoText} /></motion.div>
                <motion.div variants={staggerItemX} {...scrollChildX(2, 4)}><T k="contact.successTitle" className={styles.tooltipDemoText} /></motion.div>
                <motion.div variants={staggerItemX} {...scrollChildX(3, 4)}><T k="postsPage.subtitle" className={styles.tooltipDemoText} /></motion.div>
              </div>
            </motion.div>
          </section>

          {/* ─── Editor (dynamic import — RichTextEditor lazy) ─── */}
          <EditorSection language={language} setSectionRef={setSectionRef} />

          {/* ─── Banner Layouts (dynamic import — PostsBanner lazy) ─── */}
          <BannerSection language={language} setSectionRef={setSectionRef} />
        </div>
      </div>

    </div>
  );
}
