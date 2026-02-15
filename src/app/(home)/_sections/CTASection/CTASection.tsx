"use client";

import { forwardRef } from "react";
import { motion, MotionValue } from "framer-motion";
import { siteConfig } from "@/config/site.config";
import { useLanguage } from "@/providers/LanguageProvider";
import type { UseMagneticReturn } from "@/hooks/useMagnetic";
import styles from "./CTASection.module.css";

interface CTASectionProps {
  floatX: MotionValue<number>;
  floatY: MotionValue<number>;
  ctaOvalX: MotionValue<number>;
  ctaOvalY: MotionValue<number>;
  magnetic: UseMagneticReturn;
  onContactClick: () => void;
}

const CTASection = forwardRef<HTMLElement, CTASectionProps>(
  ({ floatX, floatY, ctaOvalX, ctaOvalY, magnetic, onContactClick }, ref) => {
    const { t } = useLanguage();

    return (
      <section className={styles.cta} ref={ref}>
        {/* 장식 라인 */}
        <div className={`${styles.decorLine} ${styles.decorLineTop}`} />
        <div className={`${styles.decorLine} ${styles.decorLineBottom}`} />

        {/* 떠다니는 오벌 */}
        <motion.div
          className={`${styles.ovalPrimary} cta-oval`}
          style={{ x: ctaOvalX, y: ctaOvalY }}
        />
        <motion.div
          className={styles.ovalSecondary}
          style={{ x: floatX, y: floatY }}
        />

        <div className={styles.content}>
          <p className={`${styles.label} reveal-text`}>{t("cta.label")}</p>
          <h2 className={styles.title}>
            <span className={`${styles.titleLine} reveal-text`}>
              {t("cta.title1")}
            </span>
            <span className={`${styles.titleLine} reveal-text`}>
              {t("cta.title2")}
            </span>
          </h2>

          <motion.div
            ref={magnetic.ref}
            className={styles.buttonWrapper}
            style={{ x: magnetic.x, y: magnetic.y }}
            onMouseMove={magnetic.handleMouseMove}
            onMouseLeave={magnetic.handleMouseLeave}
          >
            <button className={styles.button} onClick={onContactClick}>
              <span>{t("cta.button")}</span>
              <motion.span
                className={styles.buttonIndicator}
                whileHover={{ scale: 1.5 }}
              />
            </button>
          </motion.div>
        </div>

        <div className={styles.footer}>
          <a href={`mailto:${siteConfig.contact.email}?subject=Hello!`}>
            {siteConfig.contact.email}
          </a>
          <span>
            HYEON © {new Date().getFullYear()}, {t("footer.copyright")}
          </span>
        </div>
      </section>
    );
  },
);

CTASection.displayName = "CTASection";

export default CTASection;
