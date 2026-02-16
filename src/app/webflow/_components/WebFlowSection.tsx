"use client";

import { Fragment, useEffect } from "react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useLanguage } from "@/providers/LanguageProvider";
import { useLenis } from "@/providers/LenisProvider";
import { useLoadingScreen } from "@/hooks/useLoadingProgress";
import { siteConfig } from "@/config/site.config";
import {
  designFeatures,
  designConcepts,
  techStack,
  designProcess,
  codeExamples,
  troubleShootingItems,
  projectOverview,
  projectStructure,
} from "@/data/webflow";
import { useHorizontalScroll } from "../_hooks/useHorizontalScroll";
import { useInViewMobile } from "../_hooks/useInViewMobile";
import { useNavIndicator } from "../_hooks/useNavIndicator";
import { useMobileLayout } from "../_hooks/mobileCheck";
import {
  HeroPanel,
  OverviewPanel,
  ArchitecturePanel,
  FeaturesPanel,
  DesignConceptPanel,
  ProcessPanel,
  VisualBreakPanel,
  TechStackPanel,
  CodeHighlightsPanel,
  TroubleshootingPanel,
  CreditsPanel,
} from "./panels";
import SectionNav from "./SectionNav";
import styles from "./WebFlowSection.module.css";

const REPETITIONS = 3;
const infiniteScroll = siteConfig.webflow.infiniteScroll;

export default function WebFlowSection() {
  const { t, language } = useLanguage();
  const { sectionRef, trackRef, activeSection, goToSection, scrollBy } =
    useHorizontalScroll(styles, infiniteScroll);
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
      <HeroPanel t={t} />
      <OverviewPanel language={language} overview={projectOverview} />
      <ArchitecturePanel language={language} structure={projectStructure} />
      <FeaturesPanel language={language} features={designFeatures} />
      <DesignConceptPanel
        language={language}
        concepts={designConcepts}
        mode={siteConfig.webflow.designConceptTransition}
        scrollBy={scrollBy}
      />
      <ProcessPanel
        language={language}
        process={designProcess}
        scrollBy={scrollBy}
      />
      <VisualBreakPanel />
      <TechStackPanel techStack={techStack} />
      <CodeHighlightsPanel
        language={language}
        codeExamples={codeExamples}
        scrollBy={scrollBy}
      />
      <TroubleshootingPanel
        language={language}
        t={t}
        items={troubleShootingItems}
        scrollBy={scrollBy}
      />
      <CreditsPanel />
    </Fragment>
  );

  return (
    <>
      <section className={styles.section} ref={sectionRef}>
        <div className={styles.track} ref={trackRef}>
          {isMobile || !infiniteScroll
            ? panelSet(0)
            : Array.from({ length: REPETITIONS }, (_, i) => panelSet(i))}
        </div>
      </section>
      {!isLoading && (
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
      )}
    </>
  );
}
