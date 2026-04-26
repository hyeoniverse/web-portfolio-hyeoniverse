"use client";

import { forwardRef } from "react";
import Section from "@/components/ui/Section";
import { useSiteConfig } from "@/providers/SiteConfigProvider";
import HighlightedText from "./HighlightedText";
import styles from "./IntroSection.module.css";

const IntroSection = forwardRef<HTMLElement>((_, ref) => {
  const cfg = useSiteConfig();

  return (
    <Section className={styles.intro} ref={ref}>
      <div className={`${styles.decorLine} intro-line`} />
      <div className={styles.content}>
        <div className={`${styles.textBlock} intro-text`}>
          <p className={styles.text}>
            <HighlightedText
              text={cfg.homeIntro.tagline}
              highlightClass={styles.bold}
            />
          </p>
          <p className={styles.caption}>
            <HighlightedText text={cfg.homeIntro.tagline_ko} />
          </p>
        </div>
        <div className={`${styles.textBlock} intro-text`}>
          <p className={styles.text}>
            <HighlightedText
              text={cfg.homeIntro.description}
              highlightClass={styles.bold}
            />
          </p>
          <p className={styles.caption}>
            <HighlightedText text={cfg.homeIntro.description_ko} />
          </p>
        </div>
      </div>
      <div className={`${styles.decorLine} intro-line`} />
    </Section>
  );
});

IntroSection.displayName = "IntroSection";

export default IntroSection;
