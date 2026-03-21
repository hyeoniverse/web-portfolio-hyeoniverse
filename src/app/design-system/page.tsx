"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useLenis } from "@/providers/LenisProvider";
import { useLoadingScreen } from "@/hooks/useLoadingProgress";
import Button from "@/components/ui/Button";
import { Typography } from "@/components/ui/Typography";
import Tooltip from "@/components/ui/Tooltip";
import T from "@/components/ui/T";
import { useTheme } from "@/providers/ThemeProvider";
import { useLanguage } from "@/providers/LanguageProvider";
import { THEME_PRESETS } from "@/app/admin/(dashboard)/settings/_data/settingsConstants";
import { snapshotVars, restoreVars, applyPresetColors } from "./_data/presetHelpers";
import {
  ease, staggerContainer, staggerItem, staggerItemX,
  innerStagger, innerStaggerFast,
  createSequence, makeVp, makeVpGroup, makeScrollChildX, makeScrollChildY,
} from "./_data/animations";
import {
  brandColors, neutralScale, alphaSteps, semanticColors,
  typoVariants, typoColors, spacingScale, radiusScale,
  shadowScale, durations, easings, zScale, tocSections,
} from "./_data/tokenData";
import ComponentsSection from "./_sections/ComponentsSection";
import EditorSection from "./_sections/EditorSection";
import BannerSection from "./_sections/BannerSection";
import styles from "./DesignSystem.module.css";


export default function DesignSystemPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const { language } = useLanguage();
  const { setInfinite, scrollTo, lenis, stop, start } = useLenis();
  const { isLoading: isScreenLoading } = useLoadingScreen();
  const [activeSection, setActiveSection] = useState("");
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
      setInfinite(true);
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

  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    const entries = new Map<string, boolean>();

    sectionRefs.current.forEach((el, id) => {
      const observer = new IntersectionObserver(
        ([entry]) => {
          entries.set(id, entry.isIntersecting);
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

          {/* ─── Principles ─── */}
          <section id="principles" ref={setSectionRef("principles")} className={styles.section}>
            <h2 className={styles.sectionTitle}>Principles</h2>

            <motion.div initial="hidden" {...vpGroup(nd())} variants={staggerContainer}>
              {/* 3-Layer Architecture */}
              <motion.div className={styles.principleCard} variants={staggerItem} {...scrollChildY(0)}>
                <h3 className={styles.principleTitle}>3-Layer Token Architecture</h3>
                <p className={styles.principleDesc}>
                  {language === "ko"
                    ? "모든 스타일 값은 3단계 추상화를 거칩니다. Raw 토큰(tokens/)은 색상·크기·간격 등의 원시 값을, Semantic 토큰(_semantic.css)은 용도별 의미를, Context 변수(--_*)는 컴포넌트별 맥락을 정의합니다."
                    : "All style values go through 3 levels of abstraction. Raw tokens (tokens/) define primitive values like color/size/spacing, Semantic tokens (_semantic.css) define purpose-based meaning, and Context variables (--_*) define per-component context."}
                </p>
                <div className={styles.principleFlow}>
                  <span className={styles.principleFlowItem}>
                    <strong>Raw</strong>
                    <code>--color-neutral-900</code>
                  </span>
                  <span className={styles.principleFlowArrow}>→</span>
                  <span className={styles.principleFlowItem}>
                    <strong>Semantic</strong>
                    <code>--text-primary</code>
                  </span>
                  <span className={styles.principleFlowArrow}>→</span>
                  <span className={styles.principleFlowItem}>
                    <strong>Context</strong>
                    <code>--_color-heading</code>
                  </span>
                </div>
              </motion.div>

              {/* Rules */}
              <motion.div className={styles.principleCard} variants={staggerItem} {...scrollChildY(1)}>
                <h3 className={styles.principleTitle}>{language === "ko" ? "핵심 규칙" : "Core Rules"}</h3>
                <ul className={styles.principleList}>
                  <li>
                    <strong>{language === "ko" ? "컨텍스트 토큰은 반드시 글로벌 토큰 참조" : "Context tokens must reference global tokens"}</strong>
                    <div className={styles.principleExample}>
                      <code className={styles.principleBad}>--_color-bg: #f5f5f0</code>
                      <code className={styles.principleGood}>--_color-bg: var(--color-neutral-50)</code>
                    </div>
                  </li>
                  <li>
                    <strong>{language === "ko" ? "var() fallback 금지" : "No var() fallbacks"}</strong>
                    <div className={styles.principleExample}>
                      <code className={styles.principleBad}>var(--color-accent, #d01046)</code>
                      <code className={styles.principleGood}>var(--color-accent)</code>
                    </div>
                  </li>
                  <li>
                    <strong>{language === "ko" ? "컴포넌트 CSS에 직접 hex/rgba 금지" : "No raw hex/rgba in component CSS"}</strong>
                    <div className={styles.principleExample}>
                      <code className={styles.principleBad}>color: #333333</code>
                      <code className={styles.principleGood}>color: var(--text-primary)</code>
                    </div>
                  </li>
                  <li>
                    <strong>{language === "ko" ? "테마 전환은 Semantic 레이어에서 처리" : "Theme switching happens at the Semantic layer"}</strong>
                    <span className={styles.principleNote}>
                      {language === "ko"
                        ? "html[data-theme=\"dark\"]에서 semantic 변수만 재정의하면 모든 컴포넌트에 반영"
                        : "Redefine semantic variables under html[data-theme=\"dark\"] — all components follow"}
                    </span>
                  </li>
                </ul>
              </motion.div>

              {/* Token Categories */}
              <motion.div className={styles.principleCard} variants={staggerItem} {...scrollChildY(2)}>
                <h3 className={styles.principleTitle}>{language === "ko" ? "토큰 카테고리" : "Token Categories"}</h3>
                <div className={styles.principleTokenGrid}>
                  {[
                    { name: "Color", file: "_color.css", desc: language === "ko" ? "브랜드·중립·알파 색상" : "Brand, neutral, alpha colors" },
                    { name: "Typography", file: "_typography.css", desc: language === "ko" ? "폰트 패밀리·크기·굵기·행간" : "Font family, size, weight, line-height" },
                    { name: "Spacing", file: "_spacing.css", desc: language === "ko" ? "단일(--spacing-*) + 복합(--box-*)" : "Single (--spacing-*) + compound (--box-*)" },
                    { name: "Radius", file: "_radius.css", desc: language === "ko" ? "xs~circle, capsule 포함" : "xs to circle, including capsule" },
                    { name: "Shadow", file: "_shadow.css", desc: language === "ko" ? "xs~2xl 그림자" : "xs to 2xl shadows" },
                    { name: "Motion", file: "_motion.css", desc: language === "ko" ? "duration, easing, delay" : "Duration, easing, delay" },
                    { name: "Z-Index", file: "_z-index.css", desc: language === "ko" ? "레이어 스택 순서" : "Layer stacking order" },
                    { name: "Sizing", file: "_sizing.css", desc: language === "ko" ? "컴포넌트 크기 프리셋" : "Component size presets" },
                  ].map((t) => (
                    <div key={t.name} className={styles.principleTokenItem}>
                      <strong>{t.name}</strong>
                      <code>{t.file}</code>
                      <span>{t.desc}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          </section>

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

          {/* ─── Editor (dynamic import — RichTextEditor lazy) ─── */}
          <EditorSection language={language} setSectionRef={setSectionRef} />

          {/* ─── Banner Layouts (dynamic import — PostsBanner lazy) ─── */}
          <BannerSection language={language} setSectionRef={setSectionRef} />
        </div>
      </div>

    </div>
  );
}
