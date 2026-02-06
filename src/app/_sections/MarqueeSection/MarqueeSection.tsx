"use client";

import { forwardRef } from "react";
import StaggerText from "@/components/effects/StaggerText";
import styles from "./MarqueeSection.module.css";

const MarqueeSection = forwardRef<HTMLElement>((_, ref) => {
  return (
    <section className={styles.marquee} ref={ref}>
      <div className={`${styles.track} marquee-track`}>
        {[...Array(4)].map((_, idx) => (
          <span key={idx} className={styles.text}>
            <StaggerText strokeColor="var(--text-accent-secondary-alt)">
              CREATIVE
            </StaggerText>{" "}
            <span className={styles.oval} />{" "}
            <StaggerText strokeColor="var(--text-accent-secondary-alt)">
              FRONTEND
            </StaggerText>{" "}
            <span className={styles.line} />{" "}
            <StaggerText strokeColor="var(--text-accent-secondary-alt)">
              DEVELOPER
            </StaggerText>{" "}
            <span className={styles.oval} />{" "}
            <StaggerText strokeColor="var(--text-accent-secondary-alt)">
              INNOVATOR
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
