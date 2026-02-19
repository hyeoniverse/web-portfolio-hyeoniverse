"use client";

import { forwardRef } from "react";
import { useLanguage } from "@/providers/LanguageProvider";
import styles from "./ProfileSection.module.css";

interface HighlightedTextProps {
  textKey: string;
  t: (key: string) => string;
  highlightClass?: string;
}

function HighlightedText({
  textKey,
  t,
  highlightClass = styles.highlight,
}: HighlightedTextProps) {
  return (
    <>
      {t(`${textKey}.before`)}
      <span className={highlightClass}>{t(`${textKey}.highlight1`)}</span>
      {t(`${textKey}.middle`)}
      <span className={highlightClass}>{t(`${textKey}.highlight2`)}</span>
      {t(`${textKey}.after`)}
    </>
  );
}

const ProfileSection = forwardRef<HTMLElement>((_, ref) => {
  const { tLang } = useLanguage();

  // 본문은 항상 영어, 캡션은 한국어
  const tEn = (key: string) => tLang(key, "en");
  const tKo = (key: string) => tLang(key, "ko");

  return (
    <section className={styles.about} ref={ref}>
      <div className={`${styles.decorLine} profile-line`} />
      <div className={styles.content}>
        <div className={`${styles.textBlock} profile-text`}>
          <p className={styles.text}>
            <HighlightedText
              textKey="about.intro"
              t={tEn}
              highlightClass={styles.bold}
            />
          </p>
          <p className={styles.caption}>
            <HighlightedText textKey="about.intro" t={tKo} />
          </p>
        </div>
        <div className={`${styles.textBlock} profile-text`}>
          <p className={styles.text}>
            <HighlightedText
              textKey="about.description"
              t={tEn}
              highlightClass={styles.bold}
            />
          </p>
          <p className={styles.caption}>
            <HighlightedText textKey="about.description" t={tKo} />
          </p>
        </div>
      </div>
      <div className={`${styles.decorLine} profile-line`} />
    </section>
  );
});

ProfileSection.displayName = "ProfileSection";

export default ProfileSection;
