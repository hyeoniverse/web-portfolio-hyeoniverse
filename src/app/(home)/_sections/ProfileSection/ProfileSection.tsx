"use client";

import { forwardRef } from "react";
import Section from "@/components/ui/Section";
import { useSiteConfig } from "@/providers/SiteConfigProvider";
import styles from "./ProfileSection.module.css";

/** {중괄호} 안의 텍스트를 하이라이트 span으로 변환 */
function HighlightedText({
  text,
  highlightClass = styles.highlight,
}: {
  text: string;
  highlightClass?: string;
}) {
  const parts = text.split(/(\{[^}]+\})/);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith("{") && part.endsWith("}") ? (
          <span key={i} className={highlightClass}>
            {part.slice(1, -1)}
          </span>
        ) : (
          part
        ),
      )}
    </>
  );
}

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
