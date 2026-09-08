"use client";

import { Fragment, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/providers/LanguageProvider";
import { useLoadingScreen } from "@/hooks/useLoadingProgress";
import { useSiteConfig } from "@/providers/SiteConfigProvider";
import { useHorizontalScroll } from "@/hooks/useHorizontalScroll";
import { useInViewMobile } from "../_hooks/useInViewMobile";
import { useNavIndicator } from "../_hooks/useNavIndicator";
import { useMobileLayout } from "@/hooks/useMobileLayout";
import { useMobileTabNavigation } from "../_hooks/useMobileTabNavigation";
import {
  desktopPanels,
  mobileTabPanels,
  type PanelContext,
} from "../_config/panelConfig";
import SectionNav from "./SectionNav";
import frame from "./AboutPanel.module.css";
import nav from "./AboutNav.module.css";
import shell from "./AboutSection.module.css";
import Pressable from "@/components/ui/Pressable";
const styles = { ...frame, ...nav, ...shell };

const REPETITIONS = 3;

/* panelOrder(key 배열) 로 패널 정렬. hero 는 항상 맨 앞, credits 는 항상 맨 뒤로 강제.
   order 에 없는 key 는 나머지 끝(credits 앞)에 안정적으로 유지. */
function orderPanels<T extends { key: string }>(panels: T[], order: string[]): T[] {
  if (!order.length) return panels;
  const rank = (k: string) => {
    if (k === "hero") return -1;
    if (k === "credits") return Number.MAX_SAFE_INTEGER;
    const i = order.indexOf(k);
    return i === -1 ? order.length : i;
  };
  return [...panels].sort((a, b) => rank(a.key) - rank(b.key));
}

export default function AboutSection() {
  const siteConfig = useSiteConfig();
  const infiniteScroll = siteConfig.about.infiniteScroll;
  const hiddenPanels = useMemo(
    () => new Set(siteConfig.about.hiddenPanels ?? []),
    [siteConfig.about],
  );
  const panelOrder = useMemo(
    () => siteConfig.about.panelOrder ?? [],
    [siteConfig.about],
  );

  const { language } = useLanguage();
  const { sectionRef, trackRef, activeSection, goToSection, scrollBy } =
    useHorizontalScroll(styles, {
      infinite: infiniteScroll,
      panelSetSize: 15,
      navSectionCount: 14,
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
  const {
    mobileTab,
    tabBarHidden,
    tabDirection,
    handleTabChange,
    handleTabAnimComplete,
    MOBILE_TABS,
  } = useMobileTabNavigation({ isMobile, sectionRef });

  /* ── Panel context — shared props for all panels ── */
  const ctx: PanelContext = {
    language,
    scrollBy,
  };

  /* ── Render panels from config — siteConfig.about.hiddenPanels 에 등록된 key 는 skip ── */
  const renderPanels = (panels: typeof desktopPanels) =>
    panels
      .filter(({ key }) => !hiddenPanels.has(key))
      .map(({ key, Component, props }) => (
        <Component key={key} {...props(ctx)} />
      ));

  const panelSet = (repeatKey: number) => (
    <Fragment key={repeatKey}>{renderPanels(orderPanels(desktopPanels, panelOrder))}</Fragment>
  );

  return (
    <>
      <section className={styles.section} ref={sectionRef} suppressHydrationWarning>
        {isMobile && (
          <nav
            aria-label="About 섹션"
            className={`${styles.mobileTabBar} ${
              tabBarHidden ? styles.mobileTabBarHidden : ""
            }`}
          >
            {MOBILE_TABS.map((tab) => (
              <Pressable noTapScale
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
              </Pressable>
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
                {renderPanels(orderPanels(mobileTabPanels[mobileTab] ?? [], panelOrder))}
              </motion.div>
            </AnimatePresence>
          ) : infiniteScroll ? (
            Array.from({ length: REPETITIONS }, (_, i) => panelSet(i))
          ) : (
            panelSet(0)
          )}
        </div>
      </section>
      <div style={isLoading ? { visibility: "hidden" } : undefined} suppressHydrationWarning>
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
              <Pressable noTapScale
                data-clickable="true"
                className={styles.slideArrow}
                onClick={() => {
                  const navIdx = highlightedSection;
                  const prev = (navIdx - 1 + navSections.length) % navSections.length;
                  goToSection(prev);
                }}
                aria-label="Previous section"
              >
                ‹
              </Pressable>
              <Pressable noTapScale
                data-clickable="true"
                className={`${styles.slideArrow} ${styles.slideArrowRight}`}
                onClick={() => {
                  const navIdx = highlightedSection;
                  const next = (navIdx + 1) % navSections.length;
                  goToSection(next);
                }}
                aria-label="Next section"
              >
                ›
              </Pressable>
            </>
          )}
      </div>
    </>
  );
}
