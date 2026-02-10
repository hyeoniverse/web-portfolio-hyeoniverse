"use client";

import {
  useRef,
  useLayoutEffect,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";
import Image from "next/image";
import { motion, useSpring, useMotionValue } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
import { useLanguage } from "@/providers/LanguageProvider";
import { useLenis } from "@/providers/LenisProvider";
import { siteConfig } from "@/config/site.config";
import {
  designFeatures,
  techStack,
  designProcess,
  codeExamples,
  troubleShootingItems,
  projectOverview,
  projectStructure,
} from "@/data/webflow";
import DynamicFrameLayout from "@/components/common/DynamicFrame/DynamicFrameLayout";
import type { Frame } from "@/components/common/DynamicFrame/DynamicFrameLayout";
import CodeHighlight from "./CodeHighlight";
import styles from "./WebFlowSection.module.css";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);
}

export default function WebFlowSection() {
  const { t, language } = useLanguage();
  const { setInfinite } = useLenis();
  const sectionRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const scrollTweenRef = useRef<gsap.core.Tween | null>(null);

  // Section navigation
  const [activeSection, setActiveSection] = useState(0);
  const [hoveredSection, setHoveredSection] = useState<number | null>(null);
  const navRef = useRef<HTMLElement>(null);
  const navItemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const springConfig = { stiffness: 170, damping: 22, mass: 1 };
  const indicatorX = useMotionValue(0);
  const indicatorWidth = useMotionValue(0);
  const springX = useSpring(indicatorX, springConfig);
  const springWidth = useSpring(indicatorWidth, springConfig);

  const updateIndicator = useCallback(
    (el: HTMLElement | null) => {
      if (!el || !navRef.current) return;
      const pad = 6;
      const navRect = navRef.current.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      indicatorX.set(elRect.left - navRect.left - pad);
      indicatorWidth.set(elRect.width + pad * 2);
    },
    [indicatorX, indicatorWidth],
  );

  const highlightedSection = hoveredSection ?? activeSection;

  // Sync indicator after render — wait a frame so CSS transitions start
  useEffect(() => {
    const el = navItemRefs.current[highlightedSection];
    if (!el) return;
    // Immediate update for position
    updateIndicator(el);
    // Re-measure after label transition finishes (300ms matches CSS)
    const timer = setTimeout(() => updateIndicator(el), 320);
    return () => clearTimeout(timer);
  }, [highlightedSection, updateIndicator]);

  const navSections = useMemo(
    () => [
      { id: 0, label: "Hello" },
      { id: 1, label: "Overview" },
      { id: 2, label: "Architecture" },
      { id: 3, label: "Features" },
      { id: 4, label: "Process" },
      { id: 5, label: "Tech" },
      { id: 6, label: "Code" },
      { id: 7, label: "Troubleshoot" },
      { id: 8, label: "Credits" },
    ],
    [],
  );

  // Code Highlights — mobile accordion
  const [expandedMobileCode, setExpandedMobileCode] = useState<number | null>(
    null,
  );

  // Code Highlights — frames for DynamicFrameLayout (3x3 grid, 7 items)
  const codeFrames: Frame[] = useMemo(
    () =>
      codeExamples.map((_, i) => ({
        id: i + 1,
        video: "",
        defaultPos: {
          x: (i % 3) * 4,
          y: Math.floor(i / 3) * 4,
          w: 4,
          h: 4,
        },
        mediaSize: 1,
        borderThickness: 0,
        borderSize: 80,
        autoplayMode: "all" as const,
        isHovered: false,
      })),
    [],
  );

  // Navigate to section via ScrollTrigger
  const goToSection = useCallback((navIndex: number) => {
    const track = trackRef.current;
    const tween = scrollTweenRef.current;
    if (!track || !tween) return;

    const panels = track.querySelectorAll(
      `.${styles.panel}, .${styles.panelWide}, .${styles.breakPanel}`,
    );

    // Map nav index to DOM panel index (skip breakPanels)
    let count = 0;
    let target: HTMLElement | undefined;
    for (let i = 0; i < panels.length; i++) {
      if (panels[i].classList.contains(styles.breakPanel)) continue;
      if (count === navIndex) {
        target = panels[i] as HTMLElement;
        break;
      }
      count++;
    }
    if (!target) return;

    const st = tween.scrollTrigger;
    if (!st) return;

    // Calculate the scroll position for this panel
    const trackWidth = track.scrollWidth - window.innerWidth;
    const panelLeft = target.offsetLeft;
    const ratio = panelLeft / trackWidth;
    const scrollTo = st.start + (st.end - st.start) * ratio;

    gsap.to(window, {
      scrollTo: { y: scrollTo },
      duration: 1,
      ease: "power2.inOut",
    });
  }, []);

  // Disable Lenis infinite scroll on this page
  useEffect(() => {
    setInfinite(false);
    return () => setInfinite(true);
  }, [setInfinite]);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const track = trackRef.current;
    if (!section || !track) return;

    // Skip horizontal scroll on mobile/tablet
    if (window.innerWidth <= 1024) return;

    const ctx = gsap.context(() => {
      // Main horizontal scroll tween
      const scrollTween = gsap.to(track, {
        x: () => -(track.scrollWidth - window.innerWidth),
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: () => `+=${track.scrollWidth - window.innerWidth}`,
          pin: true,
          scrub: 1,
          invalidateOnRefresh: true,
          anticipatePin: 1,
        },
      });

      scrollTweenRef.current = scrollTween;

      // Per-panel content reveal + active section tracking
      const panels = gsap.utils.toArray<HTMLElement>(
        `.${styles.panel}, .${styles.panelWide}, .${styles.breakPanel}`,
        track,
      );

      let navIndex = 0;
      panels.forEach((panel, index) => {
        const isBreak = panel.classList.contains(styles.breakPanel);
        const currentNavIndex = navIndex;

        // Track active section (skip breakPanel)
        ScrollTrigger.create({
          trigger: panel,
          containerAnimation: scrollTween,
          start: "left 60%",
          end: "right 40%",
          onEnter: () => {
            if (!isBreak) setActiveSection(currentNavIndex);
          },
          onEnterBack: () => {
            if (!isBreak) setActiveSection(currentNavIndex);
          },
        });

        if (!isBreak) navIndex++;

        if (index === 0) return; // Hero already visible

        const items = panel.querySelectorAll(`.${styles.animate}`);
        if (items.length === 0) return;

        gsap.from(items, {
          opacity: 0,
          y: 40,
          stagger: 0.06,
          scrollTrigger: {
            trigger: panel,
            containerAnimation: scrollTween,
            start: "left 85%",
            end: "left 55%",
            scrub: 0.6,
          },
        });
      });
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <>
      <section className={styles.section} ref={sectionRef}>
        <div className={styles.track} ref={trackRef}>
          {/* =================== Hero =================== */}
          <div className={styles.panel}>
            <div className={styles.heroContent}>
              <span className={styles.label}>{t("webflow.title")}</span>
              <h2 className={styles.heroTitle}>
                Web Flow
                <br />
                <span className={styles.heroTitleAccent}>& Implementation</span>
              </h2>
              <p className={styles.heroSubtitle}>{t("webflow.description")}</p>
              <span className={styles.heroWatermark}>Flow</span>
            </div>
          </div>

          {/* =================== Overview =================== */}
          <div className={styles.panel}>
            <span className={`${styles.panelNumber} ${styles.animate}`}>
              01
            </span>
            <h3 className={`${styles.panelTitle} ${styles.animate}`}>
              Overview.
            </h3>
            <p className={`${styles.overviewDesc} ${styles.animate}`}>
              {projectOverview.description[language]}
            </p>
            <div className={styles.overviewStats}>
              {projectOverview.stats.map((stat, i) => (
                <div
                  key={i}
                  className={`${styles.overviewStat} ${styles.animate}`}
                >
                  <span className={styles.statValue}>{stat.value}</span>
                  <span className={styles.statLabel}>
                    {stat.label[language]}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* =================== Architecture =================== */}
          <div className={styles.panel}>
            <span className={`${styles.panelNumber} ${styles.animate}`}>
              02
            </span>
            <h3 className={`${styles.panelTitle} ${styles.animate}`}>
              Architecture.
            </h3>
            <div className={styles.archGrid}>
              {projectStructure.map((item, i) => (
                <div
                  key={i}
                  className={`${styles.archItem} ${styles.animate} ${
                    item.indent === 1
                      ? styles.archIndent1
                      : item.indent === 2
                        ? styles.archIndent2
                        : ""
                  }`}
                >
                  <span className={styles.archPath}>{item.path}</span>
                  <span className={styles.archDesc}>
                    {item.description[language]}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* =================== Features =================== */}
          <div className={`${styles.panel} ${styles.panelWide}`}>
            <span className={`${styles.panelNumber} ${styles.animate}`}>
              03
            </span>
            <h3 className={`${styles.panelTitle} ${styles.animate}`}>
              Key Features.
            </h3>
            <div className={styles.featureGrid}>
              {designFeatures.map((feature, index) => (
                  <div
                    key={index}
                    className={`${styles.featureFolder} ${styles.animate}`}
                  >
                    <span className={styles.featureFolderTab}>
                      {feature.title}
                    </span>
                    <div className={styles.featureFolderCard}>
                      <p className={styles.featureFolderDesc}>
                        {feature.description[language]}
                      </p>
                      <p className={styles.featureFolderTech}>
                        {feature.tech.join(" · ")}
                      </p>
                    </div>
                  </div>
              ))}
            </div>
          </div>

          {/* =================== Process =================== */}
          <div className={styles.panel}>
            <span className={`${styles.panelNumber} ${styles.animate}`}>
              04
            </span>
            <h3 className={`${styles.panelTitle} ${styles.animate}`}>
              Design Process.
            </h3>
            <div className={styles.processGrid}>
              {designProcess.map((process, index) => (
                <div
                  key={index}
                  className={`${styles.processItem} ${styles.animate}`}
                >
                  <span className={styles.processNumber}>{process.step}</span>
                  <h4 className={styles.processTitle}>
                    {process.title[language]}
                  </h4>
                  <p className={styles.processDesc}>
                    {process.description[language]}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* =================== Visual Break =================== */}
          <div className={styles.breakPanel}>
            <Image
              src="https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1600&h=1000&fit=crop"
              alt="Visual break"
              fill
              sizes="50vw"
              style={{ objectFit: "cover" }}
            />
          </div>

          {/* =================== Tech Stack =================== */}
          <div className={styles.panel}>
            <span className={`${styles.panelNumber} ${styles.animate}`}>
              05
            </span>
            <h3 className={`${styles.panelTitle} ${styles.animate}`}>
              Tech Stack.
            </h3>
            <div className={styles.techGrid}>
              {techStack.map((tech, index) => (
                <div
                  key={index}
                  className={`${styles.techItem} ${styles.animate}`}
                >
                  <span className={styles.techName}>{tech.name}</span>
                  <span className={styles.techCategory}>{tech.category}</span>
                </div>
              ))}
            </div>
          </div>

          {/* =================== Code Highlights =================== */}
          <div className={`${styles.panel} ${styles.panelCode}`}>
            <span className={`${styles.panelNumber} ${styles.animate}`}>
              06
            </span>
            <h3 className={`${styles.panelTitleCompact} ${styles.animate}`}>
              Code Highlights.
            </h3>
            {/* Desktop: DynamicFrame grid */}
            <div className={styles.codeGridWrap}>
              <DynamicFrameLayout
                initialFrames={codeFrames}
                initialGapSize={4}
                initialHoverSize={9}
                renderCell={({ index, isHovered }) => {
                  if (index >= codeExamples.length) return null;
                  const example = codeExamples[index];
                  return (
                    <div
                      className={`${styles.codeItem} ${isHovered ? styles.codeItemActive : ""}`}
                    >
                      <div className={styles.codeItemHeader}>
                        <span className={styles.codeNumber}>
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <h4 className={styles.codeTitle}>{example.title}</h4>
                      </div>
                      <p className={styles.codeDesc}>
                        {example.description[language]}
                      </p>
                      <div
                        className={`${styles.codeReveal} ${isHovered ? styles.codeRevealVisible : ""}`}
                      >
                        <CodeHighlight
                          code={example.code}
                          language={example.language}
                        />
                      </div>
                    </div>
                  );
                }}
              />
            </div>
            {/* Mobile: list with border-bottom dividers */}
            <div className={styles.codeListMobile}>
              {codeExamples.map((example, index) => {
                const isOpen = expandedMobileCode === index;
                return (
                  <div
                    key={index}
                    className={styles.codeItemMobile}
                    onClick={() => setExpandedMobileCode(isOpen ? null : index)}
                  >
                    <div className={styles.codeMobileHeader}>
                      <span className={styles.codeNumber}>
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <div className={styles.codeMobilePreview}>
                        <h4 className={styles.codeTitle}>{example.title}</h4>
                        <p className={styles.codeDesc}>
                          {example.description[language]}
                        </p>
                      </div>
                      <span
                        className={`${styles.codeMobileToggle} ${isOpen ? styles.codeMobileToggleOpen : ""}`}
                      >
                        +
                      </span>
                    </div>
                    <div
                      className={`${styles.codeMobileBody} ${isOpen ? styles.codeMobileBodyOpen : ""}`}
                    >
                      <CodeHighlight
                        code={example.code}
                        language={example.language}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* =================== Troubleshooting =================== */}
          <div className={styles.panel}>
            <span className={`${styles.panelNumber} ${styles.animate}`}>
              07
            </span>
            <h3 className={`${styles.panelTitle} ${styles.animate}`}>
              Trouble Shooting.
            </h3>
            <div className={styles.troubleTimeline}>
              {troubleShootingItems.map((item, index) => (
                <div
                  key={index}
                  className={`${styles.troubleItem} ${styles.animate}`}
                >
                  <div className={styles.troubleNode}>
                    <span className={styles.troubleNumber}>
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <div className={styles.troubleContent}>
                    <h4 className={styles.troubleTitle}>
                      {item.problem[language]}
                    </h4>
                    <div className={styles.troubleBody}>
                      <div className={styles.troubleEntry}>
                        <span className={styles.troubleLabel}>
                          {t("webflow.troubleshooting.cause")}
                        </span>
                        <p>{item.cause[language]}</p>
                      </div>
                      <div className={styles.troubleEntry}>
                        <span
                          className={`${styles.troubleLabel} ${styles.troubleLabelAccent}`}
                        >
                          {t("webflow.troubleshooting.solution")}
                        </span>
                        <p>{item.solution[language]}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* =================== Credits =================== */}
          <div
            className={`${styles.panel} ${styles.panelNarrow} ${styles.creditsPanel}`}
          >
            <p className={`${styles.creditsText} ${styles.animate}`}>
              {t("webflow.credits")} {siteConfig.personal.nickname}
            </p>
          </div>
        </div>
      </section>

      {/* Section Navigation */}
      <nav
        className={styles.sectionNav}
        ref={navRef}
        onMouseLeave={() => setHoveredSection(null)}
      >
        <motion.span
          className={styles.navIndicator}
          style={{ x: springX, width: springWidth }}
        />
        {navSections.map((sec, i) => (
          <button
            key={sec.id}
            ref={(el) => {
              navItemRefs.current[i] = el;
            }}
            className={`${styles.navItem} ${highlightedSection === sec.id ? styles.navItemActive : ""}`}
            onClick={() => goToSection(sec.id)}
            onMouseEnter={() => setHoveredSection(sec.id)}
            aria-label={`Go to ${sec.label}`}
          >
            <span className={styles.navDot} />
            <span className={styles.navLabel}>{sec.label}</span>
          </button>
        ))}
      </nav>
    </>
  );
}
