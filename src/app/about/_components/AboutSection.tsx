"use client";

import { Fragment } from "react";
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
import styles from "./AboutSection.module.css";

const REPETITIONS = 3;

export default function AboutSection() {
  const siteConfig = useSiteConfig();
  const infiniteScroll = siteConfig.about.infiniteScroll;

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

  /* ── Render panels from config ── */
  const renderPanels = (panels: typeof desktopPanels) =>
    panels.map(({ key, Component, props }) => (
      <Component key={key} {...props(ctx)} />
    ));

  const panelSet = (repeatKey: number) => (
    <Fragment key={repeatKey}>{renderPanels(desktopPanels)}</Fragment>
  );

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
                {renderPanels(mobileTabPanels[mobileTab] ?? [])}
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
                  const navIdx = highlightedSection;
                  const prev = (navIdx - 1 + navSections.length) % navSections.length;
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
                  const navIdx = highlightedSection;
                  const next = (navIdx + 1) % navSections.length;
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
