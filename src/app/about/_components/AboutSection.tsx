"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useLanguage } from "@/providers/LanguageProvider";
import { useLenis } from "@/providers/LenisProvider";
import { useLoadingScreen } from "@/hooks/useLoadingProgress";
import { useSiteConfig } from "@/providers/SiteConfigProvider";
import { projectOverview } from "@/data/about/architecture";
import { designConcepts } from "@/data/about/concepts";
import { designFeatures } from "@/data/about/features";
import { designPhilosophy } from "@/data/about/philosophy";
import { designProcess } from "@/data/about/process";
import { securityItems } from "@/data/about/security";
import { techStack } from "@/data/about/stack";
import { useHorizontalScroll } from "@/hooks/useHorizontalScroll";
import { useInViewMobile } from "../_hooks/useInViewMobile";
import { useNavIndicator } from "../_hooks/useNavIndicator";
import { useMobileLayout } from "@/hooks/useMobileLayout";
import {
  HeroPanel,
  OverviewPanel,
  FeaturesPanel,
  DesignConceptPanel,
  DesignSystemPanel,
  ProcessPanel,
  VisualBreakPanel,
  TechStackPanel,
  SecurityPanel,
  CreditsPanel,
} from "./panels";
import SectionNav from "./SectionNav";
import styles from "./AboutSection.module.css";

/* ── Mobile tab configuration ── */
const MOBILE_TABS = [
  { key: "overview", label: "Overview" },
  { key: "design", label: "Design" },
  { key: "tech", label: "Tech" },
  { key: "code", label: "Code" },
] as const;

type MobileTab = (typeof MOBILE_TABS)[number]["key"];

/* ── Heavy panels: dynamic import for code splitting ── */
const PanelSkeleton = ({ className }: { className?: string }) => (
  <div
    className={`${styles.panel} ${className ?? styles.panelExtraWide}`}
    style={{ minHeight: "100vh" }}
  />
);

const ArchitecturePanel = dynamic(() => import("./panels/ArchitecturePanel"), {
  loading: () => <PanelSkeleton className={styles.panel} />,
  ssr: false,
});
const UserFlowPanel = dynamic(() => import("./panels/UserFlowPanel"), {
  loading: () => <PanelSkeleton />,
  ssr: false,
});
const BackendPanel = dynamic(() => import("./panels/BackendPanel"), {
  loading: () => <PanelSkeleton />,
  ssr: false,
});
const ErdPanel = dynamic(() => import("./panels/ErdPanel"), {
  loading: () => <PanelSkeleton />,
  ssr: false,
});
const CodeHighlightsPanel = dynamic(
  () => import("./panels/CodeHighlightsPanel"),
  { loading: () => <PanelSkeleton />, ssr: false },
);
const TroubleshootingPanel = dynamic(
  () => import("./panels/TroubleshootingPanel"),
  { loading: () => <PanelSkeleton />, ssr: false },
);

const REPETITIONS = 3;

