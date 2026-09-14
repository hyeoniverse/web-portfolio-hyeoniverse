"use client";

import { Fragment, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/providers/LanguageProvider";
import { useLoadingScreen } from "@/hooks/useLoadingProgress";
import { useAboutConfig } from "./AboutConfig";
import { useHorizontalScroll } from "@/hooks/useHorizontalScroll";
import { useInViewMobile } from "../_hooks/useInViewMobile";
import { useNavIndicator } from "../_hooks/useNavIndicator";
import { useMobileLayout } from "@/hooks/useMobileLayout";
import { useHasMounted } from "@/hooks/useHasMounted";
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

/* 패널 key → 모바일 탭. 서버 HTML 에는 탭을 모르는 한 세트가 들어가서, 모바일에서 첫 탭이 아닌 패널을 CSS 로 감출 때
   쓴다(AboutPanel.module.css 의 .panelSlot) */
const TAB_OF_PANEL: Record<string, string> = Object.fromEntries(
  Object.entries(mobileTabPanels).flatMap(([tab, panels]) => panels.map(({ key }) => [key, tab])),
);

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
  const about = useAboutConfig();
  const infiniteScroll = about.infiniteScroll;
  const hiddenPanels = useMemo(
    () => new Set(about.hiddenPanels ?? []),
    [about],
  );
  const panelOrder = useMemo(
    () => about.panelOrder ?? [],
    [about],
  );

  const { language } = useLanguage();
  const isMobile = useMobileLayout();
  const hasMounted = useHasMounted();
  /* 무한 스크롤의 앞뒤 세트는 브라우저에서 데스크톱일 때만 붙인다. 서버 HTML 에 세 벌을 다 넣으면 모바일도 그것을
     받아 하이드레이션한 뒤 버렸다(#942). 가로 스크롤은 세 벌이 다 붙은 뒤에 초기 위치를 잡는다 */
  const withCopies = infiniteScroll && hasMounted && !isMobile;
  const { sectionRef, trackRef, activeSection, goToSection, scrollBy } =
    useHorizontalScroll(styles, {
      infinite: infiniteScroll,
      panelSetSize: 15,
      navSectionCount: 14,
      ready: !infiniteScroll || withCopies,
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

  /* ── Render panels from config — about.hiddenPanels 에 등록된 key 는 skip.
     칸(.panelSlot)은 상자를 만들지 않고 모바일 탭만 표시한다 ── */
  const renderPanels = (panels: typeof desktopPanels) =>
    panels
      .filter(({ key }) => !hiddenPanels.has(key))
      .map(({ key, Component, props }) => (
        <div key={key} className={styles.panelSlot} data-tab={TAB_OF_PANEL[key]}>
          <Component {...props(ctx)} />
        </div>
      ));

  const desktopSet = () => renderPanels(orderPanels(desktopPanels, panelOrder));

  return (
    <>
      {/* data-near-root — 가로 트랙을 잘라내는 상자라 패널 지연 마운트의 관찰 기준으로 쓴다(_hooks/useNearViewport, #921) */}
      <section className={styles.section} ref={sectionRef} suppressHydrationWarning data-near-root>
        {/* 탭 막대는 늘 그리고, 보일지는 CSS 가 정한다(모바일 미디어 쿼리에서만 display: flex). 예전에는 isMobile 일 때만
            그렸는데 그 값이 서버·하이드레이션에서는 false 라, 모바일에서 하이드레이션 직후 53px 막대가 본문 위에 끼어들어
            본문을 밀었다(CLS 0.056, #923) */}
        <nav
          aria-label={language === "ko" ? "About 섹션" : "About sections"}
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
        <div className={styles.track} ref={trackRef}>
          {withCopies && <Fragment key="before">{desktopSet()}</Fragment>}
          {/* 모바일 탭 묶음. 서버와 하이드레이션에서는 모바일인지 모르므로 한 세트를 다 그리고, 모바일이면 CSS 가 첫 탭
              패널만 보인다. 붙은 뒤 모바일은 같은 묶음에서 지금 탭 패널만 남겨, 첫 탭 패널을 다시 마운트하지 않는다(#942).
              예전에는 서버·하이드레이션이 데스크톱 트리를 그리고 붙은 직후 모바일 트리로 통째로 바꿨다.
              데스크톱에서 이 묶음은 상자를 만들지 않아(display: contents) 패널이 트랙에 그대로 늘어선다 */}
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={mobileTab}
              className={styles.tabContent}
              data-tab={mobileTab}
              initial={{ opacity: 0, y: tabDirection > 0 ? 60 : -60 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: tabDirection > 0 ? -40 : 40 }}
              transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
              onAnimationComplete={handleTabAnimComplete}
            >
              {isMobile ? renderPanels(orderPanels(mobileTabPanels[mobileTab] ?? [], panelOrder)) : desktopSet()}
            </motion.div>
          </AnimatePresence>
          {withCopies && <Fragment key="after">{desktopSet()}</Fragment>}
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
