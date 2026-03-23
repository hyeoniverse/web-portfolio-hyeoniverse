"use client";

import { Fragment, useEffect } from "react";
import dynamic from "next/dynamic";
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
  DesignMotifPanel,
  DesignConceptPanel,
  ProcessPanel,
  VisualBreakPanel,
  TechStackPanel,
  SecurityPanel,
  CreditsPanel,
} from "./panels";
import SectionNav from "./SectionNav";
import styles from "./AboutSection.module.css";

/* ── Heavy panels: dynamic import for code splitting ── */
const PanelSkeleton = ({ className }: { className?: string }) => (
  <div className={`${styles.panel} ${className ?? styles.panelExtraWide}`} />
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
  const { lenis } = useLenis();

  // 모바일: 모든 패널 ScrollTrigger 인스턴스 생성 완료 후
  // Lenis 치수 강제 재계산 + 글로벌 ScrollTrigger refresh.
  // parent useEffect는 children useEffect 이후 실행되므로,
  // 이 시점에서 모든 패널의 rAF가 예약됨 → 다음 프레임에서 모두 실행 →
  // 그 다음 프레임에서 최종 refresh로 모든 pin-spacer 위치 보정.
  //
  // lenis.resize(): Lenis Dimensions 클래스가 ResizeObserver를 250ms
  // 디바운스하므로, BreakpointGuard 리마운트 직후 limit 값이 구형(~0).
  // 이를 즉시 재계산하여 ScrollTrigger가 올바른 scroll 값을 받도록 함.
  useEffect(() => {
    if (!isMobile) return;
    let raf2: number;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        // Lenis Dimensions 250ms 디바운스 우회: 즉시 치수 재계산
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (lenis as any)?.resize?.();
        ScrollTrigger.refresh();
      });
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [isMobile, lenis]);

  const panelSet = (key: number) => (
    <Fragment key={key}>
      <HeroPanel />
      <OverviewPanel language={language} overview={projectOverview} />
      <ArchitecturePanel language={language} />
      <UserFlowPanel language={language} scrollBy={scrollBy} />
      <FeaturesPanel language={language} features={designFeatures} />
      <DesignMotifPanel
        language={language}
        philosophy={designPhilosophy}
        scrollBy={scrollBy}
      />
      <DesignConceptPanel
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

  return (
    <>
      <div className={styles.sectionWrap}>
      <section className={styles.section} ref={sectionRef}>
        <div className={styles.track} ref={trackRef}>
          {isMobile || !infiniteScroll
            ? panelSet(0)
            : Array.from({ length: REPETITIONS }, (_, i) => panelSet(i))}
        </div>
      </section>
      </div>
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