export default function AboutSection() {
  const siteConfig = useSiteConfig();
  const infiniteScroll = siteConfig.about.infiniteScroll;

  const { language } = useLanguage();
  const { sectionRef, trackRef, activeSection, goToSection, scrollBy } =
    useHorizontalScroll(styles, {
      infinite: infiniteScroll,
      panelSetSize: 16,
      navSectionCount: 15,
    });
  useInViewMobile(trackRef, styles.animate, styles.animateVisible);
  const { isLoading } = useLoadingScreen();
  const {
    navRef,
    navItemRefs,
    setHoveredSection,
    highlightedSection,
    springX,
    springWidth,
    navSections,
  } = useNavIndicator(activeSection, !isLoading);

  const isMobile = useMobileLayout();
  const { lenis, scrollTo: lenisScrollTo } = useLenis();

  /* ── Mobile tab state ── */
  const [mobileTab, setMobileTab] = useState<MobileTab>("overview");
  const [tabBarHidden, setTabBarHidden] = useState(false);
  const [tabDirection, setTabDirection] = useState<1 | -1>(1);
  const lastScrollY = useRef(0);

  const handleTabChange = useCallback(
    (tab: MobileTab) => {
      if (tab === mobileTab) return;
      const fromIdx = MOBILE_TABS.findIndex((t) => t.key === mobileTab);
      const toIdx = MOBILE_TABS.findIndex((t) => t.key === tab);
      setTabDirection(toIdx > fromIdx ? 1 : -1);
      ScrollTrigger.getAll().forEach((st) => st.kill());
      // 즉시 스크롤 리셋 — 탭 전환 시 이전 위치가 잠깐 보이는 것 방지
      const el = sectionRef.current;
      if (el) lenisScrollTo(el, { immediate: true, offset: 0 });
      setMobileTab(tab);
      setTabBarHidden(false);
    },
    [mobileTab, lenisScrollTo, sectionRef],
  );

  // 스크롤 방향 감지: 아래 → 접힘, 위 → 펼침 + 끝까지 스크롤 시 다음 탭
  useEffect(() => {
    if (!isMobile) return;
    const TRIGGER = 15;
    let accumulated = 0;
    let bottomHoldFrames = 0;
    const BOTTOM_THRESHOLD = 3;

    const onScroll = () => {
      const y = window.scrollY;
      const delta = y - lastScrollY.current;
      lastScrollY.current = y;

      // 섹션 상단 근처에서는 항상 표시
      const top = sectionRef.current?.offsetTop ?? 0;
      if (y < top + 100) {
        setTabBarHidden(false);
        accumulated = 0;
        bottomHoldFrames = 0;
        topHoldFrames = 0;
        return;
      }

      if (Math.sign(delta) !== Math.sign(accumulated)) accumulated = 0;
      accumulated += delta;

      // Design System 패널(design 탭)에서는 탭바 항상 표시
      if (accumulated > TRIGGER && mobileTab !== "design") setTabBarHidden(true);
      else if (accumulated < -TRIGGER) setTabBarHidden(false);

      // 페이지 끝 도달 감지 → 다음 탭 전환
      // Lenis smooth scroll은 정확히 끝까지 안 갈 수 있으므로 여유값 10px
      const atBottom =
        window.innerHeight + y >= document.documentElement.scrollHeight - 10;
      if (atBottom && delta > 0) {
        bottomHoldFrames++;
        if (bottomHoldFrames >= BOTTOM_THRESHOLD) {
          bottomHoldFrames = 0;
          setTabDirection(1);
          ScrollTrigger.getAll().forEach((st) => st.kill());
          setMobileTab((prev) => {
            const idx = MOBILE_TABS.findIndex((t) => t.key === prev);
            if (idx < MOBILE_TABS.length - 1) {
              setTabBarHidden(false);
              return MOBILE_TABS[idx + 1].key;
            }
            return prev;
          });
        }
      } else {
        bottomHoldFrames = 0;
      }

      // (상단 이전 탭 전환은 wheel/touch 이벤트에서 처리)
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isMobile, sectionRef, lenisScrollTo, mobileTab]);

  // 상단에서 위로 스크롤 → 이전 탭 (wheel + touch)
  useEffect(() => {
    if (!isMobile) return;
    let topAccum = 0;
    const THRESHOLD = 80;
    let touchStartY = 0;

    const isAtTop = () => {
      const sectionTop = sectionRef.current?.offsetTop ?? 0;
      return window.scrollY <= sectionTop + 2;
    };

    let transitioning = false;

    const goToPrevTab = () => {
      if (transitioning) return;
      transitioning = true;
      topAccum = 0;
      setTabDirection(-1);
      ScrollTrigger.getAll().forEach((st) => st.kill());
      setMobileTab((prev) => {
        const idx = MOBILE_TABS.findIndex((t) => t.key === prev);
        if (idx > 0) {
          setTabBarHidden(false);
          return MOBILE_TABS[idx - 1].key;
        }
        return prev;
      });
    };

    const onWheel = (e: WheelEvent) => {
      if (transitioning) return;
      if (!isAtTop() || e.deltaY >= 0) { topAccum = 0; return; }
      topAccum += Math.abs(e.deltaY);
      if (topAccum >= THRESHOLD) goToPrevTab();
    };

    const onTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (transitioning) return;
      if (!isAtTop()) { topAccum = 0; return; }
      const dy = e.touches[0].clientY - touchStartY;
      if (dy <= 0) { topAccum = 0; return; }
      topAccum = dy;
      if (topAccum >= THRESHOLD) goToPrevTab();
    };

    const onTouchEnd = () => { topAccum = 0; };

    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [isMobile, sectionRef]);

  // ScrollTrigger refresh + 스크롤 리셋 — 공통 로직
  const refreshAndScroll = useCallback(() => {
    if (!isMobile) return;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (lenis as any)?.resize?.();
        ScrollTrigger.refresh();
        // 이미 section top 근처에 있으면 스크롤 생략 — 튕김 방지
        const el = sectionRef.current;
        if (el) {
          const sectionTop = el.getBoundingClientRect().top + window.scrollY;
          if (Math.abs(window.scrollY - sectionTop) > 5) {
            lenisScrollTo(el, { immediate: true, offset: 0 });
          }
        }
        requestAnimationFrame(() => ScrollTrigger.update());
      });
    });
  }, [isMobile, lenis, lenisScrollTo, sectionRef]);

  // enter 애니메이션 완료 후 refresh — 탭 전환 시
  const handleTabAnimComplete = useCallback(() => {
    refreshAndScroll();
  }, [refreshAndScroll]);

  // 첫 로드 시 refresh (initial={false}라 onAnimationComplete 안 불림)
  useEffect(() => {
    if (!isMobile) return;
    refreshAndScroll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobile]);

  /* ── Desktop: all panels in horizontal scroll ── */
  const panelSet = (key: number) => (
    <Fragment key={key}>
      <HeroPanel />
      <OverviewPanel language={language} overview={projectOverview} />
      <ArchitecturePanel language={language} />
      <UserFlowPanel language={language} scrollBy={scrollBy} />
      <FeaturesPanel language={language} features={designFeatures} />
      <DesignConceptPanel
        language={language}
        philosophy={designPhilosophy}
        scrollBy={scrollBy}
      />
      <DesignSystemPanel
        language={language}
        concepts={designConcepts}
        mode={siteConfig.about.designConceptTransition as "strip" | "stack"}
        scrollBy={scrollBy}
      />
      <ProcessPanel
        language={language}
        process={designProcess}
        scrollBy={scrollBy}
      />
      <VisualBreakPanel />
      <TechStackPanel techStack={techStack} />
      <BackendPanel language={language} scrollBy={scrollBy} />
      <ErdPanel language={language} scrollBy={scrollBy} />
      <CodeHighlightsPanel language={language} scrollBy={scrollBy} />
      <TroubleshootingPanel language={language} scrollBy={scrollBy} />
      <SecurityPanel language={language} items={securityItems} />
      <CreditsPanel />
    </Fragment>
  );

  /* ── Mobile: panels per tab ── */
  const mobilePanels = () => {
    switch (mobileTab) {
      case "overview":
        return (
          <>
            <HeroPanel />
            <OverviewPanel language={language} overview={projectOverview} />
            <FeaturesPanel language={language} features={designFeatures} />
          </>
        );
      case "design":
        return (
          <>
            <DesignConceptPanel
              language={language}
              philosophy={designPhilosophy}
              scrollBy={scrollBy}
            />
            <DesignSystemPanel
              language={language}
              concepts={designConcepts}
              mode={siteConfig.about.designConceptTransition as "strip" | "stack"}
              scrollBy={scrollBy}
            />
            <ProcessPanel
              language={language}
              process={designProcess}
              scrollBy={scrollBy}
            />
          </>
        );
      case "tech":
        return (
          <>
            <ArchitecturePanel language={language} />
            <UserFlowPanel language={language} scrollBy={scrollBy} />
            <TechStackPanel techStack={techStack} />
            <BackendPanel language={language} scrollBy={scrollBy} />
            <ErdPanel language={language} scrollBy={scrollBy} />
          </>
        );
      case "code":
        return (
          <>
            <CodeHighlightsPanel language={language} scrollBy={scrollBy} />
            <TroubleshootingPanel language={language} scrollBy={scrollBy} />
            <SecurityPanel language={language} items={securityItems} />
            <CreditsPanel />
          </>
        );
    }
  };

  return (
    <>
      {isMobile && <div className={styles.navBlur} />}
      <section className={styles.section} ref={sectionRef}>
        {isMobile && (
          <nav
            className={`${styles.mobileTabBar} ${
              tabBarHidden ? styles.mobileTabBarHidden : ""
            }`}
          >
            {MOBILE_TABS.map((tab) => (
              <button
                key={tab.key}
                className={`${styles.mobileTabBtn} ${
                  mobileTab === tab.key ? styles.mobileTabBtnActive : ""
                }`}
                onClick={() => handleTabChange(tab.key)}
              >
                {tab.label}
                {mobileTab === tab.key && (
                  <motion.span
                    className={styles.mobileTabIndicator}
                    layoutId="aboutTabIndicator"
                    transition={{ type: "spring", stiffness: 500, damping: 32 }}
                  />
                )}
              </button>
            ))}
            <div id="about-tab-actions" className={styles.mobileTabActions} />
          </nav>
        )}
        <div className={styles.track} ref={trackRef}>
          {isMobile ? (
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={mobileTab}
                className={styles.tabContent}
                initial={{ opacity: 0, y: tabDirection > 0 ? 60 : -60 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: tabDirection > 0 ? -40 : 40 }}
                transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
                onAnimationComplete={handleTabAnimComplete}
              >
                {mobilePanels()}
              </motion.div>
            </AnimatePresence>
          ) : infiniteScroll ? (
            Array.from({ length: REPETITIONS }, (_, i) => panelSet(i))
          ) : (
            panelSet(0)
          )}
        </div>
      </section>
      {!isLoading && (
        <>
          <SectionNav
            navRef={navRef}
            navItemRefs={navItemRefs}
            navSections={navSections}
            highlightedSection={highlightedSection}
            springX={springX}
            springWidth={springWidth}
            onHover={setHoveredSection}
            onNavigate={goToSection}
          />
          {!isMobile && (
            <>
              <button
                data-clickable="true"
                className={styles.slideArrow}
                onClick={() => {
                  const prev = (activeSection - 1 + navSections.length) % navSections.length;
                  goToSection(prev);
                }}
                aria-label="Previous section"
              >
                ‹
              </button>
              <button
                data-clickable="true"
                className={`${styles.slideArrow} ${styles.slideArrowRight}`}
                onClick={() => {
                  const next = (activeSection + 1) % navSections.length;
                  goToSection(next);
                }}
                aria-label="Next section"
              >
                ›
              </button>
            </>
          )}
        </>
      )}
    </>
  );
}
