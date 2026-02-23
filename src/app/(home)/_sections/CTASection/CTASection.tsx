"use client";

import { forwardRef } from "react";
import { motion, MotionValue } from "framer-motion";
import { useSiteConfig } from "@/providers/SiteConfigProvider";
import Button from "@/components/ui/Button";
import Section from "@/components/ui/Section";
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
    const cfg = useSiteConfig();
    const { language } = useLanguage();
    const ko = language === "ko";
    const ctaLabel = ko ? cfg.cta.label_ko : cfg.cta.label;
    const ctaTitle = ko ? cfg.cta.title_ko : cfg.cta.title;
    const ctaButton = ko ? cfg.cta.buttonText_ko : cfg.cta.buttonText;
    const copyright = ko ? cfg.footer.copyright_ko : cfg.footer.copyright;

    return (
      <Section fullHeight center clipOverflow className={styles.cta} ref={ref}>
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
          <p className={`${styles.label} reveal-text`}>{ctaLabel}</p>
          <h2 className={styles.title}>
            <span className={`${styles.titleLine} reveal-text`}>
              {ctaTitle[0]}
            </span>
            <span className={`${styles.titleLine} reveal-text`}>
              {ctaTitle[1]}
            </span>
          </h2>

          <motion.div
            ref={magnetic.ref}
            className={styles.buttonWrapper}
            style={{ x: magnetic.x, y: magnetic.y }}
            onMouseMove={magnetic.handleMouseMove}
            onMouseLeave={magnetic.handleMouseLeave}
          >
            <Button
              variant="outline"
              size="xl"
              className={styles.ctaBtn}
              onClick={onContactClick}
              soundDisabled
              icon={
                <motion.span
                  className={styles.buttonIndicator}
                  whileHover={{ scale: 1.5 }}
                />
              }
              iconPosition="right"
            >
              {ctaButton}
            </Button>
          </motion.div>
        </div>

        <div className={styles.footer}>
          <a href={`mailto:${cfg.contact.email}?subject=Hello!`}>
            {cfg.contact.email}
          </a>
          <span>{copyright}</span>
        </div>
      </Section>
    );
  },
);

CTASection.displayName = "CTASection";

export default CTASection;
