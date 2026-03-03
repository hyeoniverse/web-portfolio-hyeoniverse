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
    const resumeUrl = cfg.cta.resumeUrl;
    const resumeText = ko ? cfg.cta.resumeButtonText_ko : cfg.cta.resumeButtonText;

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

          <div className={styles.buttonGroup}>
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

            {resumeUrl && (
              <Button
                variant="outline"
                size="xl"
                className={styles.resumeBtn}
                href={resumeUrl}
                external
                download
                soundDisabled
                icon={
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                }
                iconPosition="right"
              >
                {resumeText}
              </Button>
            )}
          </div>
        </div>

      </Section>
    );
  },
);

CTASection.displayName = "CTASection";

export default CTASection;
