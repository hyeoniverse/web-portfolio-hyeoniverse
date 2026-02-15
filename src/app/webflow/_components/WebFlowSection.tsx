"use client";

import { Fragment } from "react";
import { useLanguage } from "@/providers/LanguageProvider";
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
import { checkMobileLayout } from "../_hooks/mobileCheck";
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

  const isMobile = checkMobileLayout();

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
