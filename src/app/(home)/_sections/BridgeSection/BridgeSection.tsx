"use client";

import { motion, MotionValue } from "framer-motion";
import Section from "@/components/ui/Section";
import T from "@/components/ui/T";
import { useLanguage } from "@/providers/LanguageProvider";
import { useSiteConfig } from "@/providers/SiteConfigProvider";
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
  const { language } = useLanguage();
  const cfg = useSiteConfig();
  const headline = language === "ko" ? cfg.hero.headline_ko : cfg.hero.headline;

  return (
    <Section fullHeight clipOverflow className={styles.bridge}>
      {/* Floating Ovals - identical to Hero (정적) */}
      <motion.div
        className={heroStyles.ovalPrimaryGroup}
        style={{ x: floatX, y: floatY }}
      >
        <div className={`${heroStyles.floatingOval} ${heroStyles.ovalPrimary}`} />
      </motion.div>
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
            <span className={heroStyles.titleText}>{headline[0]}</span>
          </span>
          <span className={heroStyles.titleRow}>
            <span className={heroStyles.titleText}>{headline[1]}</span>
          </span>
          <span className={heroStyles.titleRow}>
            <span className={heroStyles.titleAccent}>&</span>
            <span className={heroStyles.titleText}>{headline[2]}</span>
          </span>
        </h2>

        <div className={heroStyles.meta}>
          <span>
            <T ko={cfg.hero.subtext_ko[0]} en={cfg.hero.subtext[0]} />
          </span>
          <span className={heroStyles.metaDivider} />
          <span className={heroStyles.availabilityWrapper}>
            <T ko={cfg.hero.subtext_ko[1]} en={cfg.hero.subtext[1]} />
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
        <span className={heroStyles.scrollText}>
          <T ko={cfg.hero.scrollLabel_ko} en={cfg.hero.scrollLabel} />
        </span>
      </div>
    </Section>
  );
}
