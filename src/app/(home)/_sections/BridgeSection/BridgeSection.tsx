"use client";

import { useEffect, useRef } from "react";
import { motion, MotionValue } from "framer-motion";
import Section from "@/components/ui/Section";
import T from "@/components/ui/T";
import { useLanguage } from "@/providers/LanguageProvider";
import { useLenis } from "@/providers/LenisProvider";
import { useSiteConfig } from "@/providers/SiteConfigProvider";
import styles from "./BridgeSection.module.css";
import heroStyles from "../HeroSection/HeroSection.module.css";

const OVAL_COUNT = 5;

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
  const { lenis } = useLenis();
  const cfg = useSiteConfig();
  const headline = language === "ko" ? cfg.hero.headline_ko : cfg.hero.headline;

  const groupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = groupRef.current;
    if (!el || !lenis) return;

    const update = () => {
      const scroll = lenis.scroll;
      const total = lenis.limit;
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
    <Section fullHeight className={styles.bridge}>
      {/* Floating Ovals - identical to Hero */}
      <motion.div
        ref={groupRef}
        className={heroStyles.ovalPrimaryGroup}
        style={{ x: floatX, y: floatY }}
      >
        {Array.from({ length: OVAL_COUNT }, (_, i) => {
          const center = (OVAL_COUNT - 1) / 2;
          const offset = i - center;
          return (
            <div
              key={i}
              className={`${heroStyles.floatingOval} ${heroStyles.ovalPrimary}`}
              style={{ "--offset": offset } as React.CSSProperties}
            />
          );
        })}
      </motion.div>
      <motion.div
        className={`${heroStyles.floatingOval} ${heroStyles.ovalSecondary}`}
        style={{ x: oval2X, y: oval2Y }}
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
            {/* Hero 와 동일 구조 유지 — 이 pulse div 가 flex gap 을 하나 더 먹어
                availabilityWrapper 폭이 12px 커진다. 없으면 래핑 시 "Open to Opportunities"
                가 가로로 6px 어긋나 움찔거린다. */}
            <div className="pulse" />
          </span>
        </div>
      </div>

      {/* Scroll Indicator - identical to Hero */}
      <div className={heroStyles.scrollIndicator}>
        <div className={heroStyles.scrollLineWrapper}>
          <motion.div
            className={heroStyles.scrollLine}
            animate={{ y: ["-100%", "350%"] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
        <span className={heroStyles.scrollText}>
          <T ko={cfg.hero.scrollLabel_ko} en={cfg.hero.scrollLabel} />
        </span>
      </div>
    </Section>
  );
}
