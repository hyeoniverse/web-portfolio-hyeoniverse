"use client";

import { useLanguage } from "@/providers/LanguageProvider";
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
import { useHorizontalScroll } from "../_hooks/useHorizontalScroll";
import { useNavIndicator } from "../_hooks/useNavIndicator";
import {
  HeroPanel,
  OverviewPanel,
  ArchitecturePanel,
  FeaturesPanel,
  ProcessPanel,
  VisualBreakPanel,
  TechStackPanel,
  CodeHighlightsPanel,
  TroubleshootingPanel,
  CreditsPanel,
} from "./panels";
import SectionNav from "./SectionNav";
import styles from "./WebFlowSection.module.css";

export default function WebFlowSection() {
  const { t, language } = useLanguage();
  const { sectionRef, trackRef, activeSection, goToSection } =
    useHorizontalScroll(styles);
  const {
    navRef,
    navItemRefs,
    setHoveredSection,
    highlightedSection,
    springX,
    springWidth,
    navSections,
  } = useNavIndicator(activeSection);

  return (
    <>
      <section className={styles.section} ref={sectionRef}>
        <div className={styles.track} ref={trackRef}>
          <HeroPanel t={t} />
          <OverviewPanel language={language} overview={projectOverview} />
          <ArchitecturePanel language={language} structure={projectStructure} />
          <FeaturesPanel language={language} features={designFeatures} />
          <ProcessPanel language={language} process={designProcess} />
          <VisualBreakPanel />
          <TechStackPanel techStack={techStack} />
          <CodeHighlightsPanel language={language} codeExamples={codeExamples} />
          <TroubleshootingPanel
            language={language}
            t={t}
            items={troubleShootingItems}
          />
          <CreditsPanel t={t} nickname={siteConfig.personal.nickname} />
        </div>
      </section>
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
    </>
  );
}
