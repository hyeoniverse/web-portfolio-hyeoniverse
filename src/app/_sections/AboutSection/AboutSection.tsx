"use client";

import { forwardRef } from "react";
import styles from "./AboutSection.module.css";

const AboutSection = forwardRef<HTMLElement>((_, ref) => {
  return (
    <section className={styles.about} ref={ref}>
      <div className={`${styles.decorLine} about-line`} />
      <div className={styles.content}>
        <div className={`${styles.textBlock} about-text`}>
          <p className={styles.text}>
            I craft digital experiences where
            <span className={styles.highlight}> aesthetics </span>
            meet
            <span className={styles.highlight}> functionality</span>.
          </p>
          <p className={styles.caption}>
            미학과 기능이 만나는 디지털 경험을 만듭니다.
          </p>
        </div>
        <div className={`${styles.textBlock} about-text`}>
          <p className={styles.text}>
            Focused on creating memorable interactions through thoughtful
            design and clean code.
          </p>
          <p className={styles.caption}>
            세심한 디자인과 깔끔한 코드로 기억에 남는 인터랙션을 만드는 데 집중합니다.
          </p>
        </div>
      </div>
      <div className={`${styles.decorLine} about-line`} />
    </section>
  );
});

AboutSection.displayName = "AboutSection";

export default AboutSection;
