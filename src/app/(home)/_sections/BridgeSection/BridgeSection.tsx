"use client";

import { motion, MotionValue } from "framer-motion";
import Section from "@/components/ui/Section";
import { useLanguage } from "@/providers/LanguageProvider";
import styles from "./BridgeSection.module.css";
import heroStyles from "../HeroSection/HeroSection.module.css";

interface BridgeSectionProps {
  floatX: MotionValue<number>;
  floatY: MotionValue<number>;
  oval2X: MotionValue<number>;
  oval2Y: MotionValue<number>;
}

export default function BridgeSection({
  floatX,
  floatY,
  oval2X,
  oval2Y,
}: BridgeSectionProps) {
  const { t } = useLanguage();
  return (
    <Section fullHeight clipOverflow className={styles.bridge}>
      {/* Floating Ovals - identical to Hero */}
      <motion.div
        className={`${heroStyles.floatingOval} ${heroStyles.ovalPrimary}`}
        style={{ x: floatX, y: floatY }}
      />
      <motion.div
        className={`${heroStyles.floatingOval} ${heroStyles.ovalSecondary}`}
        style={{ x: oval2X, y: oval2Y }}
      />

      {/* Decorative Lines - identical to Hero */}
      <div className={`${heroStyles.decorLine} ${heroStyles.decorLineTop}`} />
      <div
        className={`${heroStyles.decorLine} ${heroStyles.decorLineBottom}`}
      />

      {/* Content - identical to Hero */}
      <div className={styles.content}>
        <h2 className={heroStyles.title}>
          <span className={heroStyles.titleRow}>
            <span className={heroStyles.titleText}>Creative</span>
          </span>
          <span className={heroStyles.titleRow}>
            <span className={heroStyles.titleText}>Developer</span>
            <span className={heroStyles.titleOvalWrapper}>
              <motion.span
                className={heroStyles.titleOvalInline}
                animate={{ rotate: 360 }}
                transition={{
                  duration: 20,
                  repeat: Infinity,
                  ease: "linear",
                }}
              />
            </span>
          </span>
          <span className={heroStyles.titleRow}>
            <span className={heroStyles.titleAccent}>&</span>
            <span className={heroStyles.titleText}>Problem Solver</span>
          </span>
        </h2>

        <div className={heroStyles.meta}>
          <span>
            {t("hero.locationBefore")}
            <span className={heroStyles.metaHighlight}>
              {t("hero.locationHighlight")}
            </span>
            {t("hero.locationAfter")}
          </span>
          <span className={heroStyles.metaDivider} />
          <span className={heroStyles.availabilityWrapper}>
            {t("hero.availability")}
            <span className={heroStyles.pulseDot} />
          </span>
        </div>
      </div>

      {/* Scroll Indicator - identical to Hero */}
      <div className={heroStyles.scrollIndicator}>
        <div className={heroStyles.scrollLineWrapper}>
          <motion.div
            className={heroStyles.scrollLine}
            animate={{ scaleY: [0, 1, 0], y: [0, 0, 20] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
        <span className={heroStyles.scrollText}>{t("hero.scroll")}</span>
      </div>
    </Section>
  );
}
