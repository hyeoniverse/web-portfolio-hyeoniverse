"use client";

import { forwardRef } from "react";
import Section from "@/components/ui/Section";
import { useSiteConfig } from "@/providers/SiteConfigProvider";
import HighlightedText from "./HighlightedText";
import styles from "./ProfileSection.module.css";

const ProfileSection = forwardRef<HTMLElement>((_, ref) => {
  const cfg = useSiteConfig();

  return (
    <Section className={styles.about} ref={ref}>
      <div className={`${styles.decorLine} profile-line`} />
      <div className={styles.content}>
        <div className={`${styles.textBlock} profile-text`}>
          <p className={styles.text}>
            <HighlightedText
              text={cfg.homeAbout.intro}
              highlightClass={styles.bold}
            />
          </p>
          <p className={styles.caption}>
            <HighlightedText text={cfg.homeAbout.intro_ko} />
          </p>
        </div>
        <div className={`${styles.textBlock} profile-text`}>
          <p className={styles.text}>
            <HighlightedText
              text={cfg.homeAbout.description}
              highlightClass={styles.bold}
            />
          </p>
          <p className={styles.caption}>
            <HighlightedText text={cfg.homeAbout.description_ko} />
          </p>
        </div>
      </div>
      <div className={`${styles.decorLine} profile-line`} />
    </Section>
  );
});

ProfileSection.displayName = "ProfileSection";

export default ProfileSection;
