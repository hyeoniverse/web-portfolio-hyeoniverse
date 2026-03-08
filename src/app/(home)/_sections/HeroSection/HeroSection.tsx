"use client";

import { forwardRef } from "react";
import { motion, MotionValue } from "framer-motion";
import StaggerText from "@/components/effects/StaggerText";
import Section from "@/components/ui/Section";
import T from "@/components/ui/T";
import { useLanguage } from "@/providers/LanguageProvider";
import { useSiteConfig } from "@/providers/SiteConfigProvider";
import styles from "./HeroSection.module.css";

interface HeroSectionProps {
  floatX: MotionValue<number>;
  floatY: MotionValue<number>;
  oval2X: MotionValue<number>;
  oval2Y: MotionValue<number>;
  onScrollDown?: () => void;
}

const HeroSection = forwardRef<HTMLElement, HeroSectionProps>(
  ({ floatX, floatY, oval2X, oval2Y, onScrollDown }, ref) => {
    const { language } = useLanguage();
    const cfg = useSiteConfig();
    const headline = language === "ko" ? cfg.hero.headline_ko : cfg.hero.headline;

    return (
      <Section fullHeight clipOverflow className={styles.hero} ref={ref}>
        {/* Floating Ovals */}
        <motion.div
          className={`${styles.floatingOval} ${styles.ovalPrimary} parallax-oval-1`}
          style={{ x: floatX, y: floatY }}
        />
        <motion.div
          className={`${styles.floatingOval} ${styles.ovalSecondary} parallax-oval-2`}
          style={{ x: oval2X, y: oval2Y }}
        />

        {/* Decorative Lines */}
        <div
          className={`${styles.decorLine} ${styles.decorLineTop} hero-line-decoration`}
          aria-hidden="true"
        />
        <div
          className={`${styles.decorLine} ${styles.decorLineBottom} hero-line-decoration`}
          aria-hidden="true"
        />

        {/* Hero Content */}
        <div className={`${styles.content} hero-content`}>
          <h1 className={styles.title}>
            <span className={`${styles.titleRow} hero-line`}>
              <StaggerText
                className={styles.titleText}
                strokeColor="var(--text-primary)"
              >
                {headline[0]}
              </StaggerText>
            </span>
            <span className={`${styles.titleRow} hero-line`}>
              <StaggerText
                className={styles.titleText}
                strokeColor="var(--text-primary)"
              >
                {headline[1]}
              </StaggerText>
              <span className={styles.titleOvalWrapper}>
                <span className={styles.titleOvalInline} />
              </span>
            </span>
            <span className={`${styles.titleRow} hero-line`}>
              <span className={styles.titleAccent}>&</span>
              <StaggerText
                className={styles.titleText}
                strokeColor="var(--text-primary)"
              >
                {headline[2]}
              </StaggerText>
            </span>
          </h1>

          <div className={styles.meta}>
            <span className="hero-line">
              <T ko={cfg.hero.subtext_ko[0]} en={cfg.hero.subtext[0]} />
            </span>
            <span className={styles.metaDivider} />
            <span className={`${styles.availabilityWrapper} hero-line`}>
              <T ko={cfg.hero.subtext_ko[1]} en={cfg.hero.subtext[1]} />
              <span className={styles.pulseDot} />
              <div className="pulse" />
            </span>
          </div>
        </div>

        {/* Scroll Indicator */}
        <motion.button
          className={styles.scrollIndicator}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          onClick={onScrollDown}
          aria-label="Scroll down"
        >
          <div className={styles.scrollLineWrapper}>
            <motion.div
              className={styles.scrollLine}
              animate={{ scaleY: [0, 1, 0], y: [0, 0, 20] }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          </div>
          <span className={styles.scrollText}>
            <T ko={cfg.hero.scrollLabel_ko} en={cfg.hero.scrollLabel} />
          </span>
        </motion.button>
      </Section>
    );
  },
);

HeroSection.displayName = "HeroSection";

export default HeroSection;
