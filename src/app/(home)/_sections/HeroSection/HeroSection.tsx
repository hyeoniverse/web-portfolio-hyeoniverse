"use client";

import { forwardRef, useEffect, useRef } from "react";
import { motion, MotionValue } from "framer-motion";

const OVAL_COUNT = 5;
import StaggerText from "@/components/effects/StaggerText";
import Section from "@/components/ui/Section";
import T from "@/components/ui/T";
import Tooltip from "@/components/ui/Tooltip";
import { useLanguage } from "@/providers/LanguageProvider";
import { useLenis } from "@/providers/LenisProvider";
import { useSiteConfig } from "@/providers/SiteConfigProvider";
import styles from "./HeroSection.module.css";
import Pressable from "@/components/ui/Pressable";

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
    const { lenis } = useLenis();
    const cfg = useSiteConfig();
    const headline = language === "ko" ? cfg.hero.headline_ko : cfg.hero.headline;
    const headlineAlt = language === "ko" ? cfg.hero.headline : cfg.hero.headline_ko;

    const groupRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      const el = groupRef.current;
      if (!el || !lenis) return;

      const update = () => {
        const scroll = lenis.scroll;
        const total = lenis.limit;
        // 원형 거리: scroll=0(Hero)과 scroll≈limit(Bridge) 모두 spread=0
        const distance = total > 0 ? Math.min(scroll, total - scroll) : 0;
        const vh = window.innerHeight;
        const spread = Math.min(distance / vh, 1);
        el.style.setProperty("--spread", String(spread));
      };

      lenis.on("scroll", update);
      update();
      return () => {
        lenis.off("scroll", update);
      };
    }, [lenis]);

    return (
      <Section fullHeight className={styles.hero} ref={ref}>
        {/* Primary Oval — 스크롤에 따라 등간격 위아래 펼침 */}
        <motion.div
          ref={groupRef}
          className={styles.ovalPrimaryGroup}
          style={{ x: floatX, y: floatY } as unknown as React.CSSProperties}
        >
          {Array.from({ length: OVAL_COUNT }, (_, i) => {
            const center = (OVAL_COUNT - 1) / 2;
            const offset = i - center;
            return (
              <div
                key={i}
                className={`${styles.floatingOval} ${styles.ovalPrimary}`}
                style={{ "--offset": offset } as React.CSSProperties}
              />
            );
          })}
        </motion.div>
        <motion.div
          className={`${styles.floatingOval} ${styles.ovalSecondary} parallax-oval-2`}
          style={{ x: oval2X, y: oval2Y }}
        />

        {/* Hero Content */}
        <div className={`${styles.content} hero-content`}>
          <Tooltip content={headlineAlt.join(" & ")} delay={600} placement="bottom">
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
          </Tooltip>

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
        <Pressable
          className={styles.scrollIndicator}
          onClick={onScrollDown}
          aria-label="Scroll down"
        >
          <div className={styles.scrollLineWrapper}>
            <motion.div
              className={styles.scrollLine}
              animate={{ y: ["-100%", "350%"] }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          </div>
          <span className={styles.scrollText}>
            <T ko={cfg.hero.scrollLabel_ko} en={cfg.hero.scrollLabel} />
          </span>
        </Pressable>
      </Section>
    );
  },
);

HeroSection.displayName = "HeroSection";

export default HeroSection;
