"use client";

import { forwardRef } from "react";
import { useLanguage } from "@/providers/LanguageProvider";
import { useSiteConfig } from "@/providers/SiteConfigProvider";
import StaggerText from "@/components/effects/StaggerText";
import styles from "./MarqueeSection.module.css";

const MarqueeSection = forwardRef<HTMLElement>((_, ref) => {
  const { language } = useLanguage();
  const cfg = useSiteConfig();
  const words = language === "ko" ? cfg.marquee.words_ko : cfg.marquee.words;

  return (
    <section className={styles.marquee} ref={ref}>
      <div className={`${styles.track} marquee-track`}>
        {[...Array(4)].map((_, idx) => (
          <span key={idx} className={styles.text}>
            <StaggerText strokeColor="var(--text-accent-alt)">
              {words[0]}
            </StaggerText>{" "}
            <span className={styles.oval} />{" "}
            <StaggerText strokeColor="var(--text-accent-alt)">
              {words[1]}
            </StaggerText>{" "}
            <span className={styles.line} />{" "}
            <StaggerText strokeColor="var(--text-accent-alt)">
              {words[2]}
            </StaggerText>{" "}
            <span className={styles.oval} />{" "}
            <StaggerText strokeColor="var(--text-accent-alt)">
              {words[3]}
            </StaggerText>{" "}
            <span className={styles.line} />{" "}
          </span>
        ))}
      </div>
    </section>
  );
});

MarqueeSection.displayName = "MarqueeSection";

export default MarqueeSection;
