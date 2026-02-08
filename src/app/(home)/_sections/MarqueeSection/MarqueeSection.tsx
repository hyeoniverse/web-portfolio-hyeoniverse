"use client";

import { forwardRef } from "react";
import { useLanguage } from "@/providers/LanguageProvider";
import StaggerText from "@/components/effects/StaggerText";
import styles from "./MarqueeSection.module.css";

const MarqueeSection = forwardRef<HTMLElement>((_, ref) => {
  const { t } = useLanguage();
  return (
    <section className={styles.marquee} ref={ref}>
      <div className={`${styles.track} marquee-track`}>
        {[...Array(4)].map((_, idx) => (
          <span key={idx} className={styles.text}>
            <StaggerText strokeColor="var(--text-accent-secondary-alt)">
              {t("marquee.creative")}
            </StaggerText>{" "}
            <span className={styles.oval} />{" "}
            <StaggerText strokeColor="var(--text-accent-secondary-alt)">
              {t("marquee.frontend")}
            </StaggerText>{" "}
            <span className={styles.line} />{" "}
            <StaggerText strokeColor="var(--text-accent-secondary-alt)">
              {t("marquee.developer")}
            </StaggerText>{" "}
            <span className={styles.oval} />{" "}
            <StaggerText strokeColor="var(--text-accent-secondary-alt)">
              {t("marquee.innovator")}
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
