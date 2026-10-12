"use client";

import { forwardRef } from "react";
import Section from "@/components/ui/Section";
import { useSiteConfig } from "@/providers/SiteConfigProvider";
import { useLanguage } from "@/providers/LanguageProvider";
import HighlightedText from "./HighlightedText";
import styles from "./IntroSection.module.css";

const IntroSection = forwardRef<HTMLElement>((_, ref) => {
  const cfg = useSiteConfig();
  /* 영어 본문 + 한국어 작은 글을 늘 함께 보인다. 다른 언어로 볼 때는 본문을 그 언어로(사이트 내용 글 번역), 작은 글은 영어 원문 */
  const { foreignLang, tx } = useLanguage();
  const tagline = tx(cfg.homeIntro.tagline);
  const description = tx(cfg.homeIntro.description);
  const taglineCaption = foreignLang ? cfg.homeIntro.tagline : cfg.homeIntro.tagline_ko;
  const descriptionCaption = foreignLang ? cfg.homeIntro.description : cfg.homeIntro.description_ko;

  return (
    <Section className={styles.intro} ref={ref}>
      <div className={`${styles.decorLine} intro-line`} />
      <div className={styles.content}>
        <div className={`${styles.textBlock} intro-text`}>
          <p className={styles.text}>
            <HighlightedText
              text={tagline}
              highlightClass={styles.bold}
            />
          </p>
          <p className={styles.caption}>
            <HighlightedText text={taglineCaption} />
          </p>
        </div>
        <div className={`${styles.textBlock} intro-text`}>
          <p className={styles.text}>
            <HighlightedText
              text={description}
              highlightClass={styles.bold}
            />
          </p>
          <p className={styles.caption}>
            <HighlightedText text={descriptionCaption} />
          </p>
        </div>
      </div>
      <div className={`${styles.decorLine} intro-line`} />
    </Section>
  );
});

IntroSection.displayName = "IntroSection";

export default IntroSection;
